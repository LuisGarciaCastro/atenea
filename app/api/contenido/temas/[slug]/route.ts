import { NextResponse } from "next/server";
import { obtenerTemaCompleto } from "@/lib/contenido/temas";
import { conErrores, error } from "@/lib/core/api";

export const GET = conErrores(async (_request, { params }: { params: Promise<{ slug: string }> }) => {
  const tema = await obtenerTemaCompleto((await params).slug);
  return tema ? NextResponse.json({ tema }) : error("Tema no encontrado", 404);
});
