import { NextResponse } from "next/server";
import { borrarConversacion, listarMensajes, obtenerConversacion } from "@/lib/chat/db";
import { listarAcciones } from "@/lib/chat/acciones";
import { conErrores, error, idDeRuta, type ConId } from "@/lib/core/api";

export const GET = conErrores(async (_request, ruta: ConId) => {
  const id = await idDeRuta(ruta);
  if (!id) return error("Id no válido", 400);
  const conversacion = await obtenerConversacion(id);
  if (!conversacion) return error("Conversación no encontrada", 404);
  const [mensajes, acciones] = await Promise.all([listarMensajes(id), listarAcciones(id)]);
  return NextResponse.json({ conversacion, mensajes, acciones });
});

export const DELETE = conErrores(async (_request, ruta: ConId) => {
  const id = await idDeRuta(ruta);
  if (!id) return error("Id no válido", 400);
  return (await borrarConversacion(id)) ? NextResponse.json({ ok: true }) : error("Conversación no encontrada", 404);
});
