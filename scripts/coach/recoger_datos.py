#!/usr/bin/env python3
"""Recoge los datos de WHOOP y Garmin para la tarea diaria del coach (GitHub Actions).

Uso:
    python3 scripts/coach/recoger_datos.py SALIDA_DIR [--hoy YYYY-MM-DD]

Variables de entorno: APP_BASE_URL, COACH_CREDENCIALES_SECRET, WHOOP_CLIENT_ID,
WHOOP_CLIENT_SECRET y, solo la primera vez, WHOOP_SESION_INICIAL y
GARMIN_SESION_INICIAL.

Escribe en SALIDA_DIR:
- crudos.json: días de WHOOP (35), entrenos de WHOOP desde el 4 sep, y de Garmin
  las actividades de 30 días, el detalle de las de esta semana (con RPE),
  rendimiento y estado de entrenamiento. Los fallos van en "errores".
- entrada-carga.json: la entrada de carga_whoop.py.

WHOOP y Garmin rotan el refresh token: la sesión nueva se guarda en el hub en
cuanto se obtiene, para que un fallo posterior no deje la sesión inservible.
"""
import argparse
import datetime as dt
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Madrid")
# Desde cuándo se piden los entrenos a WHOOP: el mismo día que INICIO en carga_whoop.py.
INICIO_HISTORIAL = "2026-01-01"
WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token"
WHOOP_API = "https://api.prod.whoop.com/developer"
HORA_MS = 3_600_000
MIN_MS = 60_000
# WHOOP rechaza (403) el User-Agent por defecto de urllib.
USER_AGENT = "atenea-coach/1.0"


# ── Red ──────────────────────────────────────────────────────────────

def abrir(req: urllib.request.Request, intentos: int = 3):
    """urlopen con reintentos (2 s, 4 s) ante 429, 5xx o fallos de red; el resto de errores sube tal cual."""
    for intento in range(1, intentos + 1):
        try:
            return urllib.request.urlopen(req, timeout=30)
        except urllib.error.HTTPError as e:
            if intento == intentos or (e.code != 429 and e.code < 500):
                raise
        except urllib.error.URLError:
            if intento == intentos:
                raise
        time.sleep(2 ** intento)


# ── Hub ──────────────────────────────────────────────────────────────

def hub(metodo: str, ruta: str, cuerpo: dict | None = None) -> dict | None:
    """Llama a la API del hub. Devuelve None si la respuesta es 404."""
    url = os.environ["APP_BASE_URL"].rstrip("/") + ruta
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(url, data=datos, method=metodo, headers={
        "Authorization": f"Bearer {os.environ['COACH_CREDENCIALES_SECRET']}",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
    })
    try:
        with abrir(req) as res:
            return json.load(res)
    except urllib.error.HTTPError as e:
        if e.code == 404 and metodo == "GET":
            return None
        raise


def guardar_sesion(proveedor: str, sesion: dict) -> None:
    """Guarda en el hub la sesión recién rotada. Si no se puede, el refresh token nuevo
    se pierde y hay que volver a iniciar sesión a mano: se dice bien alto."""
    try:
        hub("PUT", f"/api/coach/cron/credenciales/{proveedor}", sesion)
    except Exception as e:
        raise RuntimeError(
            f"No se pudo guardar la sesión nueva de {proveedor} en el hub ({e}). "
            f"Habrá que volver a iniciar sesión con scripts/coach/{proveedor}_login.py."
        ) from None


def sesion_guardada(proveedor: str, variable_inicial: str) -> dict:
    sesion = hub("GET", f"/api/coach/cron/credenciales/{proveedor}")
    if sesion:
        return sesion
    inicial = os.environ.get(variable_inicial)
    if not inicial:
        raise RuntimeError(f"No hay sesión de {proveedor} en el hub ni en {variable_inicial}")
    return json.loads(inicial)


# ── WHOOP ────────────────────────────────────────────────────────────

def whoop_token() -> str:
    sesion = sesion_guardada("whoop", "WHOOP_SESION_INICIAL")
    datos = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": sesion["refresh_token"],
        "client_id": os.environ["WHOOP_CLIENT_ID"],
        "client_secret": os.environ["WHOOP_CLIENT_SECRET"],
        "scope": "offline",
    }).encode()
    req = urllib.request.Request(WHOOP_TOKEN_URL, data=datos, headers={
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
    })
    try:
        # Un solo intento: WHOOP rota el refresh token, y si lo rotó pero la respuesta se perdió,
        # reintentar con el viejo da invalid_grant y obliga a repetir el login a mano.
        with abrir(req, intentos=1) as res:
            tokens = json.load(res)
    except urllib.error.HTTPError as e:
        # La respuesta de error de WHOOP (invalid_client, invalid_grant…) no lleva secretos y dice qué falla.
        cuerpo = e.read().decode(errors="replace")[:300]
        if "invalid_grant" in cuerpo:
            raise RuntimeError("la sesión ha caducado: repite el login con scripts/coach/whoop_login.py") from None
        raise RuntimeError(f"renovando el token ({e.code}): {cuerpo}") from None
    nuevo = tokens.get("refresh_token") or sesion["refresh_token"]
    guardar_sesion("whoop", {"refresh_token": nuevo})
    return tokens["access_token"]


