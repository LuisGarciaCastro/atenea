#!/usr/bin/env python3
"""Carga WHOOP del coach (skill coach-triatlon, sección 2.1) y banda de HRV (sección 7).

Uso:
    python3 scripts/carga_whoop.py entrada.json [--hoy YYYY-MM-DD] [--dias 42]

entrada.json:
    {
      "workouts": [ {"start": "2026-10-15T05:49:41.000Z", "duration_min": 33,
                     "sport": "swimming", "zone_min": [z0, z1, z2, z3, z4, z5]}, ... ],
      "recovery": [ {"day": "2026-10-15", "hrv_ms": 125.1}, ... ]          # opcional, ≥ 28 días
    }
    Los workouts son la salida de whoop_workouts desde INICIO (inicio del historial).
    Basta con esas cuatro claves por entreno.

Salida (stdout, JSON): el objeto "load" del data.json (hoy, serie, distribucion, semanas)
más "hrv" (media 7 días de ln(RMSSD) y su banda de 28 días) si se pasa recovery.

Fórmula fija (no tocar sin cambiar la skill):
- Fuera: sport "activity" y "walking" de 45 min o menos. Todo lo demás cuenta.
- Carga de un entreno = Σ zone_min[i] × i, i = 1..5. Día = fecha local Europe/Madrid del inicio.
- Desde INICIO con CTL = ATL = 0: TSB(d) = CTL − ATL del día anterior;
  CTL += (carga − CTL)/42; ATL += (carga − ATL)/7.
- ramp = CTL hoy − CTL hace 7 días. ACWR = carga 7 d / (carga 28 d / 4).
  Monotonía = media / desviación típica poblacional de las cargas de 7 días.
- Distribución 28 días sin zona 0: bajo = Z1+Z2, moderado = Z3, alto = Z4+Z5.
"""
import argparse
import datetime as dt
import json
import math
import statistics as st
import sys
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Madrid")
# Inicio del historial de WHOOP (CTL = ATL = 0 ese día). Pon el día desde el que quieres contar
# la carga; el mismo que INICIO_HISTORIAL en recoger_datos.py.
INICIO = dt.date(2026, 1, 1)
MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


def dia_local(start):
    t = dt.datetime.fromisoformat(start.replace("Z", "+00:00"))
    if t.tzinfo is None:
        t = t.replace(tzinfo=dt.timezone.utc)
    return t.astimezone(TZ).date()


def cuenta(w):
    sp = w["sport"]
    return not (sp == "activity" or (sp == "walking" and w["duration_min"] <= 45))


def grupo(sp):
    if sp == "swimming":
        return 0
    if sp in ("cycling", "assault-bike", "indoor_cycling"):
        return 1
    if sp == "running":
        return 2
    return 3


def calcula(workouts, hoy):
    carga, zonas = {}, {}
    for w in filter(cuenta, workouts):
        d = dia_local(w["start"])
        z = w["zone_min"]
        carga[d] = carga.get(d, 0) + sum(z[i] * i for i in range(1, 6))
        zonas.setdefault(d, []).append(w)
    ctl = atl = 0.0
    serie = []
    d = INICIO
    while d <= hoy:
        tsb = ctl - atl
        c = carga.get(d, 0)
        ctl += (c - ctl) / 42
        atl += (c - atl) / 7
        serie.append({"date": d.isoformat(), "load": c, "ctl": ctl, "atl": atl, "tsb": tsb})
        d += dt.timedelta(days=1)
    return serie, zonas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada")
    ap.add_argument("--hoy", default=dt.datetime.now(TZ).date().isoformat())
    ap.add_argument("--dias", type=int, default=42)
    a = ap.parse_args()
    with open(a.entrada, encoding="utf-8") as f:
        data = json.load(f)
    hoy = dt.date.fromisoformat(a.hoy)
    workouts = data["workouts"]

    serie, zonas = calcula(workouts, hoy)

    avisos = []

    ult = serie[-1]
    l7 = [s["load"] for s in serie[-7:]]
    l28 = sum(s["load"] for s in serie[-28:])
    sd = st.pstdev(l7)
    hoy_obj = {
        "ctl": round(ult["ctl"], 1),
        "atl": round(ult["atl"], 1),
        "tsb": round(ult["tsb"], 1),
        "ramp": round(ult["ctl"] - serie[-8]["ctl"], 1) if len(serie) >= 8 else None,
        "acwr": round(sum(l7) / (l28 / 4), 2) if l28 else None,
        "monotonia": round(st.mean(l7) / sd, 2) if sd else None,
    }

    # Distribución de intensidad 28 días (sin zona 0)
    desde28 = hoy - dt.timedelta(days=27)
    zt = [0] * 6
    for d, ws in zonas.items():
        if desde28 <= d <= hoy:
            for w in ws:
                for i in range(1, 6):
                    zt[i] += w["zone_min"][i]
    tot = sum(zt[1:])
    dist = {
        "bajo": round((zt[1] + zt[2]) / tot * 100) if tot else 0,
        "moderado": round(zt[3] / tot * 100) if tot else 0,
        "alto": round((zt[4] + zt[5]) / tot * 100) if tot else 0,
        "minutos": round(tot),
    }

    # Minutos por semana (lunes): natación, bici, carrera, otros — últimas 4 semanas
    lunes_hoy = hoy - dt.timedelta(days=hoy.weekday())
    semanas = []
    for k in range(3, -1, -1):
        lun = lunes_hoy - dt.timedelta(weeks=k)
        fila = [0, 0, 0, 0]
        for d, ws in zonas.items():
            if lun <= d < lun + dt.timedelta(days=7):
                for w in ws:
                    fila[grupo(w["sport"])] += w["duration_min"]
        semanas.append([f"{lun.day} {MESES[lun.month - 1]}"] + [round(x) for x in fila])

    salida = {
        "hoy": hoy_obj,
        "serie": [
            {"date": s["date"], "load": round(s["load"]), "ctl": round(s["ctl"], 1),
             "atl": round(s["atl"], 1), "tsb": round(s["tsb"], 1)}
            for s in serie[-a.dias:]
        ],
        "distribucion": dist,
        "semanas": semanas,
        "carga7": sum(l7),
        "mediaSemanal28": round(l28 / 4),
    }

    # Banda de HRV (sección 7): media 7 días de ln(RMSSD) frente a media de los últimos 28 días
    # (incluidos los 7 últimos) ± 0,5 DT poblacional
    rec = sorted(data.get("recovery") or [], key=lambda r: r["day"])
    rec = [r for r in rec if r.get("hrv_ms") and r["day"] <= hoy.isoformat()]
    if len(rec) >= 28:
        ln = [math.log(r["hrv_ms"]) for r in rec]
        m7 = st.mean(ln[-7:])
        base = ln[-28:]
        mu, sd28 = st.mean(base), st.pstdev(base)
        lo, hi = mu - 0.5 * sd28, mu + 0.5 * sd28
        salida["hrv"] = {
            "media7_ms": round(math.exp(m7), 1),
            "banda_ms": [round(math.exp(lo), 1), round(math.exp(hi), 1)],
            "estado": "por debajo" if m7 < lo else "por encima" if m7 > hi else "dentro",
            "media7_raw_ms": round(st.mean(r["hrv_ms"] for r in rec[-7:]), 1),
        }

    if avisos:
        salida["avisos"] = avisos
    json.dump(salida, sys.stdout, ensure_ascii=False, indent=1)
    print()


if __name__ == "__main__":
    main()
