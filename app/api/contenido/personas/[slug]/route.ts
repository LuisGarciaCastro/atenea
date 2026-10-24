import { NextResponse } from "next/server";
import { obtenerPersonaCompleta } from "@/lib/contenido/personas";
import { conErrores, error } from "@/lib/core/api";

export const GET = conErrores(async (_request, { params }: { params: Promise<{ slug: string }> }) => {
  const persona = await obtenerPersonaCompleta((await params).slug);
  return persona ? NextResponse.json({ persona }) : error("Persona no encontrada", 404);
});
