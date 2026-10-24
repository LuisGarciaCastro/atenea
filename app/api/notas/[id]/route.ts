import { NextResponse } from "next/server";
import { actualizarNota, borrarNota } from "@/lib/notas/db";
import { MAX_TEXTO_NOTA, MAX_TITULO_NOTA, TIPOS_NOTA, type Nota } from "@/lib/notas/tipos";
import { conErrores, error, esDe, idDeRuta, leerJson, textoNoVacio, type ConId } from "@/lib/core/api";

export const PATCH = conErrores(async (request, ruta: ConId) => {
  const id = await idDeRuta(ruta);
  if (!id) return error("Id no válido", 400);
  const body = await leerJson(request);
  if (!body) return error("JSON no válido", 400);

  const cambios: Partial<Pick<Nota, "tipo" | "titulo" | "texto" | "hecha">> = {};
  if (body.tipo !== undefined) {
    if (!esDe(TIPOS_NOTA, body.tipo)) return error("Tipo no válido", 400);
    cambios.tipo = body.tipo;
  }
  if (body.titulo !== undefined) {
    const titulo = textoNoVacio(body.titulo);
    if (!titulo || titulo.length > MAX_TITULO_NOTA) return error("Título vacío o demasiado largo", 400);
    cambios.titulo = titulo;
  }
  if (body.texto !== undefined) {
    if (body.texto !== null && typeof body.texto !== "string") return error("Texto no válido", 400);
    const texto = textoNoVacio(body.texto);
    if (texto && texto.length > MAX_TEXTO_NOTA) return error("El texto es demasiado largo", 400);
    cambios.texto = texto;
  }
  if (body.hecha !== undefined) {
    if (typeof body.hecha !== "boolean") return error("«hecha» tiene que ser true o false", 400);
    cambios.hecha = body.hecha;
  }

  const nota = await actualizarNota(id, cambios);
  return nota ? NextResponse.json({ nota }) : error("Nota no encontrada", 404);
});

export const DELETE = conErrores(async (_request, ruta: ConId) => {
  const id = await idDeRuta(ruta);
  if (!id) return error("Id no válido", 400);
  return (await borrarNota(id)) ? NextResponse.json({ ok: true }) : error("Nota no encontrada", 404);
});
