import type { NextRequest } from "next/server";
import { crearConversacion, guardarMensaje, listarMensajes, obtenerConversacion } from "@/lib/chat/db";
import { responder } from "@/lib/chat/orquestador";
import { asignarAccionesAMensaje } from "@/lib/chat/acciones";
import { diaEnMadrid } from "@/lib/core/fechas";
import { conErrores, error, leerId, leerJson } from "@/lib/core/api";
import type { Agente, EventoChat } from "@/lib/chat/tipos";

// El orquestador y los subagentes pueden encadenar varias llamadas al modelo.
export const maxDuration = 300;

const MAX_MENSAJE = 4000;
const MAX_HISTORIAL = 20;
/** Por debajo de maxDuration: si Vercel cortara la función, no se guardaría la respuesta ni sus cambios. */
const LIMITE_RESPUESTA_MS = 270_000;

export const POST = conErrores(async (request: NextRequest) => {
  const body = await leerJson(request);
  const mensaje = typeof body?.mensaje === "string" ? body.mensaje.trim().slice(0, MAX_MENSAJE) : "";
  if (!mensaje) return error("Falta el mensaje", 400);

  let conversacionId = body?.conversacionId == null ? null : leerId(body.conversacionId);
  if (body?.conversacionId != null && (conversacionId === null || !(await obtenerConversacion(conversacionId)))) {
    return error("Conversación no encontrada", 404);
  }
  if (conversacionId === null) {
    conversacionId = (await crearConversacion(mensaje.length > 60 ? `${mensaje.slice(0, 57)}…` : mensaje)).id;
  }
  const id = conversacionId;
  // El historial empieza siempre por un mensaje del usuario, aunque el recorte caiga en una respuesta.
  const ultimos = (await listarMensajes(id)).slice(-MAX_HISTORIAL);
  const primero = ultimos.findIndex((m) => m.rol === "user");
  const historial = primero === -1 ? [] : ultimos.slice(primero);
  await guardarMensaje(id, "user", mensaje);

  const hoy = diaEnMadrid();
  const codificador = new TextEncoder();

  // Si el usuario cierra el chat o se agota el tiempo, se cancelan las llamadas al modelo y se guarda lo que haya.
  const cancelacion = new AbortController();
  request.signal.addEventListener("abort", () => cancelacion.abort());
  const tiempo = setTimeout(() => cancelacion.abort(), LIMITE_RESPUESTA_MS);

  const cuerpo = new ReadableStream<Uint8Array>({
    async start(controller) {
      let respuesta = "";
      let completa = false;
      const cambios: string[] = [];
      const emitir = (e: EventoChat) => {
        // La respuesta se reconstruye con los mismos eventos que ve el navegador, para guardarla aunque se corte.
        if (e.tipo === "texto") respuesta += e.delta;
        if (e.tipo === "accion") cambios.push(e.accion.descripcion);
        if (e.tipo === "recorte") respuesta = respuesta.slice(0, e.longitud);
        if (cancelacion.signal.aborted) return;
        try {
          controller.enqueue(codificador.encode(`${JSON.stringify(e)}\n`));
        } catch {
          cancelacion.abort();
        }
      };
      emitir({ tipo: "conversacion", id });
      let usados: Agente[] = [];
      try {
        const { agentes } = await responder(
          historial,
          mensaje,
          { conversacionId: id, hoy, mensajeUsuario: mensaje, signal: cancelacion.signal },
          emitir
        );
        usados = agentes;
        completa = true;
        emitir({ tipo: "fin" });
      } catch (error) {
        if (!cancelacion.signal.aborted) {
          console.error("Chat:", error);
          emitir({ tipo: "error", mensaje: "No he podido responder. Inténtalo otra vez." });
        }
      } finally {
        clearTimeout(tiempo);
        // Si la respuesta se cortó, el historial dice qué se llegó a cambiar: así, al repetir la
        // pregunta, el modelo no lo apunta dos veces.
        let guardada = respuesta.trim() || "No he podido responder.";
        if (!completa && cambios.length > 0) guardada += `\n\nCambios hechos antes de cortarse: ${cambios.join("; ")}.`;
        try {
          const mensajeId = await guardarMensaje(id, "assistant", guardada, usados);
          await asignarAccionesAMensaje(id, mensajeId);
        } catch (e) {
          console.error("Chat: no se pudo guardar la respuesta", e);
        }
        try {
          controller.close();
        } catch {
          // El navegador ya cerró la conexión.
        }
      }
    },
    cancel() {
      cancelacion.abort();
    },
  });

  return new Response(cuerpo, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
});
