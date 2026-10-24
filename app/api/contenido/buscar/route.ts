import { NextRequest, NextResponse } from "next/server";
import { buscarContenido } from "@/lib/contenido/busqueda";
import { conErrores } from "@/lib/core/api";

export const GET = conErrores(async (request: NextRequest) =>
  NextResponse.json({ resultados: await buscarContenido(request.nextUrl.searchParams.get("q") ?? "") })
);
