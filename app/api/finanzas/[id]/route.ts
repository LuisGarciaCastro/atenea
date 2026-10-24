import { NextResponse } from "next/server";
import { actualizarGasto, borrarGasto } from "@/lib/finanzas/db";
import { importeValido, normalizarCategoria } from "@/lib/finanzas/tipos";
import { conErrores, error, idDeRuta, leerJson, type ConId } from "@/lib/core/api";

/** Editar un gasto desde la app lo deja categorizado. */
export const PATCH = conErrores(async (request, ruta: ConId) => {
  const id = await idDeRuta(ruta);
  if (!id) return error("Id no válido", 400);
  const body = await leerJson(request);
  if (!body) return error("JSON no válido", 400);

  const importe = body.importe === undefined ? undefined : importeValido(body.importe);
  if (importe === null) return error("Importe no válido", 400);

  const gasto = await actualizarGasto(id, {
    categoria: (typeof body.categoria === "string" && normalizarCategoria(body.categoria)) || undefined,
    importe,
    descripcion: typeof body.descripcion === "string" ? body.descripcion : undefined,
    estado: "categorizado",
  });
  return gasto ? NextResponse.json({ gasto }) : error("Gasto no encontrado", 404);
});

export const DELETE = conErrores(async (_request, ruta: ConId) => {
  const id = await idDeRuta(ruta);
  if (!id) return error("Id no válido", 400);
  return (await borrarGasto(id)) ? NextResponse.json({ ok: true }) : error("Gasto no encontrado", 404);
});
