import { NextResponse } from "next/server";
import { actualizarLibro, borrarLibro } from "@/lib/libros/db";
import { ESTADOS_LIBRO } from "@/lib/libros/tipos";
import { conErrores, enteroEntre, error, esDe, idDeRuta, leerJson, type ConId } from "@/lib/core/api";

export const PATCH = conErrores(async (request, ruta: ConId) => {
  const id = await idDeRuta(ruta);
  if (!id) return error("Id no válido", 400);
  const body = await leerJson(request);
  if (!body) return error("JSON no válido", 400);

  const valoracion = body.valoracion === undefined ? undefined : enteroEntre(body.valoracion, 1, 5);
  if (valoracion === null) return error("La valoración va de 1 a 5", 400);

  const libro = await actualizarLibro(id, {
    estado: esDe(ESTADOS_LIBRO, body.estado) ? body.estado : undefined,
    notas: typeof body.notas === "string" ? body.notas : undefined,
    pagina_actual: enteroEntre(body.pagina_actual, 0, 100_000) ?? undefined,
    paginas_totales: enteroEntre(body.paginas_totales, 1, 100_000) ?? undefined,
    valoracion,
  });
  return libro ? NextResponse.json({ libro }) : error("Libro no encontrado", 404);
});

export const DELETE = conErrores(async (_request, ruta: ConId) => {
  const id = await idDeRuta(ruta);
  if (!id) return error("Id no válido", 400);
  return (await borrarLibro(id)) ? NextResponse.json({ ok: true }) : error("Libro no encontrado", 404);
});
