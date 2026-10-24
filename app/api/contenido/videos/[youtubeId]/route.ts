import { NextResponse } from "next/server";
import { obtenerVideoCompleto } from "@/lib/contenido/videos";
import { conErrores, error } from "@/lib/core/api";

export const GET = conErrores(async (_request, { params }: { params: Promise<{ youtubeId: string }> }) => {
  const video = await obtenerVideoCompleto((await params).youtubeId);
  return video ? NextResponse.json({ video }) : error("Vídeo no encontrado", 404);
});
