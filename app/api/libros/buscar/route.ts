import { NextRequest, NextResponse } from "next/server";
import { buscarEnOpenLibrary } from "@/lib/libros/openlibrary";
import { error } from "@/lib/core/api";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ resultados: [] });

  try {
    return NextResponse.json({ resultados: await buscarEnOpenLibrary(q) });
  } catch (e) {
    console.error("Open Library:", e);
    return error("No se pudo buscar en Open Library", 502);
  }
}
