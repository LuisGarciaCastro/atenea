import type { Accion } from "./acciones";

export type Agente = "finanzas" | "libros" | "deportes";

export interface Conversacion {
  id: number;
  titulo: string;
  creado_en: string;
  actualizado_en: string;
}

export interface MensajeChat {
  id: number;
  conversacion_id: number;
  rol: "user" | "assistant";
  texto: string;
  agentes: Agente[];
  creado_en: string;
}

/** Líneas NDJSON que la API de chat manda al navegador mientras responde. */
export type EventoChat =
  | { tipo: "conversacion"; id: number }
  | { tipo: "agente"; agente: Agente }
  | { tipo: "accion"; accion: Accion }
  | { tipo: "texto"; delta: string }
  /** Se repite un turno: el texto vuelve a tener esta longitud antes de seguir. */
  | { tipo: "recorte"; longitud: number }
  | { tipo: "fin" }
  | { tipo: "error"; mensaje: string };
