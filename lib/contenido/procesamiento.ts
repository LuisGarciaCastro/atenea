import { obtenerSql, type ClienteSql } from "@/lib/core/db";
import { asegurarEsquema } from "./schema";
import {
  type Persona,
  type PersonaEntrada,
  type ProcesamientoVideoEntrada,
  type Tema,
  type TemaEntrada,
  type Video,
} from "./tipos";
import { obtenerVideo } from "./videos";

function slugify(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function esViolacionUnicidad(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505"
  );
}

async function buscarOCrearTema(sql: ClienteSql, input: TemaEntrada): Promise<Tema> {
  const slugBase = slugify(input.nombre) || `tema-${Date.now().toString(36)}`;
  const descripcion = input.descripcion ?? null;
  const resumen = input.resumen ?? null;
  try {
    const rows = await sql`
      INSERT INTO temas (nombre, slug, descripcion, resumen)
      VALUES (${input.nombre}, ${slugBase}, ${descripcion}, ${resumen})
      ON CONFLICT (LOWER(nombre)) DO UPDATE SET
        descripcion = COALESCE(temas.descripcion, EXCLUDED.descripcion),
        resumen = COALESCE(EXCLUDED.resumen, temas.resumen)
      RETURNING id, nombre, slug, descripcion, miniatura_url, resumen
    `;
    return rows[0] as Tema;
  } catch (error) {
    if (!esViolacionUnicidad(error)) throw error;
    // El nombre no coincidía con ninguno existente, pero el slug generado sí
    // choca con el de un tema con nombre distinto (p.ej. acentos/variantes).
    const slugUnico = `${slugBase}-${Date.now().toString(36)}`;
    const rows = await sql`
      INSERT INTO temas (nombre, slug, descripcion, resumen)
      VALUES (${input.nombre}, ${slugUnico}, ${descripcion}, ${resumen})
      ON CONFLICT (LOWER(nombre)) DO UPDATE SET
        descripcion = COALESCE(temas.descripcion, EXCLUDED.descripcion),
        resumen = COALESCE(EXCLUDED.resumen, temas.resumen)
      RETURNING id, nombre, slug, descripcion, miniatura_url, resumen
    `;
    return rows[0] as Tema;
  }
}

async function buscarOCrearPersona(sql: ClienteSql, input: PersonaEntrada): Promise<Persona> {
  const slugBase = slugify(input.nombre) || `persona-${Date.now().toString(36)}`;
  const descripcion = input.descripcion ?? null;
  const fotoUrl = input.foto_url ?? null;
  const canalId = input.canal_id ?? null;
  try {
    const rows = await sql`
      INSERT INTO personas (nombre, slug, descripcion, foto_url, canal_id)
      VALUES (${input.nombre}, ${slugBase}, ${descripcion}, ${fotoUrl}, ${canalId})
      ON CONFLICT (LOWER(nombre)) DO UPDATE SET
        descripcion = COALESCE(personas.descripcion, EXCLUDED.descripcion),
        foto_url = COALESCE(personas.foto_url, EXCLUDED.foto_url),
        canal_id = COALESCE(personas.canal_id, EXCLUDED.canal_id)
      RETURNING id, nombre, slug, descripcion, foto_url, canal_id
    `;
    return rows[0] as Persona;
  } catch (error) {
    if (!esViolacionUnicidad(error)) throw error;
    const slugUnico = `${slugBase}-${Date.now().toString(36)}`;
    const rows = await sql`
      INSERT INTO personas (nombre, slug, descripcion, foto_url, canal_id)
      VALUES (${input.nombre}, ${slugUnico}, ${descripcion}, ${fotoUrl}, ${canalId})
      ON CONFLICT (LOWER(nombre)) DO UPDATE SET
        descripcion = COALESCE(personas.descripcion, EXCLUDED.descripcion),
        foto_url = COALESCE(personas.foto_url, EXCLUDED.foto_url),
        canal_id = COALESCE(personas.canal_id, EXCLUDED.canal_id)
      RETURNING id, nombre, slug, descripcion, foto_url, canal_id
    `;
    return rows[0] as Persona;
  }
}

/** Deja una sola entrada por id (la primera, con su contexto): dos nombres pueden acabar en el mismo tema. */
function unicosPorId<T extends { id: number }>(filas: { item: T; contexto: string | null }[]) {
  const vistos = new Set<number>();
  return filas.filter(({ item }) => !vistos.has(item.id) && vistos.add(item.id));
}

/**
 * Guarda el resultado de procesar un vídeo. Primero se crean o recuperan sus temas
 * y personas (upserts: repetirlos no cambia nada); después, en una sola
 * transacción, se reemplazan segmentos, highlights y vínculos, y se recalculan las
 * relaciones entre temas y sus miniaturas. Si algo falla, el vídeo queda como
 * estaba. Se recalculan tanto los temas nuevos como los que el vídeo tenía antes,
 * para que un tema que deja de aparecer pierda también su peso y su miniatura.
 */
