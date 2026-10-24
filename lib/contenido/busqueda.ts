import { obtenerSql } from "@/lib/core/db";
import { asegurarEsquema } from "./schema";
import { type ResultadoBusqueda } from "./tipos";

/**
 * Búsqueda por ILIKE sobre título/resumen/transcripción/nombre. Con el
 * volumen actual del corpus es suficiente; si crece, revisar pg_trgm o
 * tsvector en vez de escanear transcripcion_segmentos completa.
 */
export async function buscarContenido(query: string): Promise<ResultadoBusqueda[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);

  const termino = query.trim().slice(0, 100);
  // Con una sola letra el ILIKE recorre todas las transcripciones para devolver ruido.
  if (termino.length < 2) return [];
  // «%» y «_» son comodines en ILIKE: se escapan para buscarlos tal cual.
  const patron = `%${termino.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  const [videosPorTexto, videosPorTranscripcion, temas, personas] = await Promise.all([
    sql`
      SELECT id, youtube_id, titulo, resumen, miniatura_url
      FROM videos
      WHERE estado = 'procesado' AND (titulo ILIKE ${patron} OR resumen ILIKE ${patron})
      ORDER BY fecha_publicacion DESC NULLS LAST
      LIMIT 8
    `,
    sql`
      SELECT * FROM (
        SELECT DISTINCT ON (v.id) v.id, v.youtube_id, v.titulo, v.miniatura_url, v.fecha_publicacion,
          ts.texto AS extracto
        FROM transcripcion_segmentos ts
        JOIN videos v ON v.id = ts.video_id
        WHERE v.estado = 'procesado' AND ts.texto ILIKE ${patron}
        ORDER BY v.id, ts.orden ASC
      ) coincidencias
      ORDER BY fecha_publicacion DESC NULLS LAST
      LIMIT 8
    `,
    sql`
      SELECT id, nombre, slug, descripcion FROM temas
      WHERE nombre ILIKE ${patron} OR descripcion ILIKE ${patron}
      ORDER BY nombre ASC
      LIMIT 8
    `,
    sql`
      SELECT id, nombre, slug, descripcion, foto_url FROM personas
      WHERE nombre ILIKE ${patron} OR descripcion ILIKE ${patron}
      ORDER BY nombre ASC
      LIMIT 8
    `,
  ]);

  const resultados = new Map<string, ResultadoBusqueda>();

  for (const v of videosPorTexto as {
    id: number;
    youtube_id: string;
    titulo: string;
    resumen: string | null;
    miniatura_url: string | null;
  }[]) {
    resultados.set(`video-${v.id}`, {
      tipo: "video",
      id: v.id,
      slug: v.youtube_id,
      titulo: v.titulo,
      extracto: v.resumen,
      imagenUrl: v.miniatura_url,
    });
  }

  for (const v of videosPorTranscripcion as {
    id: number;
    youtube_id: string;
    titulo: string;
    miniatura_url: string | null;
    extracto: string;
  }[]) {
    const clave = `video-${v.id}`;
    if (resultados.has(clave)) continue;
    resultados.set(clave, {
      tipo: "video",
      id: v.id,
      slug: v.youtube_id,
      titulo: v.titulo,
      extracto: v.extracto,
      imagenUrl: v.miniatura_url,
    });
  }

  for (const t of temas as { id: number; nombre: string; slug: string; descripcion: string | null }[]) {
    resultados.set(`tema-${t.id}`, {
      tipo: "tema",
      id: t.id,
      slug: t.slug,
      titulo: t.nombre,
      extracto: t.descripcion,
      imagenUrl: null,
    });
  }

  for (const p of personas as {
    id: number;
    nombre: string;
    slug: string;
    descripcion: string | null;
    foto_url: string | null;
  }[]) {
    resultados.set(`persona-${p.id}`, {
      tipo: "persona",
      id: p.id,
      slug: p.slug,
      titulo: p.nombre,
      extracto: p.descripcion,
      imagenUrl: p.foto_url,
    });
  }

  return Array.from(resultados.values());
}
