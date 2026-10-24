import { NextResponse } from "next/server";
import { deshacerAccion } from "@/lib/chat/acciones";
import { conErrores, error, idDeRuta, type ConId } from "@/lib/core/api";

export const POST = conErrores(async (_request, ruta: ConId) => {
  const id = await idDeRuta(ruta);
  if (!id) return error("Id no válido", 400);
  return (await deshacerAccion(id)) ? NextResponse.json({ ok: true }) : error("No se puede deshacer", 409);
});
