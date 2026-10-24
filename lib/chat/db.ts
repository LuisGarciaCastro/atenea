import { obtenerSql, prepararEsquema } from "@/lib/core/db";
import type { Agente, Conversacion, MensajeChat } from "./tipos";

const asegurarEsquema = prepararEsquema(async (sql) => {
  await sql`
        CREATE TABLE IF NOT EXISTS chat_conversaciones (
          id SERIAL PRIMARY KEY,
          titulo TEXT NOT NULL,
          creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
          actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
  await sql`
        CREATE TABLE IF NOT EXISTS chat_mensajes (
          id SERIAL PRIMARY KEY,
          conversacion_id INTEGER NOT NULL REFERENCES chat_conversaciones(id) ON DELETE CASCADE,
          rol TEXT NOT NULL CHECK (rol IN ('user', 'assistant')),
          texto TEXT NOT NULL,
          agentes TEXT[] NOT NULL DEFAULT '{}',
          creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
  await sql`CREATE INDEX IF NOT EXISTS idx_chat_mensajes_conv ON chat_mensajes(conversacion_id, id)`;
});

export async function crearConversacion(titulo: string): Promise<Conversacion> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`INSERT INTO chat_conversaciones (titulo) VALUES (${titulo}) RETURNING *`;
  return rows[0] as Conversacion;
}

export async function listarConversaciones(): Promise<Conversacion[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`SELECT * FROM chat_conversaciones ORDER BY actualizado_en DESC LIMIT 50`;
  return rows as Conversacion[];
}

export async function obtenerConversacion(id: number): Promise<Conversacion | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`SELECT * FROM chat_conversaciones WHERE id = ${id}`;
  return (rows[0] as Conversacion | undefined) ?? null;
}

export async function borrarConversacion(id: number): Promise<boolean> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`DELETE FROM chat_conversaciones WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function listarMensajes(conversacionId: number): Promise<MensajeChat[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    SELECT * FROM chat_mensajes WHERE conversacion_id = ${conversacionId} ORDER BY id ASC
  `;
  return rows as MensajeChat[];
}

export async function guardarMensaje(
  conversacionId: number,
  rol: "user" | "assistant",
  texto: string,
  agentes: Agente[] = []
): Promise<number> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    INSERT INTO chat_mensajes (conversacion_id, rol, texto, agentes)
    VALUES (${conversacionId}, ${rol}, ${texto}, ${agentes})
    RETURNING id
  `;
  await sql`UPDATE chat_conversaciones SET actualizado_en = now() WHERE id = ${conversacionId}`;
  return (rows[0] as { id: number }).id;
}
