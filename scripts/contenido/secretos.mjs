// Variables de los scripts de contenido: del entorno o, en los workflows, de .contenido/secretos.json,
// que escribe un paso previo y se borra al terminar. Así los secretos no pasan por los ajustes de
// Claude Code (en el Mac acabarían en ~/.claude/settings.json) ni por el entorno del agente.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ARCHIVO = fileURLToPath(new URL("../../.contenido/secretos.json", import.meta.url));

let delArchivo;

export function variable(nombre) {
  if (process.env[nombre]) return process.env[nombre];
  if (delArchivo === undefined) {
    try {
      delArchivo = JSON.parse(readFileSync(ARCHIVO, "utf8"));
    } catch {
      delArchivo = {};
    }
  }
  return delArchivo[nombre] || undefined;
}
