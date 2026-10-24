import { NextResponse } from "next/server";
import { crearOActualizarVideoPendiente } from "@/lib/contenido/videos";
import { conToken } from "@/lib/core/autorizacion";
import { enteroEntre, error, leerId, leerJson, textoNoVacio } from "@/lib/core/api";

/** Fecha ISO que Postgres puede leer como TIMESTAMPTZ, o null. */
function fechaIso(valor: unknown): string | null {
  const texto = textoNoVacio(valor);
  return texto && !Number.isNaN(Date.parse(texto)) ? texto : null;
}

/**
 * Crea (o reprocesa, con upsert por youtube_id) un vídeo pendiente con sus
 * metadatos. Compartir el mismo vídeo dos veces lo reprocesa en vez de duplicarlo.
 */
export const POST = conToken("CONTENIDO_CRON_SECRET", async (request) => {
  const body = await leerJson(request);
  const youtubeId = textoNoVacio(body?.youtube_id);
  const titulo = textoNoVacio(body?.titulo);
  const url = textoNoVacio(body?.url);
  if (!body || !youtubeId || !titulo || !url) return error("Faltan youtube_id, titulo o url", 400);

  const video = await crearOActualizarVideoPendiente({
    youtube_id: youtubeId,
    titulo,
    canal: textoNoVacio(body.canal),
    url,
    duracion_seg: enteroEntre(body.duracion_seg, 0, 1_000_000),
    fecha_publicacion: fechaIso(body.fecha_publicacion),
    miniatura_url: textoNoVacio(body.miniatura_url),
    issue_number: leerId(body.issue_number),
  });
  return NextResponse.json({ video });
});
