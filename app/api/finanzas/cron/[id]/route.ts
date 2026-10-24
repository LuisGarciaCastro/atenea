import { NextResponse } from "next/server";
import { actualizarGasto } from "@/lib/finanzas/db";
import { importeValido, normalizarCategoria } from "@/lib/finanzas/tipos";
import { conToken } from "@/lib/core/autorizacion";
import { error, idDeRuta, leerJson, textoNoVacio, type ConId } from "@/lib/core/api";

/** El agente de finanzas categoriza un gasto pendiente. */
export const PATCH = conToken("FINANZAS_CRON_SECRET", async (request, ruta: ConId) => {
  const id = await idDeRuta(ruta);
  if (!id) return error("Id no válido", 400);
  const body = await leerJson(request);
  const categoria = typeof body?.categoria === "string" ? normalizarCategoria(body.categoria) : null;
  const importe = importeValido(body?.importe);
  if (!categoria || importe === null) return error("Faltan una categoría y un importe válidos", 400);

  const gasto = await actualizarGasto(id, {
    categoria,
    importe,
    descripcion: textoNoVacio(body?.descripcion),
    estado: "categorizado",
  });
  return gasto ? NextResponse.json({ gasto }) : error("Gasto no encontrado", 404);
});