def whoop_todo(token: str, ruta: str, desde: str) -> list[dict]:
    registros, siguiente = [], None
    while True:
        q = {"limit": "25", "start": f"{desde}T00:00:00.000Z"}
        if siguiente:
            q["nextToken"] = siguiente
        req = urllib.request.Request(f"{WHOOP_API}{ruta}?{urllib.parse.urlencode(q)}",
                                     headers={"Authorization": f"Bearer {token}", "User-Agent": USER_AGENT})
        try:
            with abrir(req) as res:
                pagina = json.load(res)
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"{ruta} ({e.code}): {e.read().decode(errors='replace')[:300]}") from None
        registros += pagina.get("records", [])
        siguiente = pagina.get("next_token")
        if not siguiente:
            return registros


def fecha_local(iso: str, offset: str | None) -> str:
    t = dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    if offset:
        signo = -1 if offset.startswith("-") else 1
        h, m = offset.lstrip("+-").split(":")
        t = t + signo * dt.timedelta(hours=int(h), minutes=int(m))
    return t.date().isoformat()


def redondea(n, d=1):
    """Redondeo .5 hacia arriba, como js_round, para que coincida con lo que muestra la app."""
    return None if n is None else math.floor(n * 10**d + 0.5) / 10**d


def js_round(x: float) -> int:
    """Math.round de JavaScript (.5 hacia arriba), como la app de WHOOP.

    round() de Python redondea .5 al par y cambia los minutos por zona de algunos
    entrenos: la carga resultante no cuadraba con la comprobación de carga_whoop.py.
    """
    return math.floor(x + 0.5)


def whoop_dias(ciclos: list[dict], recoveries: list[dict], suenos: list[dict]) -> list[dict]:
    """Un día por ciclo: ciclo + recovery + sueño principal (igual que la app de WHOOP)."""
    principal: dict[int, dict] = {}
    for s in suenos:
        if s.get("nap") or not s.get("score"):
            continue
        previo = principal.get(s["cycle_id"])
        if not previo or s["end"] > previo["end"]:
            principal[s["cycle_id"]] = s
    rec = {r["cycle_id"]: r for r in recoveries}

    dias = []
    for c in ciclos:
        sl = principal.get(c["id"])
        r = (rec.get(c["id"]) or {}).get("score") or {}
        cs = c.get("score") or {}
        st = ((sl or {}).get("score") or {}).get("stage_summary")
        need = ((sl or {}).get("score") or {}).get("sleep_needed")
        if sl:
            dia = fecha_local(sl["end"], sl.get("timezone_offset"))
        else:
            inicio = dt.datetime.fromisoformat(c["start"].replace("Z", "+00:00")) + dt.timedelta(hours=12)
            dia = fecha_local(inicio.isoformat(), c.get("timezone_offset"))
        necesidad = None
        if need:
            necesidad = (need["baseline_milli"] + need["need_from_sleep_debt_milli"]
                         + need["need_from_recent_strain_milli"] - need["need_from_recent_nap_milli"]) / HORA_MS
        dias.append({
            "day": dia,
            "recovery_score": r.get("recovery_score"),
            "hrv_ms": redondea(r.get("hrv_rmssd_milli")),
            "resting_hr": r.get("resting_heart_rate"),
            "spo2_pct": redondea(r.get("spo2_percentage")),
            "skin_temp_c": redondea(r.get("skin_temp_celsius"), 2),
            "strain": redondea(cs.get("strain")),
            "sleep_need_hours": redondea(necesidad, 2),
            "sleep_performance_pct": ((sl or {}).get("score") or {}).get("sleep_performance_percentage"),
            "deep_min": js_round(st["total_slow_wave_sleep_time_milli"] / MIN_MS) if st else None,
            "rem_min": js_round(st["total_rem_sleep_time_milli"] / MIN_MS) if st else None,
            "light_min": js_round(st["total_light_sleep_time_milli"] / MIN_MS) if st else None,
            "awake_min": js_round(st["total_awake_time_milli"] / MIN_MS) if st else None,
        })
    return sorted(dias, key=lambda d: d["day"])


