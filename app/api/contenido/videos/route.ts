import { NextResponse } from "next/server";
import { contarHighlightsTotales, obtenerVideosProcesados } from "@/lib/contenido/videos";
import { conErrores } from "@/lib/core/api";

export const GET = conErrores(async () => {
  const [videos, totalHighlights] = await Promise.all([obtenerVideosProcesados(), contarHighlightsTotales()]);
  return NextResponse.json({ videos, totalHighlights });
});
