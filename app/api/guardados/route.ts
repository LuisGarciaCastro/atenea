import { NextResponse } from "next/server";
import { guardarEnlace, listarGuardados } from "@/lib/guardados/db";
import { conErrores, error, leerJson, textoNoVacio } from "@/lib/core/api";

export const GET = conErrores(async () => NextResponse.json({ guardados: await listarGuardados() }));

export const POST = conErrores(async (request) => {
  const body = await leerJson(request);
  if (typeof body?.url !== "string") return error("Falta la url", 400);

  const guardado = await guardarEnlace({
    url: body.url,
    titulo: textoNoVacio(body.titulo),
    autor: textoNoVacio(body.autor),
    nota: textoNoVacio(body.nota),
  });
  return guardado ? NextResponse.json({ guardado }, { status: 201 }) : error("URL no válida", 400);
});