export async function guardarProcesamientoVideo(id: number, data: ProcesamientoVideoEntrada): Promise<Video | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);

  const video = await obtenerVideo(id);
  if (!video) return null;

  const temas = unicosPorId(
    await Promise.all(
      data.temas.map(async (t) => ({ item: await buscarOCrearTema(sql, t), contexto: t.contexto ?? null }))
    )
  );
  const personas = unicosPorId(
    await Promise.all(
      data.personas.map(async (p) => ({ item: await buscarOCrearPersona(sql, p), contexto: p.contexto ?? null }))
    )
  );
  const anteriores = (await sql`SELECT tema_id FROM video_temas WHERE video_id = ${id}`) as { tema_id: number }[];
  const afectados = [...new Set([...anteriores.map((t) => t.tema_id), ...temas.map((t) => t.item.id)])];

  const { segmentos, highlights } = data;
  const resultados = await sql.transaction([
    sql`DELETE FROM transcripcion_segmentos WHERE video_id = ${id}`,
    sql`
      INSERT INTO transcripcion_segmentos (video_id, orden, inicio_seg, fin_seg, texto)
      SELECT ${id}, s.orden - 1, s.inicio, s.fin, s.texto
      FROM unnest(
        ${segmentos.map((x) => x.inicio_seg)}::numeric[],
        ${segmentos.map((x) => x.fin_seg)}::numeric[],
        ${segmentos.map((x) => x.texto)}::text[]
      ) WITH ORDINALITY AS s(inicio, fin, texto, orden)
    `,
    sql`DELETE FROM highlights WHERE video_id = ${id}`,
    sql`
      INSERT INTO highlights (video_id, inicio_seg, fin_seg, texto, tipo, importancia)
      SELECT ${id}, h.inicio, h.fin, h.texto, h.tipo, h.importancia
      FROM unnest(
        ${highlights.map((x) => x.inicio_seg)}::numeric[],
        ${highlights.map((x) => x.fin_seg)}::numeric[],
        ${highlights.map((x) => x.texto)}::text[],
        ${highlights.map((x) => x.tipo)}::text[],
        ${highlights.map((x) => x.importancia)}::smallint[]
      ) AS h(inicio, fin, texto, tipo, importancia)
    `,
    sql`DELETE FROM video_temas WHERE video_id = ${id}`,
    sql`
      INSERT INTO video_temas (video_id, tema_id, contexto)
      SELECT ${id}, t.tema_id, t.contexto
      FROM unnest(${temas.map((t) => t.item.id)}::int[], ${temas.map((t) => t.contexto)}::text[]) AS t(tema_id, contexto)
    `,
    sql`DELETE FROM video_personas WHERE video_id = ${id}`,
    sql`
      INSERT INTO video_personas (video_id, persona_id, contexto)
      SELECT ${id}, p.persona_id, p.contexto
      FROM unnest(${personas.map((p) => p.item.id)}::int[], ${personas.map((p) => p.contexto)}::text[]) AS p(persona_id, contexto)
    `,
    // Relación entre dos temas = nº de vídeos en que coinciden; se recuenta desde cero.
    sql`
      DELETE FROM tema_relaciones r
      WHERE (r.tema_id_a = ANY(${afectados}::int[]) OR r.tema_id_b = ANY(${afectados}::int[]))
        AND NOT EXISTS (
          SELECT 1 FROM video_temas x JOIN video_temas y ON x.video_id = y.video_id
          WHERE x.tema_id = r.tema_id_a AND y.tema_id = r.tema_id_b
        )
    `,
    sql`
      INSERT INTO tema_relaciones (tema_id_a, tema_id_b, peso)
      SELECT x.tema_id, y.tema_id, COUNT(*)
      FROM video_temas x JOIN video_temas y ON x.video_id = y.video_id AND x.tema_id < y.tema_id
      WHERE x.tema_id = ANY(${afectados}::int[]) OR y.tema_id = ANY(${afectados}::int[])
      GROUP BY x.tema_id, y.tema_id
      ON CONFLICT (tema_id_a, tema_id_b) DO UPDATE SET peso = EXCLUDED.peso
    `,
    // Miniatura de un tema = la del vídeo más reciente que lo toca.
    sql`
      UPDATE temas t
      SET miniatura_url = (
        SELECT v.miniatura_url
        FROM video_temas vt JOIN videos v ON v.id = vt.video_id
        WHERE vt.tema_id = t.id AND v.miniatura_url IS NOT NULL
        ORDER BY v.fecha_publicacion DESC NULLS LAST
        LIMIT 1
      )
      WHERE t.id = ANY(${afectados}::int[])
    `,
    sql`
      UPDATE videos
      SET resumen = ${data.resumen}, estado = 'procesado', error_motivo = NULL,
          fecha_procesado = now(), actualizado_en = now()
      WHERE id = ${id}
      RETURNING *
    `,
  ]);
  return (resultados.at(-1) as Video[])[0];
}
