import { NextResponse } from "next/server";
import { conToken } from "@/lib/core/autorizacion";
import { error } from "@/lib/core/api";
import { diaEnMadrid } from "@/lib/core/fechas";
import { guardarDia, obtenerUltimoDia } from "@/lib/coach/db";
import { esDatosCoach } from "@/lib/coach/tipos";

/** El data.json de ayer: la tarea diaria parte de su plan y su cuaderno. */
export const GET = conToken("COACH_CRON_SECRET", async () => NextResponse.json({ datos: await obtenerUltimoDia() }));

export const POST = conToken("COACH_CRON_SECRET", async (request) => {
  const datos: unknown = await request.json().catch(() => null);
  if (!esDatosCoach(datos)) return error("data.json no tiene el esquema esperado", 400);

  // El día se saca en hora de Madrid, venga `generated` con offset de Madrid o en UTC.
  if (Number.isNaN(Date.parse(datos.generated))) return error("generated no es una fecha ISO", 400);
  const fecha = diaEnMadrid(datos.generated);

  await guardarDia(fecha, datos);
  return NextResponse.json({ ok: true, fecha });
});
