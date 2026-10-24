import { obtenerSql, prepararEsquema } from "@/lib/core/db";
import { borrarGasto } from "@/lib/finanzas/db";
import { borrarLibro, restaurarLibro } from "@/lib/libros/db";
import { quitarSensacion, type Sensacion } from "@/lib/coach/db";
import type { Libro } from "@/lib/libros/tipos";

/** Cómo revertir cada cambio que hace el chat. */
export type Deshacer =
  | { tipo: "borrar_libro"; id: number }
  | { tipo: "restaurar_libro"; libro: Libro; actualizado_en?: string }
  | { tipo: "borrar_gasto"; id: number }
  | { tipo: "quitar_sensacion"; sensacion: Sensacion }
  | { tipo: "ninguno" };

export interface Accion {
  id: number;
  descripcion: string;
  deshacible: boolean;
  deshecha?: boolean;
  /** Mensaje del asistente en el que se hizo; null mientras la respuesta está en curso. */
  mensaje_id?: number | null;
}

const asegurarEsquema = prepararEsquema(async (sql) => {
  await sql`
        CREATE TABLE IF NOT EXISTS chat_acciones (
          id SERIAL PRIMARY KEY,
          conversacion_id INTEGER NOT NULL REFERENCES chat_conversaciones(id) ON DELETE CASCADE,
          descripcion TEXT NOT NULL,
          deshacer JSONB NOT NULL,
          deshecha BOOLEAN NOT NULL DEFAULT FALSE,
          creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
  // Para volver a mostrar cada cambio (con su «Deshacer») al reabrir la conversación.
  await sql`ALTER TABLE chat_acciones ADD COLUMN IF NOT EXISTS mensaje_id INTEGER`;
});

/** Liga a la respuesta guardada los cambios que se hicieron mientras se generaba. */
export async function asignarAccionesAMensaje(conversacionId: number, mensajeId: number): Promise<void> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  await sql`
    UPDATE chat_acciones SET mensaje_id = ${mensajeId}
    WHERE conversacion_id = ${conversacionId} AND mensaje_id IS NULL
  `;
}

export async function listarAcciones(conversacionId: number): Promise<Accion[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    SELECT id, descripcion, deshacer->>'tipo' <> 'ninguno' AS deshacible, deshecha, mensaje_id
    FROM chat_acciones WHERE conversacion_id = ${conversacionId} ORDER BY id ASC
  `;
  return rows as Accion[];
}

export async function registrarAccion(
  conversacionId: number,
  descripcion: string,
  deshacer: Deshacer
): Promise<Accion> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    INSERT INTO chat_acciones (conversacion_id, descripcion, deshacer)
    VALUES (${conversacionId}, ${descripcion}, ${JSON.stringify(deshacer)}::jsonb)
    RETURNING id
  `;
  return { id: (rows[0] as { id: number }).id, descripcion, deshacible: deshacer.tipo !== "ninguno" };
}

/** Revierte una acción. Devuelve false si no existe, ya estaba deshecha o no se puede deshacer. */
export async function deshacerAccion(id: number): Promise<boolean> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  // Se marca primero, en la misma sentencia que comprueba, para no deshacer dos veces.
  const rows = await sql`
    UPDATE chat_acciones SET deshecha = TRUE
    WHERE id = ${id} AND deshecha = FALSE AND deshacer->>'tipo' <> 'ninguno'
    RETURNING deshacer
  `;
  const fila = rows[0] as { deshacer: Deshacer } | undefined;
  if (!fila) return false;

  let revertida = false;
  try {
    revertida = await revertir(fila.deshacer);
  } finally {
    // Si no se pudo revertir, la acción vuelve a estar disponible para reintentarlo.
    if (!revertida) await sql`UPDATE chat_acciones SET deshecha = FALSE WHERE id = ${id}`;
  }
  return revertida;
}

async function revertir(d: Deshacer): Promise<boolean> {
  switch (d.tipo) {
    case "borrar_libro":
      return borrarLibro(d.id);
    case "restaurar_libro":
      return (await restaurarLibro(d.libro, d.actualizado_en)) !== null;
    case "borrar_gasto":
      return borrarGasto(d.id);
    case "quitar_sensacion":
      return quitarSensacion(d.sensacion);
    case "ninguno":
      return false;
  }
}
