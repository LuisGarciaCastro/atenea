#!/usr/bin/env node
// Obtiene metadatos de un vídeo de YouTube vía YouTube Data API v3.
// Uso: node scripts/contenido/obtener-metadatos.mjs <youtube_id> [<salida.json>]
// Salida (stdout): JSON con { youtube_id, titulo, canal, canal_id, url,
// duracion_seg, fecha_publicacion, miniatura_url }. `canal_id` viene gratis
// en esta misma llamada (snippet.channelId) — úsalo para resolver la foto
// del canal vía channels.list solo si aún no hay una persona con ese
// canal_id y foto_url en el catálogo (GET /api/contenido/cron/catalogo),
// para no gastar cuota de más. Código de salida distinto de 0 si el vídeo
// no existe, es privado, o falta la API key.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { variable } from "./secretos.mjs";

function escribir(ruta, contenido) {
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, contenido);
}

function parseDuracionIso8601(duracion) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duracion ?? "");
  if (!match) return null;
  const [, horas, minutos, segundos] = match;
  return Number(horas ?? 0) * 3600 + Number(minutos ?? 0) * 60 + Number(segundos ?? 0);
}

async function main() {
  const [youtubeId, salida] = process.argv.slice(2);
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId ?? "")) {
    console.error(JSON.stringify({ estado: "error", motivo: `youtube_id no válido: ${youtubeId ?? "(falta)"}` }));
    process.exit(1);
  }

  const apiKey = variable("YOUTUBE_API_KEY");
  if (!apiKey) {
    console.error(JSON.stringify({ estado: "error", motivo: "Falta la variable de entorno YOUTUBE_API_KEY" }));
    process.exit(1);
  }

  const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
  endpoint.searchParams.set("id", youtubeId);
  endpoint.searchParams.set("part", "snippet,contentDetails");
  endpoint.searchParams.set("key", apiKey);

  const res = await fetch(endpoint);
  if (!res.ok) {
    console.error(JSON.stringify({ estado: "error", motivo: `YouTube Data API respondió ${res.status}` }));
    process.exit(1);
  }

  const data = await res.json();
  const item = data.items?.[0];
  if (!item) {
    console.error(JSON.stringify({ estado: "error", motivo: "Vídeo no encontrado, privado o eliminado" }));
    process.exit(1);
  }

  const miniaturas = item.snippet?.thumbnails ?? {};
  const miniaturaUrl =
    miniaturas.maxres?.url ?? miniaturas.high?.url ?? miniaturas.medium?.url ?? miniaturas.default?.url ?? null;

  const resultado = {
    youtube_id: youtubeId,
    titulo: item.snippet?.title ?? youtubeId,
    canal: item.snippet?.channelTitle ?? null,
    canal_id: item.snippet?.channelId ?? null,
    url: `https://www.youtube.com/watch?v=${youtubeId}`,
    duracion_seg: parseDuracionIso8601(item.contentDetails?.duration),
    fecha_publicacion: item.snippet?.publishedAt ?? null,
    miniatura_url: miniaturaUrl,
  };

  if (salida) escribir(salida, JSON.stringify(resultado));
  console.log(JSON.stringify(resultado));
}

main().catch((error) => {
  console.error(JSON.stringify({ estado: "error", motivo: String(error?.message ?? error) }));
  process.exit(1);
});
