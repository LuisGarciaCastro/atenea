import { obtenerSql } from "@/lib/core/db";
import { asegurarEsquema } from "./schema";
import {
  type Persona,
  type Tema,
  type TemaCompleto,
  type TemaConConteo,
  type TemaRelacionado,
  type VideoDeTema,
} from "./tipos";

export async function obtenerTemaCompleto(slug: string): Promise<TemaCompleto | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);

  const temas = await sql`SELECT id, nombre, slug, descripcion, miniatura_url, resumen FROM temas WHERE slug = ${slug}`;
  const tema = temas[0] as Tema | undefined;
  if (!tema) return null;

  const [videos, personas, temasRelacionados] = await Promise.all([
    sql`
      SELECT
        v.id, v.youtube_id, v.titulo, v.canal, v.miniatura_url, v.fecha_publicacion,
        vt.contexto,
        (
          SELECT h.texto FROM highlights h
          WHERE h.video_id = v.id
          ORDER BY h.importancia DESC, h.inicio_seg ASC
          LIMIT 1
        ) AS highlight_destacado
      FROM video_temas vt
      JOIN videos v ON v.id = vt.video_id
      WHERE vt.tema_id = ${tema.id} AND v.estado = 'procesado'
      ORDER BY v.fecha_publicacion DESC NULLS LAST
    `,
    sql`
      SELECT DISTINCT p.id, p.nombre, p.slug, p.descripcion, p.foto_url, p.canal_id
      FROM video_personas vp
      JOIN video_temas vt ON vt.video_id = vp.video_id
      JOIN videos v ON v.id = vp.video_id AND v.estado = 'procesado'
      JOIN personas p ON p.id = vp.persona_id
      WHERE vt.tema_id = ${tema.id}
      ORDER BY p.nombre ASC
    `,
    sql`
      SELECT t.id, t.nombre, t.slug, t.descripcion, t.miniatura_url, t.resumen, tr.peso
      FROM tema_relaciones tr
      JOIN temas t ON t.id = (CASE WHEN tr.tema_id_a = ${tema.id} THEN tr.tema_id_b ELSE tr.tema_id_a END)
      WHERE tr.tema_id_a = ${tema.id} OR tr.tema_id_b = ${tema.id}
      ORDER BY tr.peso DESC
      LIMIT 8
    `,
  ]);

  return {
    ...tema,
    videos: videos as VideoDeTema[],
    personas: personas as Persona[],
    temasRelacionados: temasRelacionados as TemaRelacionado[],
  };
}

/**
 * Los temas con algún vídeo procesado y su nº de vídeos — base para
 * la nube de chips de /contenido/temas (tamaño/opacidad según peso).
 */
export async function obtenerTemasConConteo(): Promise<TemaConConteo[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    SELECT t.id, t.nombre, t.slug, t.descripcion, t.miniatura_url, t.resumen, COUNT(DISTINCT v.id)::int AS "videoCount"
    FROM temas t
    LEFT JOIN video_temas vt ON vt.tema_id = t.id
    LEFT JOIN videos v ON v.id = vt.video_id AND v.estado = 'procesado'
    GROUP BY t.id
    HAVING COUNT(DISTINCT v.id) > 0
    ORDER BY "videoCount" DESC, t.nombre ASC
  `;
  return rows as TemaConConteo[];
}
