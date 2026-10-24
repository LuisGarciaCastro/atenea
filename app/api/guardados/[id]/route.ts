import { NextResponse } from "next/server";
import { borrarGuardado } from "@/lib/guardados/db";
import { conErrores, error, idDeRuta, type ConId } from "@/lib/core/api";

export const DELETE = conErrores(async (_request, ruta: ConId) => {
  const id = await idDeRuta(ruta);
  if (!id) return error("Id no válido", 400);
  return (await borrarGuardado(id)) ? NextResponse.json({ ok: true }) : error("Guardado no encontrado", 404);
});
