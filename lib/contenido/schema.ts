import { prepararEsquema } from "@/lib/core/db";

export const asegurarEsquema = prepararEsquema(async (sql) => {
  await sql`
        CREATE TABLE IF NOT EXISTS videos (
          id SERIAL PRIMARY KEY,
          youtube_id TEXT NOT NULL UNIQUE,
          titulo TEXT NOT NULL,
          canal TEXT,
          url TEXT NOT NULL,
          duracion_seg INTEGER,
          fecha_publicacion TIMESTAMPTZ,
          fecha_procesado TIMESTAMPTZ,
          miniatura_url TEXT,
          resumen TEXT,
          estado TEXT NOT NULL DEFAULT 'pendiente',
          error_motivo TEXT,
          issue_number INTEGER,
          creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
          actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
  await sql`
        CREATE TABLE IF NOT EXISTS transcripcion_segmentos (
          id SERIAL PRIMARY KEY,
          video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
          orden INTEGER NOT NULL,
          inicio_seg NUMERIC NOT NULL,
          fin_seg NUMERIC NOT NULL,
          texto TEXT NOT NULL
        )
      `;
  await sql`
        CREATE INDEX IF NOT EXISTS idx_segmentos_video ON transcripcion_segmentos(video_id, orden)
      `;
  await sql`
        CREATE TABLE IF NOT EXISTS highlights (
          id SERIAL PRIMARY KEY,
          video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
          inicio_seg NUMERIC NOT NULL,
          fin_seg NUMERIC,
          texto TEXT NOT NULL,
          tipo TEXT NOT NULL,
          importancia SMALLINT NOT NULL CHECK (importancia BETWEEN 1 AND 5),
          creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
  await sql`
        CREATE INDEX IF NOT EXISTS idx_highlights_video ON highlights(video_id)
      `;
  await sql`
        CREATE TABLE IF NOT EXISTS temas (
          id SERIAL PRIMARY KEY,
          nombre TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          descripcion TEXT,
          creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
  await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_temas_nombre_lower ON temas (LOWER(nombre))
      `;
  await sql`ALTER TABLE temas ADD COLUMN IF NOT EXISTS miniatura_url TEXT`;
  await sql`ALTER TABLE temas ADD COLUMN IF NOT EXISTS resumen TEXT`;
  await sql`
        CREATE TABLE IF NOT EXISTS personas (
          id SERIAL PRIMARY KEY,
          nombre TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          descripcion TEXT,
          foto_url TEXT,
          creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
  await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_nombre_lower ON personas (LOWER(nombre))
      `;
  await sql`ALTER TABLE personas ADD COLUMN IF NOT EXISTS canal_id TEXT`;
  await sql`
        CREATE INDEX IF NOT EXISTS idx_personas_canal_id ON personas (canal_id)
        WHERE canal_id IS NOT NULL
      `;
  await sql`
        CREATE TABLE IF NOT EXISTS video_temas (
          video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
          tema_id INTEGER NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
          contexto TEXT,
          PRIMARY KEY (video_id, tema_id)
        )
      `;
  await sql`
        CREATE TABLE IF NOT EXISTS video_personas (
          video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
          persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
          contexto TEXT,
          PRIMARY KEY (video_id, persona_id)
        )
      `;
  await sql`
        CREATE TABLE IF NOT EXISTS tema_relaciones (
          tema_id_a INTEGER NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
          tema_id_b INTEGER NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
          peso INTEGER NOT NULL DEFAULT 0,
          motivo TEXT,
          PRIMARY KEY (tema_id_a, tema_id_b),
          CHECK (tema_id_a < tema_id_b)
        )
      `;
});
