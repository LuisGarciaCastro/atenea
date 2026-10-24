import { type ClienteSql, obtenerSql, prepararEsquema } from "@/lib/core/db";
import enlacesDelRepo from "@/contenido/guardados.json";
import { type Guardado, type GuardadoEntrada } from "./tipos";

let repoSynced: Promise<void> | null = null;

const asegurarEsquema = prepararEsquema(async (sql) => {
  await sql`
        CREATE TABLE IF NOT EXISTS guardados (
          id SERIAL PRIMARY KEY,
          url TEXT NOT NULL UNIQUE,
          fuente TEXT NOT NULL,
          titulo TEXT,
          autor TEXT,
          nota TEXT,
          issue_number INTEGER,
          creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
  // Borrado lógico: si la fila desapareciera, la importación de guardados.json la volvería a crear.
  await sql`ALTER TABLE guardados ADD COLUMN IF NOT EXISTS borrado_en TIMESTAMPTZ`;
});

/** Valida que sea http(s) y devuelve la URL normalizada, o null si no es válida. */
function normalizarUrl(valor: string): URL | null {
  try {
    const url = new URL(valor.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Deduce la fuente (x, youtube, ...) a partir del dominio. */
function detectarFuente(url: URL): string {
  const host = url.hostname.replace(/^(www|mobile|m)\./, "");
  if (host === "x.com" || host === "twitter.com") return "x";
  if (host === "youtu.be" || host === "youtube.com") return "youtube";
  return host;
}

/**
 * El agente no tiene acceso a la base de datos: guarda los enlaces que el usuario le
 * pasa en `contenido/guardados.json` (commit a main). Aquí se importan a la
 * tabla los que falten, en una sola sentencia; los ya existentes (también los
 * borrados) no se tocan.
 */
async function sincronizarDesdeRepo(sql: ClienteSql): Promise<void> {
  if (!repoSynced) {
    repoSynced = (async () => {
      const filas = (enlacesDelRepo as GuardadoEntrada[]).flatMap((e) => {
        const url = normalizarUrl(e.url);
        return url ? [{ ...e, url: url.toString(), fuente: detectarFuente(url) }] : [];
      });
      if (filas.length === 0) return;
      await sql`
        INSERT INTO guardados (url, fuente, titulo, autor, nota, issue_number)
        SELECT * FROM unnest(
          ${filas.map((f) => f.url)}::text[], ${filas.map((f) => f.fuente)}::text[],
          ${filas.map((f) => f.titulo ?? null)}::text[], ${filas.map((f) => f.autor ?? null)}::text[],
          ${filas.map((f) => f.nota ?? null)}::text[], ${filas.map((f) => f.issue_number ?? null)}::int[]
        )
        ON CONFLICT (url) DO NOTHING
      `;
    })().catch((err) => {
      repoSynced = null;
      throw err;
    });
  }
  await repoSynced;
}

export async function listarGuardados(): Promise<Guardado[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  await sincronizarDesdeRepo(sql);
  const rows = await sql`SELECT * FROM guardados WHERE borrado_en IS NULL ORDER BY creado_en DESC`;
  return rows as Guardado[];
}

/** Guarda un enlace sin procesarlo. Si ya existe (aunque se borrara), lo recupera y actualiza los campos que se envíen. */
export async function guardarEnlace(input: GuardadoEntrada): Promise<Guardado | null> {
  const url = normalizarUrl(input.url);
  if (!url) return null;
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    INSERT INTO guardados (url, fuente, titulo, autor, nota, issue_number)
    VALUES (${url.toString()}, ${detectarFuente(url)}, ${input.titulo ?? null}, ${input.autor ?? null},
            ${input.nota ?? null}, ${input.issue_number ?? null})
    ON CONFLICT (url) DO UPDATE SET
      titulo = COALESCE(EXCLUDED.titulo, guardados.titulo),
      autor = COALESCE(EXCLUDED.autor, guardados.autor),
      nota = COALESCE(EXCLUDED.nota, guardados.nota),
      issue_number = COALESCE(EXCLUDED.issue_number, guardados.issue_number),
      borrado_en = NULL
    RETURNING *
  `;
  return rows[0] as Guardado;
}

export async function borrarGuardado(id: number): Promise<boolean> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    UPDATE guardados SET borrado_en = now() WHERE id = ${id} AND borrado_en IS NULL RETURNING id
  `;
  return rows.length > 0;
}
