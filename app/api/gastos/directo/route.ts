import { NextResponse } from "next/server";
import { crearGastoPendiente } from "@/lib/finanzas/db";
import { conToken } from "@/lib/core/autorizacion";
import { error, leerJson, textoNoVacio } from "@/lib/core/api";

// Lo llama un Atajo de iOS al pagar con Apple Pay, sin pasar por Telegram:
// por eso tiene su propio secreto en vez de FINANZAS_CRON_SECRET.
export const POST = conToken("GASTOS_DIRECTO_SECRET", async (request) => {
  const texto = textoNoVacio((await leerJson(request))?.texto);
  if (!texto) return error("Falta el texto", 400);

  const gasto = await crearGastoPendiente(texto);
  return NextResponse.json({ ok: true, id: gasto.id }, { status: 201 });
});
