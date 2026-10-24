"""Métricas de Garmin para recoger_datos.py (la tarea diaria del coach).

Dos capas separadas a propósito:
- Funciones `normalize_*`: puras (dict -> dict), sin red. Se pueden probar con JSON de ejemplo.
- Funciones `fetch_*`: llaman a Garmin y pasan el resultado a su normalizador.

Garmin no documenta estos endpoints (es la API de la app móvil), así que los
nombres de campo se leen con `_first(...)` probando varias variantes.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from garmin_client import get_client

SWIM_TYPES = {"lap_swimming", "open_water_swimming", "swimming"}

# Fallos de las secciones opcionales (_safe): recoger_datos.py los pasa a crudos["errores"].
ERRORES: list[str] = []


def _hoy() -> date:
    """Hoy en Madrid (el runner de GitHub está en UTC)."""
    return datetime.now(ZoneInfo("Europe/Madrid")).date()


# ─────────────────────────────────────────
# Utilidades
# ─────────────────────────────────────────

def _first(d: Any, *keys: str, default: Any = None) -> Any:
    """Primer valor no nulo entre varias claves posibles."""
    if not isinstance(d, dict):
        return default
    for k in keys:
        v = d.get(k)
        if v is not None:
            return v
    return default


def _fmt_secs(secs: float | None) -> str | None:
    if not secs:
        return None
    secs = int(round(secs))
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def _pace(secs: float | None, meters: float | None, per: int) -> str | None:
    """Ritmo como m:ss por `per` metros (100 para natación, 1000 para carrera)."""
    if not secs or not meters:
        return None
    return _fmt_secs(secs / meters * per)


def _r(v: Any, nd: int = 1) -> Any:
    return round(v, nd) if isinstance(v, (int, float)) else v


def _one_device(mapping: Any) -> dict:
    """Garmin agrupa algunas métricas por deviceId; nos quedamos con el primero con datos."""
    if not isinstance(mapping, dict):
        return {}
    for v in mapping.values():
        if isinstance(v, dict) and v:
            return v
    return {}


def _call(fn):
    """Ejecuta una llamada a Garmin con el cliente de la sesión (garth renueva el token solo)."""
    return fn(get_client())


def _safe(fn, default=None, que: str = "sección opcional"):
    """Para secciones opcionales: si falla, anota el error en ERRORES y devuelve `default`."""
    try:
        return fn()
    except Exception as e:  # noqa: BLE001 - queremos respuesta parcial
        ERRORES.append(f"{que}: {e}")
        return default


# ─────────────────────────────────────────
# Actividades: resumen enriquecido
# ─────────────────────────────────────────

def normalize_activity_summary(a: dict) -> dict:
    tipo = _first(a.get("activityType"), "typeKey", default="unknown")
    dist = a.get("distance") or 0
    dur = a.get("duration") or 0
    moving = _first(a, "movingDuration", "elapsedDuration", default=dur) or dur
    out = {
        "activity_id": a.get("activityId"),
        "fecha": (a.get("startTimeLocal") or "")[:10],
        "hora": (a.get("startTimeLocal") or "")[11:16],
        "tipo": tipo,
        "nombre": a.get("activityName", ""),
        "duracion_minutos": round(dur / 60),
        "calorias": a.get("calories", 0),
        "frecuencia_cardiaca_media": a.get("averageHR", 0),
        "frecuencia_cardiaca_maxima": a.get("maxHR", 0),
        "distancia_km": round(dist / 1000, 2),
        "carga_entrenamiento": round(a.get("activityTrainingLoad") or 0, 1),
        "efecto_aerobico": round(a.get("aerobicTrainingEffect") or 0, 1),
        "efecto_anaerobico": round(a.get("anaerobicTrainingEffect") or 0, 1),
    }
    if tipo in SWIM_TYPES:
        out.update({
            "ritmo_100m": _pace(moving, dist, 100),
            # Garmin devuelve la piscina en centímetros (2500 = 25 m)
            "piscina_m": _r(a["poolLength"] / 100 if (a.get("poolLength") or 0) > 100 else a.get("poolLength"), 0),
            "largos": a.get("activeLengths"),
            "swolf_medio": _r(_first(a, "averageSwolf", "avgSwolf"), 0),
            "brazadas_totales": _first(a, "strokes", "totalNumberOfStrokes"),
            "brazadas_por_largo": _r(_first(a, "avgStrokes", "averageStrokes"), 1),
        })
    elif tipo in {"running", "trail_running", "treadmill_running", "track_running"}:
        out.update({
            "ritmo_km": _pace(moving, dist, 1000),
            "cadencia_media": _r(_first(a, "averageRunningCadenceInStepsPerMinute"), 0),
            "desnivel_m": _r(a.get("elevationGain"), 0),
        })
    elif "cycling" in tipo or "biking" in tipo:
        out.update({
            "velocidad_media_kmh": _r((a.get("averageSpeed") or 0) * 3.6, 1),
            "potencia_media": a.get("avgPower"),
            "potencia_normalizada": a.get("normPower"),
            "desnivel_m": _r(a.get("elevationGain"), 0),
        })
    return out


def fetch_activities(days: int = 7) -> list[dict]:
    days = min(days, 30)
    start = (_hoy() - timedelta(days=days)).isoformat()
    end = _hoy().isoformat()
    raw = _call(lambda c: c.get_activities_by_date(start, end)) or []
    return [normalize_activity_summary(a) for a in raw]


# ─────────────────────────────────────────
# Detalle de una actividad (natación / carrera / bici)
# ─────────────────────────────────────────

def normalize_swim_splits(splits: dict) -> dict:
    """Convierte lapDTOs de una sesión de piscina en series y descansos."""
    series, n = [], 0
    for lap in (splits or {}).get("lapDTOs", []) or []:
        d = lap.get("distance") or 0
        t = _first(lap, "movingDuration", "duration", default=0) or 0
        if d <= 0:
            if (lap.get("duration") or 0) >= 3:  # ignora "descansos" de 1-2 s al pulsar el botón
                series.append({"tipo": "descanso", "duracion": _fmt_secs(lap.get("duration"))})
            continue
        n += 1
        item = {
            "tipo": "serie",
            "n": n,
            "distancia_m": round(d),
            "tiempo": _fmt_secs(t),
            "ritmo_100m": _pace(t, d, 100),
            "estilo": _first(lap, "swimStroke", "swimStyle"),
            "largos": _first(lap, "numberOfActiveLengths", "activeLengths"),
            "swolf": _r(_first(lap, "averageSWOLF", "averageSwolf", "avgSwolf"), 0),
            "brazadas": _first(lap, "totalNumberOfStrokes", "strokes"),
            "brazadas_por_largo": _r(_first(lap, "averageStrokes", "avgStrokes"), 1),
            "fc_media": lap.get("averageHR"),
            "fc_max": lap.get("maxHR"),
        }
        series.append(item)
    return {"series": series, "num_series": n}


def normalize_laps(splits: dict, per: int = 1000) -> list[dict]:
    """Vueltas/parciales de carrera o bici (normalmente auto-lap de 1 km o 5 km)."""
    out = []
    for i, lap in enumerate((splits or {}).get("lapDTOs", []) or [], 1):
        d = lap.get("distance") or 0
        t = _first(lap, "movingDuration", "duration", default=0) or 0
        out.append({
            "n": i,
            "distancia_km": round(d / 1000, 2),
            "tiempo": _fmt_secs(t),
            "ritmo_km": _pace(t, d, per) if per == 1000 else None,
            "velocidad_kmh": _r((lap.get("averageSpeed") or 0) * 3.6, 1),
            "fc_media": lap.get("averageHR"),
            "cadencia": _r(_first(lap, "averageRunCadence", "averageBikeCadence"), 0),
            "potencia": _first(lap, "averagePower"),
            "desnivel_m": _r(lap.get("elevationGain"), 0),
        })
    return out


def normalize_hr_zones(zones: Any) -> list[dict]:
    out = []
    for z in zones or []:
        out.append({
            "zona": z.get("zoneNumber"),
            "desde_lpm": z.get("zoneLowBoundary"),
            "minutos": round((z.get("secsInZone") or 0) / 60, 1),
        })
    return out


def fetch_activity_detail(activity_id: str) -> dict:
    """Resumen, zonas de FC, series o parciales, y el RPE y la sensación que anotó el usuario."""
    summary_raw = _call(lambda c: c.get_activity(str(activity_id)))
    summary = summary_raw.get("summaryDTO", {}) if isinstance(summary_raw, dict) else {}
    base = {
        "activity_id": int(activity_id),
        "nombre": summary_raw.get("activityName") if isinstance(summary_raw, dict) else None,
        "tipo": _first((summary_raw or {}).get("activityTypeDTO"), "typeKey"),
        "fecha": (summary.get("startTimeLocal") or "")[:10],
    }

    t = base.get("tipo") or ""
    splits = _safe(lambda: _call(lambda c: c.get_activity_splits(str(activity_id))), default={})
    zonas = _safe(lambda: normalize_hr_zones(_call(lambda c: c.get_activity_hr_in_timezones(str(activity_id)))), default=[])

    detalle = {
        "resumen": base,
        "zonas_fc": zonas,
        "rpe": summary.get("directWorkoutRpe"),
        "sensacion": summary.get("directWorkoutFeel"),
    }
    if t in SWIM_TYPES:
        detalle.update(normalize_swim_splits(splits))
    else:
        detalle["parciales"] = normalize_laps(splits)
    return detalle


# ─────────────────────────────────────────
# Estado de entrenamiento y carga
# ─────────────────────────────────────────

def normalize_training_status(ts: dict) -> dict:
    ts = ts or {}
    status = _one_device(_first(ts.get("mostRecentTrainingStatus"), "latestTrainingStatusData"))
    acute = status.get("acuteTrainingLoadDTO") or {}
    balance = _one_device(_first(ts.get("mostRecentTrainingLoadBalance"), "metricsTrainingLoadBalanceDTOMap"))
    vo2 = ts.get("mostRecentVO2Max") or {}

    def bucket(prefix: str) -> dict:
        return {
            "carga": _r(balance.get(f"monthlyLoad{prefix}"), 0),
            "objetivo_min": _r(balance.get(f"monthlyLoad{prefix}TargetMin"), 0),
            "objetivo_max": _r(balance.get(f"monthlyLoad{prefix}TargetMax"), 0),
        }

    return {
        "fecha": status.get("calendarDate"),
        "estado": status.get("trainingStatusFeedbackPhrase") or status.get("trainingStatus"),
        "carga_aguda_7d": _r(_first(acute, "dailyTrainingLoadAcute"), 0),
        "carga_cronica_28d": _r(_first(acute, "dailyTrainingLoadChronic"), 0),
        "ratio_aguda_cronica": _r(_first(acute, "dailyAcuteChronicWorkloadRatio"), 2),
        "estado_ratio": _first(acute, "acwrStatus"),
        "rango_optimo_carga_cronica": [
            _r(_first(acute, "minTrainingLoadChronic"), 0),
            _r(_first(acute, "maxTrainingLoadChronic"), 0),
        ],
        "balance_4_semanas": {
            "aerobico_bajo": bucket("AerobicLow"),
            "aerobico_alto": bucket("AerobicHigh"),
            "anaerobico": bucket("Anaerobic"),
            "feedback": balance.get("trainingBalanceFeedbackPhrase"),
        },
        "vo2max_carrera": _r(_first(vo2.get("generic"), "vo2MaxPreciseValue", "vo2MaxValue"), 1),
        "vo2max_ciclismo": _r(_first(vo2.get("cycling"), "vo2MaxPreciseValue", "vo2MaxValue"), 1),
    }


def fetch_training_status(fecha: str | None = None) -> dict:
    d = fecha or _hoy().isoformat()
    out = normalize_training_status(_call(lambda c: c.get_training_status(d)))
    # Si el reloj no calcula "training status", el VO2max sigue disponible en max_metrics
    if out["vo2max_carrera"] is None:
        def _vo2():
            for i in range(30):
                day = (date.fromisoformat(d) - timedelta(days=i)).isoformat()
                mm = _call(lambda c: c.get_max_metrics(day))
                g = (mm[0] if isinstance(mm, list) and mm else {}).get("generic") or {}
                if g.get("vo2MaxPreciseValue") or g.get("vo2MaxValue"):
                    return _r(g.get("vo2MaxPreciseValue") or g.get("vo2MaxValue"), 1), g.get("calendarDate")
            return None, None
        out["vo2max_carrera"], out["vo2max_fecha"] = _safe(_vo2, default=(None, None))
    if out["estado"] is None and out["carga_aguda_7d"] is None:
        out["nota"] = ("Garmin no devuelve estado ni balance de carga: el reloj necesita llevarse "
                       "a diario (también de noche) para calcularlos.")
    return out


# ─────────────────────────────────────────
# Rendimiento: predicciones, umbral, endurance
# ─────────────────────────────────────────

def normalize_race_predictions(rp: Any) -> dict:
    rp = rp[0] if isinstance(rp, list) and rp else (rp or {})
    return {
        "5k": _fmt_secs(rp.get("time5K")),
        "10k": _fmt_secs(rp.get("time10K")),
        "media_maraton": _fmt_secs(rp.get("timeHalfMarathon")),
        "maraton": _fmt_secs(rp.get("timeMarathon")),
    }


def normalize_lactate(lt: dict) -> dict:
    shr = (lt or {}).get("speed_and_heart_rate") or {}
    speed = shr.get("speed")
    # Garmin guarda este valor en décimas de m/s en algunas cuentas (p. ej. 0.33 = 3.3 m/s)
    if isinstance(speed, (int, float)) and 0 < speed < 1.5:
        speed *= 10
    return {
        "fc_umbral": shr.get("heartRate"),
        "ritmo_umbral_km": _pace(1000 / speed, 1000, 1000) if speed else None,
        "fecha": (shr.get("calendarDate") or "")[:10] or None,
        "potencia_umbral": _first((lt or {}).get("power"), "functionalThresholdPower"),
    }


def fetch_performance() -> dict:
    hoy = _hoy().isoformat()
    return {
        "predicciones_carrera": _safe(lambda: normalize_race_predictions(_call(lambda c: c.get_race_predictions()))),
        "umbral_lactato": _safe(lambda: normalize_lactate(_call(lambda c: c.get_lactate_threshold(latest=True)))),
        "endurance_score": _safe(lambda: (lambda e: {
            "puntuacion": _first(e, "overallScore"),
            "clasificacion": _first(e, "classification"),
        })(_call(lambda c: c.get_endurance_score(hoy)))),
        "ftp_ciclismo": _safe(lambda: (lambda f: _first(f[0] if isinstance(f, list) and f else f, "functionalThresholdPower"))(_call(lambda c: c.get_cycling_ftp()))),
    }
