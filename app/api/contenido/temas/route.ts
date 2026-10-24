import { NextResponse } from "next/server";
import { obtenerTemasConConteo } from "@/lib/contenido/temas";
import { conErrores } from "@/lib/core/api";

export const GET = conErrores(async () => NextResponse.json({ temas: await obtenerTemasConConteo() }));
