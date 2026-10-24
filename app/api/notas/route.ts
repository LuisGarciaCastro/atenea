import { NextResponse } from "next/server";
import { crearNota, listarNotas } from "@/lib/notas/db";
import { MAX_TEXTO_NOTA, MAX_TITULO_NOTA, TIPOS_NOTA } from "@/lib/notas/tipos";
import { conErrores, error, esDe, leerJson, textoNoVacio } from "@/lib/core/api";

export const GET = conErrores(async () => NextResponse.json({ notas: await listarNotas() }));

export const POST = conErrores(async (request) => {
  const body = await leerJson(request);
  if (!body) return error("JSON no válido", 400);
  if (!esDe(TIPOS_NOTA, body.tipo)) return error("Tipo no válido", 400);
  const titulo = textoNoVacio(body.titulo);
  if (!titulo || titulo.length > MAX_TITULO_NOTA) return error("Falta el título o es demasiado largo", 400);
  const texto = textoNoVacio(body.texto);
  if (texto && texto.length > MAX_TEXTO_NOTA) return error("El texto es demasiado largo", 400);

  return NextResponse.json({ nota: await crearNota({ tipo: body.tipo, titulo, texto }) }, { status: 201 });
});
