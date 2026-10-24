import { obtenerSql, type ClienteSql } from "@/lib/core/db";
import { asegurarEsquema } from "./schema";
import {
  type Highlight,
  type MetadatosVideoEntrada,
  type PersonaConContexto,
  type Segmento,
  type TemaConContexto,
  type Video,
  type VideoCompleto,
  type VideoConHighlight,
  type VideoRelacionado,
} from "./tipos";

export async function crearOActualizarVideoPendiente(data: MetadatosVideoEntrada): Promise<Video> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    INSERT INTO videos (
      youtube_id, titulo, canal, url, duracion_seg, fecha_publicacion,
      miniatura_url, issue_number, estado
    )
    VALUES (
      ${data.youtube_id}, ${data.titulo}, ${data.canal}, ${data.url},
      ${data.duracion_seg}, ${data.fecha_publicacion}, ${data.miniatura_url},
      ${data.issue_number}, 'pendiente'
    )
    ON CONFLICT (youtube_id) DO UPDATE SET
      titulo = EXCLUDED.titulo,
      canal = EXCLUDED.canal,
      url = EXCLUDED.url,
      duracion_seg = EXCLUDED.duracion_seg,
      fecha_publicacion = EXCLUDED.fecha_publicacion,
      miniatura_url = EXCLUDED.miniatura_url,
      issue_number = EXCLUDED.issue_number,
      -- Un vídeo ya procesado sigue visible mientras se reprocesa: si el reproceso falla, no se pierde.
      estado = CASE WHEN videos.estado = 'procesado' THEN videos.estado ELSE 'pendiente' END,
      error_motivo = NULL,
      actualizado_en = now()
    RETURNING *
  `;
  return rows[0] as Video;
}

export async function obtenerVideo(id: number): Promise<Video | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`SELECT * FROM videos WHERE id = ${id}`;
  return (rows[0] as Video | undefined) ?? null;
}

export async function marcarVideoError(id: number, motivo: string): Promise<Video | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    UPDATE videos
    SET estado = 'error', error_motivo = ${motivo}, actualizado_en = now()
    WHERE id = ${id} AND estado <> 'procesado'
    RETURNING *
  `;
  if (rows.length > 0) return rows[0] as Video;
  // Falló un reproceso: el vídeo conserva lo que ya tenía.
  return obtenerVideo(id);
}

export async function obtenerVideosProcesados(): Promise<VideoConHighlight[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    SELECT v.*,
      (
        SELECT h.texto FROM highlights h
        WHERE h.video_id = v.id
        ORDER BY h.importancia DESC, h.inicio_seg ASC
        LIMIT 1
      ) AS highlight_destacado,
      (SELECT COUNT(*)::int FROM highlights h WHERE h.video_id = v.id) AS highlight_count,
      (
        SELECT t.nombre FROM video_temas vt
        JOIN temas t ON t.id = vt.tema_id
        WHERE vt.video_id = v.id
        ORDER BY t.nombre ASC
        LIMIT 1
      ) AS tema_principal
    FROM videos v
    WHERE v.estado = 'procesado'
    ORDER BY v.fecha_procesado DESC
  `;
  return rows as VideoConHighlight[];
}

/** Nº total de highlights guardados en vídeos procesados — usado en las
 * cabeceras de resumen de Conocimiento. */
export async function contarHighlightsTotales(): Promise<number> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    SELECT COUNT(*)::int AS total
    FROM highlights h
    JOIN videos v ON v.id = h.video_id
    WHERE v.estado = 'procesado'
  `;
  return (rows[0] as { total: number }).total;
}

async function obtenerVideoRelacionados(sql: ClienteSql, videoId: number): Promise<VideoRelacionado[]> {
  const rows = await sql`
    WITH compartidos AS (
      SELECT vt2.video_id, COUNT(*) AS puntuacion
      FROM video_temas vt1
      JOIN video_temas vt2 ON vt2.tema_id = vt1.tema_id AND vt2.video_id != vt1.video_id
      WHERE vt1.video_id = ${videoId}
      GROUP BY vt2.video_id

      UNION ALL

      SELECT vp2.video_id, COUNT(*) AS puntuacion
      FROM video_personas vp1
      JOIN video_personas vp2 ON vp2.persona_id = vp1.persona_id AND vp2.video_id != vp1.video_id
      WHERE vp1.video_id = ${videoId}
      GROUP BY vp2.video_id
    )
    SELECT v.id, v.youtube_id, v.titulo, v.canal, v.miniatura_url, SUM(c.puntuacion)::int AS puntuacion
    FROM compartidos c
    JOIN videos v ON v.id = c.video_id
    WHERE v.estado = 'procesado'
    GROUP BY v.id
    ORDER BY puntuacion DESC, v.fecha_procesado DESC
    LIMIT 6
  `;
  return rows as VideoRelacionado[];
}

export async function obtenerVideoCompleto(youtubeId: string): Promise<VideoCompleto | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);

  const videos = await sql`SELECT * FROM videos WHERE youtube_id = ${youtubeId}`;
  const video = videos[0] as Video | undefined;
  if (!video) return null;

  const [segmentos, highlights, temas, personas, relacionados] = await Promise.all([
    sql`
      SELECT inicio_seg, fin_seg, texto FROM transcripcion_segmentos
      WHERE video_id = ${video.id} ORDER BY orden ASC
    `,
    sql`
      SELECT id, inicio_seg, fin_seg, texto, tipo, importancia FROM highlights
      WHERE video_id = ${video.id} ORDER BY inicio_seg ASC
    `,
    sql`
      SELECT t.id, t.nombre, t.slug, t.descripcion, t.miniatura_url, t.resumen, vt.contexto
      FROM video_temas vt JOIN temas t ON t.id = vt.tema_id
      WHERE vt.video_id = ${video.id} ORDER BY t.nombre ASC
    `,
    sql`
      SELECT p.id, p.nombre, p.slug, p.descripcion, p.foto_url, p.canal_id, vp.contexto
      FROM video_personas vp JOIN personas p ON p.id = vp.persona_id
      WHERE vp.video_id = ${video.id} ORDER BY p.nombre ASC
    `,
    obtenerVideoRelacionados(sql, video.id),
  ]);

  return {
    ...video,
    segmentos: segmentos as Segmento[],
    highlights: highlights as Highlight[],
    temas: temas as TemaConContexto[],
    personas: personas as PersonaConContexto[],
    relacionados,
  };
}
