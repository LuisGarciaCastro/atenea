"""Lee la respuesta de GET /api/coach/cron por stdin e imprime «YYYY-MM-DD HH» en hora
de Madrid de su `generated` (vacío si no hay días). Lo usa la guarda de franjas de
coach-diario.yml, que así no depende de que el agente escriba la hora con offset."""

import json
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

datos = json.load(sys.stdin).get("datos") or {}
generado = datos.get("generated")
if generado:
    instante = datetime.fromisoformat(generado.replace("Z", "+00:00"))
    if instante.tzinfo is None:
        instante = instante.replace(tzinfo=ZoneInfo("Europe/Madrid"))
    print(instante.astimezone(ZoneInfo("Europe/Madrid")).strftime("%Y-%m-%d %H"))
