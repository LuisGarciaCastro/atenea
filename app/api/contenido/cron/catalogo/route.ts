import { NextResponse } from "next/server";
import { obtenerCatalogo } from "@/lib/contenido/catalogo";
import { conToken } from "@/lib/core/autorizacion";

/**
 * Temas y personas ya existentes, para que el agente decida si los de un vídeo
 * ya existen (aunque el nombre no sea idéntico) o son nuevos antes de guardar.
 */
export const GET = conToken("CONTENIDO_CRON_SECRET", async () => NextResponse.json(await obtenerCatalogo()));
