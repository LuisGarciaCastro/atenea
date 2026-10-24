#!/usr/bin/env node
// Habla con la API de contenido del hub y con Telegram leyendo los datos de archivos JSON o de
// texto, para que el agente nunca meta texto de un vídeo (transcripción, título…) en la línea de
// comandos: un apóstrofo ahí cerraría la cadena de shell y lo que viniera detrás se ejecutaría.
//
// Uso:
//   node scripts/contenido/api.mjs crear <metadatos.json> <issue>
//   node scripts/contenido/api.mjs catalogo
//   node scripts/contenido/api.mjs guardar <id> <analisis.json> [<transcripcion.json>]
//   node scripts/contenido/api.mjs error <id> <motivo.txt>
//   node scripts/contenido/api.mjs telegram <mensaje.txt>
//
// `crear` usa la salida de obtener-metadatos.mjs tal cual. `guardar` toma los segmentos de
// <transcripcion.json> (la salida de obtener-transcripcion.mjs) si se pasa, para no tener que
// reescribirlos en <analisis.json>.
// Lee APP_BASE_URL, CONTENIDO_CRON_SECRET, TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID con secretos.mjs.

import { readFileSync } from "node:fs";
import { variable } from "./secretos.mjs";

function fallar(motivo) {
  console.error(JSON.stringify({ estado: "error", motivo }));
  process.exit(1);
}

function entorno(nombre) {
  const valor = variable(nombre);
  if (!valor) fallar(`Falta la variable de entorno ${nombre}`);
  return valor;
}

function leerJson(ruta) {
  if (!ruta) fallar("Falta la ruta del archivo JSON");
  try {
    return JSON.parse(readFileSync(ruta, "utf8"));
  } catch (e) {
    fallar(`No se pudo leer ${ruta}: ${e.message}`);
  }
}

function leerTexto(ruta) {
  if (!ruta) fallar("Falta la ruta del archivo de texto");
  const texto = readFileSync(ruta, "utf8").trim();
  if (!texto) fallar(`${ruta} está vacío`);
  return texto;
}

function leerIdVideo(valor) {
  if (!/^\d+$/.test(valor ?? "")) fallar(`Id de vídeo no válido: ${valor}`);
  return valor;
}

async function hub(metodo, ruta, cuerpo) {
  const base = entorno("APP_BASE_URL").replace(/\/+$/, "");
  const res = await fetch(`${base}/api/contenido/cron${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${entorno("CONTENIDO_CRON_SECRET")}`,
      ...(cuerpo ? { "Content-Type": "application/json" } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await res.text();
  if (!res.ok) fallar(`${metodo} ${ruta} respondió ${res.status}: ${texto}`);
  console.log(texto);
}

async function telegram(texto) {
  const res = await fetch(`https://api.telegram.org/bot${entorno("TELEGRAM_BOT_TOKEN")}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: entorno("TELEGRAM_CHAT_ID"), text: texto }),
  });
  if (!res.ok) fallar(`Telegram respondió ${res.status}: ${await res.text()}`);
  console.log(JSON.stringify({ estado: "ok" }));
}

async function main() {
  const [orden, ...args] = process.argv.slice(2);
  switch (orden) {
    case "crear": {
      const issue = args[1] ? Number(args[1]) : null;
      if (issue !== null && !Number.isInteger(issue)) fallar(`Número de issue no válido: ${args[1]}`);
      return hub("POST", "/videos", { ...leerJson(args[0]), issue_number: issue });
    }
    case "catalogo":
      return hub("GET", "/catalogo");
    case "guardar": {
      const id = leerIdVideo(args[0]);
      const analisis = leerJson(args[1]);
      if (args[2]) analisis.segmentos = leerJson(args[2]).segmentos;
      return hub("PATCH", `/videos/${id}`, analisis);
    }
    case "error":
      return hub("PATCH", `/videos/${leerIdVideo(args[0])}`, { estado: "error", error_motivo: leerTexto(args[1]) });
    case "telegram":
      return telegram(leerTexto(args[0]));
    default:
      fallar(`Orden desconocida: ${orden ?? "(ninguna)"}`);
  }
}

main().catch((e) => fallar(e.message));
