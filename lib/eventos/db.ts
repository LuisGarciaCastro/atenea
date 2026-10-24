import { obtenerSql, prepararEsquema } from "@/lib/core/db";
import { type EstadoEvento, type EventoPendiente } from "./tipos";

const asegurarEsquema = prepararEsquema(
  (sql) => sql`
      CREATE TABLE IF NOT EXISTS eventos_pendientes (
        id SERIAL PRIMARY KEY,
        texto_original TEXT NOT NULL,
        fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
        titulo TEXT,
        fecha_hora_evento TIMESTAMPTZ,
        estado TEXT NOT NULL DEFAULT 'pendiente_interpretar',
        google_event_id TEXT,
        correccion_pendiente TEXT,
        motivo_revision TEXT
      )
    `
);

export async function crearEventoPendiente(textoOriginal: string): Promise<EventoPendiente> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    INSERT INTO eventos_pendientes (texto_original, estado)
    VALUES (${textoOriginal}, 'pendiente_interpretar')
    RETURNING *
  `;
  return rows[0] as EventoPendiente;
}

/** Eventos por interpretar de cero, más los que tienen una corrección esperando al agente. */
export async function listarEventosPendientes(): Promise<EventoPendiente[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    SELECT * FROM eventos_pendientes
    WHERE estado = 'pendiente_interpretar' OR correccion_pendiente IS NOT NULL
    ORDER BY fecha ASC
  `;
  return rows as EventoPendiente[];
}

export async function obtenerEvento(id: number): Promise<EventoPendiente | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`SELECT * FROM eventos_pendientes WHERE id = ${id}`;
  return (rows[0] as EventoPendiente | undefined) ?? null;
}

export async function guardarCorreccionEvento(id: number, correccion: string): Promise<EventoPendiente | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    UPDATE eventos_pendientes
    SET correccion_pendiente = ${correccion}
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as EventoPendiente | undefined) ?? null;
}

export async function actualizarEvento(
  id: number,
  data: {
    titulo?: string | null;
    fecha_hora_evento?: string | null;
    estado?: EstadoEvento | null;
    google_event_id?: string | null;
    motivo_revision?: string | null;
    /** Corrección que ha aplicado el agente; si no se envía, se borra la que haya. */
    correccion_procesada?: string | null;
  }
): Promise<EventoPendiente | null> {
  // Si el usuario manda otra corrección mientras el agente trabaja, la nueva no se borra.
  const comprobar = data.correccion_procesada !== undefined;
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    UPDATE eventos_pendientes
    SET
      titulo = COALESCE(${data.titulo ?? null}, titulo),
      fecha_hora_evento = COALESCE(${data.fecha_hora_evento ?? null}, fecha_hora_evento),
      estado = COALESCE(${data.estado ?? null}, estado),
      google_event_id = COALESCE(${data.google_event_id ?? null}, google_event_id),
      motivo_revision = CASE
        WHEN ${data.estado ?? null}::text = 'creado' THEN NULL
        ELSE COALESCE(${data.motivo_revision ?? null}, motivo_revision)
      END,
      correccion_pendiente = CASE
        WHEN NOT ${comprobar}::boolean OR correccion_pendiente IS NOT DISTINCT FROM ${data.correccion_procesada ?? null}
          THEN NULL
        ELSE correccion_pendiente
      END
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as EventoPendiente | undefined) ?? null;
}
