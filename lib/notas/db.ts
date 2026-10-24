import { obtenerSql, prepararEsquema } from "@/lib/core/db";
import type { Nota, TipoNota } from "./tipos";

const asegurarEsquema = prepararEsquema(async (sql) => {
  await sql`
        CREATE TABLE IF NOT EXISTS notas (
          id SERIAL PRIMARY KEY,
          tipo TEXT NOT NULL CHECK (tipo IN ('idea', 'investigar', 'articulo')),
          titulo TEXT NOT NULL,
          texto TEXT,
          hecha BOOLEAN NOT NULL DEFAULT FALSE,
          creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
          actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
});

/** Primero las pendientes; dentro de cada grupo, la última tocada arriba. */
export async function listarNotas(): Promise<Nota[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`SELECT * FROM notas ORDER BY hecha ASC, actualizado_en DESC`;
  return rows as Nota[];
}

export async function crearNota(data: { tipo: TipoNota; titulo: string; texto: string | null }): Promise<Nota> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    INSERT INTO notas (tipo, titulo, texto)
    VALUES (${data.tipo}, ${data.titulo}, ${data.texto})
    RETURNING *
  `;
  return rows[0] as Nota;
}

/** Cambia solo los campos presentes; `texto: null` lo vacía. */
export async function actualizarNota(
  id: number,
  cambios: Partial<Pick<Nota, "tipo" | "titulo" | "texto" | "hecha">>
): Promise<Nota | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    UPDATE notas SET
      tipo = COALESCE(${cambios.tipo ?? null}, tipo),
      titulo = COALESCE(${cambios.titulo ?? null}, titulo),
      texto = CASE WHEN ${"texto" in cambios}::boolean THEN ${cambios.texto ?? null}::text ELSE texto END,
      hecha = COALESCE(${cambios.hecha ?? null}, hecha),
      actualizado_en = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as Nota | undefined) ?? null;
}

export async function borrarNota(id: number): Promise<boolean> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`DELETE FROM notas WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