def whoop_entrenos(workouts: list[dict]) -> list[dict]:
    salida = []
    for w in sorted(workouts, key=lambda x: x["start"]):
        s = w.get("score")
        if not s:
            continue
        z = s["zone_durations"]
        duracion = (dt.datetime.fromisoformat(w["end"].replace("Z", "+00:00"))
                    - dt.datetime.fromisoformat(w["start"].replace("Z", "+00:00"))).total_seconds() / 60
        salida.append({
            "start": w["start"],
            "duration_min": js_round(duracion),
            "sport": w["sport_name"],
            "strain": s.get("strain"),
            "avg_hr": s.get("average_heart_rate"),
            "max_hr": s.get("max_heart_rate"),
            "kilojoule": s.get("kilojoule"),
            "distance_km": round(s["distance_meter"] / 1000, 2) if s.get("distance_meter") else None,
            "altitude_gain_m": s.get("altitude_gain_meter"),
            "zone_min": [js_round(z[k] / MIN_MS) for k in (
                "zone_zero_milli", "zone_one_milli", "zone_two_milli",
                "zone_three_milli", "zone_four_milli", "zone_five_milli")],
        })
    return salida


# ── Garmin ───────────────────────────────────────────────────────────

def garmin(inicio_semana: str) -> dict:
    sesion = sesion_guardada("garmin", "GARMIN_SESION_INICIAL")
    os.environ["GARMIN_SESION"] = json.dumps(sesion)
    sys.path.insert(0, str(Path(__file__).parent))
    import garmin_client
    import garmin_metrics as gm

    try:
        actividades = gm.fetch_activities(30)
        detalles = []
        for a in actividades:
            if a["fecha"] < inicio_semana:
                continue
            ident = str(a["activity_id"])
            detalle = gm._safe(lambda: gm.fetch_activity_detail(ident), default=None, que=f"detalle de {ident}")
            if detalle:
                detalles.append(detalle)
        return {
            "actividades_30d": actividades,
            "detalles_semana": detalles,
            "rendimiento": gm._safe(gm.fetch_performance, default={}, que="rendimiento"),
            "estado_entrenamiento": gm._safe(gm.fetch_training_status, default={}, que="estado de entrenamiento"),
            "errores": gm.ERRORES,
        }
    finally:
        nueva = garmin_client.sesion_actual()
        if nueva:
            guardar_sesion("garmin", json.loads(nueva))


# ── Principal ────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("salida")
    ap.add_argument("--hoy", default=dt.datetime.now(TZ).date().isoformat())
    a = ap.parse_args()
    hoy = dt.date.fromisoformat(a.hoy)
    inicio_semana = (hoy - dt.timedelta(days=6)).isoformat()
    desde35 = (hoy - dt.timedelta(days=36)).isoformat()
    salida = Path(a.salida)
    salida.mkdir(parents=True, exist_ok=True)

    # Sin la API de credenciales no hay dónde guardar las sesiones rotadas: mejor no tocarlas.
    # Se prueba la ruta de credenciales (la única para la que este paso tiene secreto); un 404
    # solo dice que aún no hay sesión guardada, y vale.
    try:
        hub("GET", "/api/coach/cron/credenciales/whoop")
    except Exception as e:  # noqa: BLE001
        print(f"Error consultando el hub: {e}", file=sys.stderr)
        sys.exit("La API del coach no responde; no se renuevan las sesiones.")

    crudos: dict = {"hoy": hoy.isoformat(), "errores": []}

    try:
        token = whoop_token()
        ciclos = whoop_todo(token, "/v2/cycle", desde35)
        recoveries = whoop_todo(token, "/v2/recovery", desde35)
        suenos = whoop_todo(token, "/v2/activity/sleep", desde35)
        workouts = whoop_todo(token, "/v2/activity/workout", INICIO_HISTORIAL)
        crudos["whoop"] = {"dias": whoop_dias(ciclos, recoveries, suenos), "entrenos": whoop_entrenos(workouts)}
    except Exception as e:  # noqa: BLE001 - el coach trabaja con lo que haya
        crudos["errores"].append(f"WHOOP: {e}")

    try:
        crudos["garmin"] = garmin(inicio_semana)
        crudos["errores"] += [f"Garmin, {e}" for e in crudos["garmin"].pop("errores")]
    except Exception as e:  # noqa: BLE001
        crudos["errores"].append(f"Garmin: {e}")

    (salida / "crudos.json").write_text(json.dumps(crudos, ensure_ascii=False, indent=1))

    if "whoop" in crudos:
        entrada = {
            "workouts": [{k: w[k] for k in ("start", "duration_min", "sport", "zone_min")}
                         for w in crudos["whoop"]["entrenos"]],
            "recovery": [{"day": d["day"], "hrv_ms": d["hrv_ms"]}
                         for d in crudos["whoop"]["dias"] if d["hrv_ms"] is not None],
        }
        (salida / "entrada-carga.json").write_text(json.dumps(entrada))

    print(json.dumps({"errores": crudos["errores"]}, ensure_ascii=False))
    if "whoop" not in crudos and "garmin" not in crudos:
        sys.exit("Sin datos de WHOOP ni de Garmin")


if __name__ == "__main__":
    main()
