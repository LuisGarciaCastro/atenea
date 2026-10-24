import { obtenerSql } from "@/lib/core/db";
import { asegurarEsquema } from "./schema";
import {
  type Persona,
  type PersonaCompleta,
  type PersonaConConteo,
  type PersonaRelacionada,
  type Tema,
  type VideoDePersona,
} from "./tipos";

export async function obtenerPersonaCompleta(slug: string): Promise<PersonaCompleta | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);

  const personas = await sql`
    SELECT id, nombre, slug, descripcion, foto_url, canal_id FROM personas WHERE slug = ${slug}
  `;
  const persona = personas[0] as Persona | undefined;
  if (!persona) return null;

  const [videos, temas, personasRelacionadas] = await Promise.all([
    sql`
      SELECT v.id, v.youtube_id, v.titulo, v.canal, v.miniatura_url, v.fecha_publicacion, vp.contexto
      FROM video_personas vp
      JOIN videos v ON v.id = vp.video_id
      WHERE vp.persona_id = ${persona.id} AND v.estado = 'procesado'
      ORDER BY v.fecha_publicacion DESC NULLS LAST
    `,
    sql`
      SELECT DISTINCT t.id, t.nombre, t.slug, t.descripcion, t.miniatura_url, t.resumen
      FROM video_temas vt
      JOIN video_personas vp ON vp.video_id = vt.video_id
      JOIN videos v ON v.id = vt.video_id AND v.estado = 'procesado'
      JOIN temas t ON t.id = vt.tema_id
      WHERE vp.persona_id = ${persona.id}
      ORDER BY t.nombre ASC
    `,
    sql`
      SELECT p2.id, p2.nombre, p2.slug, p2.descripcion, p2.foto_url, p2.canal_id,
        COUNT(DISTINCT vp2.video_id)::int AS peso
      FROM video_personas vp1
      JOIN video_personas vp2 ON vp2.video_id = vp1.video_id AND vp2.persona_id != vp1.persona_id
      JOIN videos v ON v.id = vp1.video_id AND v.estado = 'procesado'
      JOIN personas p2 ON p2.id = vp2.persona_id
      WHERE vp1.persona_id = ${persona.id}
      GROUP BY p2.id
      ORDER BY peso DESC, p2.nombre ASC
      LIMIT 8
    `,
  ]);

  return {
    ...persona,
    videos: videos as VideoDePersona[],
    temas: temas as Tema[],
    personasRelacionadas: personasRelacionadas as PersonaRelacionada[],
  };
}

/**
 * Todas las personas con el nº de vídeos procesados en los que aparecen —
 * base para la cuadrícula de tarjetas de /contenido/personas.
 */
export async function obtenerPersonasConConteo(): Promise<PersonaConConteo[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    SELECT p.id, p.nombre, p.slug, p.descripcion, p.foto_url, p.canal_id, COUNT(DISTINCT v.id)::int AS "videoCount"
    FROM personas p
    LEFT JOIN video_personas vp ON vp.persona_id = p.id
    LEFT JOIN videos v ON v.id = vp.video_id AND v.estado = 'procesado'
    GROUP BY p.id
    ORDER BY "videoCount" DESC, p.nombre ASC
  `;
  return rows as PersonaConConteo[];
}
