import { NextResponse } from "next/server";
import { obtenerUltimoDia } from "@/lib/coach/db";
import { conErrores } from "@/lib/core/api";

export const GET = conErrores(async () => NextResponse.json({ datos: await obtenerUltimoDia() }));
