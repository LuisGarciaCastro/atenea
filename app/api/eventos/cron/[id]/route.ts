import { NextResponse } from "next/server";
import { actualizarEvento } from "@/lib/eventos/db";
import { ESTADOS_EVENTO } from "@/lib/eventos/tipos";
import { conToken } from "@/lib/core/autorizacion";
import { error, esDe, idDeRuta, leerJson, type ConId } from "@/lib/core/api";

const textoONull = (valor: unknown) => (typeof valor === "string" ? valor : null);

/** El agente de eventos interpreta un evento y lo pasa a Google Calendar o a revisión. */
export const PATCH = conToken("EVENTOS_CRON_SECRET", async (request, ruta: ConId) => {
  const id = await idDeRuta(ruta);
  if (!id) return error("Id no válido", 400);
  const body = await leerJson(request);
  if (!body) return error("JSON no válido", 400);
  if (body.estado !== undefined && !esDe(ESTADOS_EVENTO, body.estado)) return error("Estado no válido", 400);

  const evento = await actualizarEvento(id, {
    titulo: textoONull(body.titulo),
    fecha_hora_evento: textoONull(body.fecha_hora_evento),
    estado: esDe(ESTADOS_EVENTO, body.estado) ? body.estado : null,
    google_event_id: textoONull(body.google_event_id),
    motivo_revision: textoONull(body.motivo_revision),
    ...("correccion_procesada" in body ? { correccion_procesada: textoONull(body.correccion_procesada) } : {}),
  });
  return evento ? NextResponse.json({ evento }) : error("Evento no encontrado", 404);
});
