import { obtenerSql, prepararEsquema } from "@/lib/core/db";
import type { EstadoLibro, Libro } from "./tipos";

const asegurarEsquema = prepararEsquema(async (sql) => {
  await sql`
        CREATE TABLE IF NOT EXISTS libros (
          id SERIAL PRIMARY KEY,
          open_library_key TEXT,
          titulo TEXT NOT NULL,
          autor TEXT,
          portada_url TEXT,
          estado TEXT NOT NULL DEFAULT 'quiero_leer',
          notas TEXT,
          creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
          actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
  await sql`ALTER TABLE libros ADD COLUMN IF NOT EXISTS pagina_actual INTEGER`;
  await sql`ALTER TABLE libros ADD COLUMN IF NOT EXISTS paginas_totales INTEGER`;
  await sql`ALTER TABLE libros ADD COLUMN IF NOT EXISTS fecha_inicio TIMESTAMPTZ`;
  await sql`ALTER TABLE libros ADD COLUMN IF NOT EXISTS valoracion SMALLINT CHECK (valoracion BETWEEN 1 AND 5)`;
  await sql`ALTER TABLE libros ADD COLUMN IF NOT EXISTS fecha_fin TIMESTAMPTZ`;
  // Los leídos antes de existir fecha_fin la toman de su última actualización.
  await sql`UPDATE libros SET fecha_fin = actualizado_en WHERE estado = 'leido' AND fecha_fin IS NULL`;
});

export async function listarLibros(estado?: EstadoLibro): Promise<Libro[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = estado
    ? await sql`SELECT * FROM libros WHERE estado = ${estado} ORDER BY creado_en DESC`
    : await sql`SELECT * FROM libros ORDER BY creado_en DESC`;
  return rows as Libro[];
}

export async function crearLibro(data: {
  open_library_key: string | null;
  titulo: string;
  autor: string | null;
  portada_url: string | null;
  estado: EstadoLibro;
  notas?: string | null;
  paginas_totales?: number | null;
}): Promise<Libro> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    INSERT INTO libros (
      open_library_key, titulo, autor, portada_url, estado, notas, paginas_totales,
      fecha_inicio, fecha_fin
    )
    VALUES (
      ${data.open_library_key}, ${data.titulo}, ${data.autor}, ${data.portada_url},
      ${data.estado}, ${data.notas ?? null}, ${data.paginas_totales ?? null},
      CASE WHEN ${data.estado}::text = 'leyendo' THEN now() END,
      CASE WHEN ${data.estado}::text = 'leido' THEN now() END
    )
    RETURNING *
  `;
  return rows[0] as Libro;
}

export async function actualizarLibro(
  id: number,
  data: {
    estado?: EstadoLibro;
    notas?: string | null;
    pagina_actual?: number | null;
    paginas_totales?: number | null;
    valoracion?: number | null;
  }
): Promise<Libro | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);

  // Las fechas salen solas del estado: fecha_inicio al empezar a leerlo por primera vez
  // (para el ritmo de páginas/día) y fecha_fin al terminarlo (se quita si deja de estar leído).
  const estado = data.estado ?? null;
  const rows = await sql`
    UPDATE libros
    SET
      estado = COALESCE(${estado}::text, estado),
      notas = COALESCE(${data.notas ?? null}, notas),
      pagina_actual = COALESCE(${data.pagina_actual ?? null}, pagina_actual),
      paginas_totales = COALESCE(${data.paginas_totales ?? null}, paginas_totales),
      valoracion = COALESCE(${data.valoracion ?? null}, valoracion),
      fecha_inicio = CASE WHEN ${estado}::text = 'leyendo' THEN COALESCE(fecha_inicio, now()) ELSE fecha_inicio END,
      fecha_fin = CASE
        WHEN ${estado}::text IS NULL THEN fecha_fin
        WHEN ${estado}::text = 'leido' THEN COALESCE(fecha_fin, now())
        ELSE NULL
      END,
      actualizado_en = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return (rows[0] as Libro | undefined) ?? null;
}

export async function obtenerLibro(id: number): Promise<Libro | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`SELECT * FROM libros WHERE id = ${id}`;
  return (rows[0] as Libro | undefined) ?? null;
}

export async function borrarLibro(id: number): Promise<boolean> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`DELETE FROM libros WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/** Deja un libro exactamente como estaba (incluidos campos a null): lo usa «Deshacer» del chat. */
/**
 * Devuelve un libro a como estaba. Con `siActualizadoEn`, solo si nadie lo ha tocado desde
 * entonces: deshacer un cambio antiguo del chat no debe pisar lo que el usuario ha hecho después.
 */
export async function restaurarLibro(libro: Libro, siActualizadoEn?: string): Promise<Libro | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    UPDATE libros
    SET estado = ${libro.estado}, notas = ${libro.notas}, pagina_actual = ${libro.pagina_actual},
        paginas_totales = ${libro.paginas_totales}, valoracion = ${libro.valoracion},
        fecha_inicio = ${libro.fecha_inicio}, fecha_fin = ${libro.fecha_fin}, actualizado_en = now()
    WHERE id = ${libro.id}
      AND (${siActualizadoEn ?? null}::timestamptz IS NULL
           OR date_trunc('milliseconds', actualizado_en) = ${siActualizadoEn ?? null}::timestamptz)
    RETURNING *
  `;
  return (rows[0] as Libro | undefined) ?? null;
}
