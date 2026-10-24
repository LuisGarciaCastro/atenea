import { NextRequest, NextResponse } from "next/server";
import { crearLibro, listarLibros } from "@/lib/libros/db";
import { ESTADOS_LIBRO } from "@/lib/libros/tipos";
import { conErrores, enteroEntre, error, esDe, leerJson, textoNoVacio } from "@/lib/core/api";

export const GET = conErrores(async (request: NextRequest) => {
  const estado = request.nextUrl.searchParams.get("estado");
  const libros = await listarLibros(esDe(ESTADOS_LIBRO, estado) ? estado : undefined);
  return NextResponse.json({ libros });
});

export const POST = conErrores(async (request) => {
  const body = await leerJson(request);
  const titulo = textoNoVacio(body?.titulo);
  if (!body || !titulo) return error("Falta el título del libro", 400);

  const libro = await crearLibro({
    open_library_key: textoNoVacio(body.open_library_key),
    titulo,
    autor: textoNoVacio(body.autor),
    portada_url: textoNoVacio(body.portada_url),
    estado: esDe(ESTADOS_LIBRO, body.estado) ? body.estado : "quiero_leer",
    notas: textoNoVacio(body.notas),
    paginas_totales: enteroEntre(body.paginas_totales, 1, 100_000),
  });
  return NextResponse.json({ libro }, { status: 201 });
});
