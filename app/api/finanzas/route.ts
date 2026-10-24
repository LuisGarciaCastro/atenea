import { NextResponse } from "next/server";
import { crearGasto, listarGastos } from "@/lib/finanzas/db";
import { importeValido, normalizarCategoria } from "@/lib/finanzas/tipos";
import { conErrores, error, leerJson, textoNoVacio } from "@/lib/core/api";
import { diaEnMadrid, sumarDias } from "@/lib/core/fechas";

/** Gastos del último año, contados desde el inicio del día en Madrid. */
export const GET = conErrores(async () => {
  const desde = new Date(`${sumarDias(diaEnMadrid(), -365)}T00:00:00Z`);
  return NextResponse.json({ gastos: await listarGastos(desde) });
});

export const POST = conErrores(async (request) => {
  const body = await leerJson(request);
  const importe = importeValido(body?.importe);
  if (!body || importe === null) return error("Importe no válido", 400);

  const gasto = await crearGasto({
    importe,
    categoria: typeof body.categoria === "string" ? normalizarCategoria(body.categoria) : null,
    descripcion: textoNoVacio(body.descripcion),
  });
  return NextResponse.json({ gasto }, { status: 201 });
});
