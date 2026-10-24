#!/usr/bin/env node
// Obtiene la transcripción con timestamps de un vídeo de YouTube, en dos
// pasos (cadena aprobada en el issue #80 — sin tercer servicio):
//
//   1. youtube-transcript-plus, directo desde este runner (IP residencial,
//      sin el bloqueo de IPs de datacenter que sufre la nube).
//   2. Si falla o no hay subtítulos: Supadata (tiene su propio fallback con
//      IA para vídeos sin subtítulos nativos).
//
// El despachador (issue #80, segunda iteración) decide en qué entorno corre
// este script y lo señala con CONOCIMIENTO_ENTORNO=mac|cloud:
//   - "mac": cadena completa, tal cual arriba.
//   - "cloud": una IP de datacenter siempre falla en youtube-transcript-plus,
//     así que ese paso se salta y se va directo a Supadata (evita perder
//     tiempo en un intento que nunca puede tener éxito).
//
// Si ambos pasos fallan (o el único paso en cloud falla), termina con código
// de salida distinto de 0 y un JSON { estado: "error", motivo } en stderr —
// el agente marca el vídeo como error y notifica por Telegram, sin más
// reintentos.
//
// Uso: CONOCIMIENTO_ENTORNO=mac|cloud node scripts/contenido/obtener-transcripcion.mjs <youtube_id> [<salida.json>]
// Salida en éxito: JSON { fuente, segmentos: [{ inicio_seg, fin_seg, texto }] }. Con <salida.json>
// el JSON va a ese archivo y por stdout sale solo el texto corrido.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { variable } from "./secretos.mjs";

function escribir(ruta, contenido) {
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, contenido);
}

async function intentarYoutubeTranscriptPlus(youtubeId) {
  const { fetchTranscript } = await import("youtube-transcript-plus");
  const items = await fetchTranscript(youtubeId);
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("youtube-transcript-plus devolvió una transcripción vacía");
  }
  // offset y duration ya vienen en segundos (TranscriptSegment de la librería).
  return items.map((item) => {
    const inicioSeg = Number(item.offset);
    const duracionSeg = Number(item.duration ?? 0);
    return { inicio_seg: inicioSeg, fin_seg: inicioSeg + duracionSeg, texto: String(item.text ?? "").trim() };
  });
}

async function intentarSupadata(youtubeId) {
  const apiKey = variable("SUPADATA_API_KEY");
  if (!apiKey) {
    throw new Error("Falta la variable de entorno SUPADATA_API_KEY");
  }

  const endpoint = new URL("https://api.supadata.ai/v1/youtube/transcript");
  endpoint.searchParams.set("videoId", youtubeId);

  const res = await fetch(endpoint, { headers: { "x-api-key": apiKey } });
  if (!res.ok) {
    throw new Error(`Supadata respondió ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const data = await res.json();
  const items = data.content ?? data.segments ?? data.transcript;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Supadata devolvió una transcripción vacía");
  }

  return items.map((item) => {
    const inicioMs = item.offset ?? item.start ?? 0;
    const duracionMs = item.duration ?? (item.end != null ? item.end - inicioMs : 0);
    const inicioSeg = Number(inicioMs) / 1000;
    const duracionSeg = Number(duracionMs) / 1000;
    return { inicio_seg: inicioSeg, fin_seg: inicioSeg + duracionSeg, texto: String(item.text ?? "").trim() };
  });
}

async function main() {
  const [youtubeId, salida] = process.argv.slice(2);
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId ?? "")) {
    console.error(JSON.stringify({ estado: "error", motivo: `youtube_id no válido: ${youtubeId ?? "(falta)"}` }));
    process.exit(1);
  }

  const entorno = variable("CONOCIMIENTO_ENTORNO") ?? "mac";
  const intentos =
    entorno === "cloud"
      ? [{ fuente: "supadata", fn: intentarSupadata }]
      : [
          { fuente: "youtube-transcript-plus", fn: intentarYoutubeTranscriptPlus },
          { fuente: "supadata", fn: intentarSupadata },
        ];

  const errores = [];
  for (const intento of intentos) {
    try {
      const segmentos = await intento.fn(youtubeId);
      const resultado = JSON.stringify({ fuente: intento.fuente, segmentos });
      // Con <salida> se escribe ahí y por stdout solo va el texto, para leerlo sin timestamps.
      if (salida) {
        escribir(salida, resultado);
        console.log(segmentos.map((s) => s.texto).join(" "));
      } else {
        console.log(resultado);
      }
      return;
    } catch (error) {
      errores.push(`${intento.fuente}: ${String(error?.message ?? error)}`);
    }
  }

  console.error(JSON.stringify({ estado: "error", motivo: errores.join(" | ") }));
  process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ estado: "error", motivo: String(error?.message ?? error) }));
  process.exit(1);
});
