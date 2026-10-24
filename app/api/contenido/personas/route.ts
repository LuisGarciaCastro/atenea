import { NextResponse } from "next/server";
import { obtenerPersonasConConteo } from "@/lib/contenido/personas";
import { conErrores } from "@/lib/core/api";

export const GET = conErrores(async () => NextResponse.json({ personas: await obtenerPersonasConConteo() }));
