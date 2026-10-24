import { obtenerSql, prepararEsquema } from "@/lib/core/db";
import { type CategoriaGasto, type EstadoGasto, type Gasto } from "./tipos";

const asegurarEsquema = prepararEsquema(
  (sql) => sql`
      CREATE TABLE IF NOT EXISTS gastos (
        id SERIAL PRIMARY KEY,
        texto_original TEXT NOT NULL,
        importe NUMERIC,
        categoria TEXT,
        descripcion TEXT,
        estado TEXT NOT NULL DEFAULT 'pendiente_categorizar',
        fecha TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
);

export async function crearGastoPendiente(textoOriginal: string): Promise<Gasto> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    INSERT INTO gastos (texto_original, estado)
    VALUES (${textoOriginal}, 'pendiente_categorizar')
    RETURNING *
  `;
  return rows[0] as Gasto;
}

/**
 * Gasto apuntado a mano desde la app. Con categoría queda ya categorizado;
 * sin ella se deja pendiente para que el agente la decida en su pasada.
 */
export async function crearGasto(data: {
  importe: number;
  categoria: CategoriaGasto | null;
  descripcion: string | null;
}): Promise<Gasto> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const textoOriginal = [data.descripcion, `${data.importe}€`].filter(Boolean).join(" ");
  const estado: EstadoGasto = data.categoria ? "categorizado" : "pendiente_categorizar";
  const rows = await sql`
    INSERT INTO gastos (texto_original, importe, categoria, descripcion, estado)
    VALUES (${textoOriginal}, ${data.importe}, ${data.categoria}, ${data.descripcion}, ${estado})
    RETURNING *
  `;
  return rows[0] as Gasto;
}

export async function listarGastosPendientes(): Promise<Gasto[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    SELECT * FROM gastos WHERE estado = 'pendiente_categorizar' ORDER BY fecha ASC
  `;
  return rows as Gasto[];
}

export async function listarGastos(desde?: Date): Promise<Gasto[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = desde
    ? await sql`SELECT * FROM gastos WHERE fecha >= ${desde.toISOString()} ORDER BY fecha DESC`
    : await sql`SELECT * FROM gastos ORDER BY fecha DESC`;
  return rows as Gasto[];
}

export async function obtenerGasto(id: number): Promise<Gasto | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`SELECT * FROM gastos WHERE id = ${id}`;
  return (rows[0] as Gasto | undefined) ?? null;
}

export async function borrarGasto(id: number): Promise<boolean> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`DELETE FROM gastos WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function actualizarGasto(
  id: number,
  data: {
    importe?: number | null;
    categoria?: string | null;
    descripcion?: string | null;
    estado?: EstadoGasto;
  }
): Promise<Gasto | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    UPDATE gastos
    SET
      importe = COALESCE(${data.importe ?? null}, importe),
      categoria = COALESCE(${data.categoria ?? null}, categoria),
      descripcion = COALESCE(${data.descripcion ?? null}, descripcion),
      -- Con categoría e importe el gasto ya está categorizado: si no, no sumaría en los totales y
      -- la siguiente pasada del agente pisaría la corrección del usuario.
      estado = COALESCE(
        ${data.estado ?? null},
        CASE WHEN COALESCE(${data.categoria ?? null}, categoria) IS NOT NULL
              AND COALESCE(${data.importe ?? null}::numeric, importe) IS NOT NULL
          THEN 'categorizado' END,
        estado
      )
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as Gasto | undefined) ?? null;
}
