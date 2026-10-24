import { obtenerSql, prepararEsquema } from "@/lib/core/db";
import type { DatosCoach } from "./tipos";

const asegurarEsquema = prepararEsquema(async (sql) => {
  await sql`
        CREATE TABLE IF NOT EXISTS coach_dias (
          fecha DATE PRIMARY KEY,
          datos JSONB NOT NULL,
          actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
  await sql`
        CREATE TABLE IF NOT EXISTS coach_credenciales (
          proveedor TEXT PRIMARY KEY,
          datos JSONB NOT NULL,
          actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
});

/**
 * Un día por fecha: si la tarea se repite el mismo día, sustituye al anterior. Las sensaciones
 * del chat de los dos últimos días que estén en el último informe y no en el nuevo se conservan:
 * El usuario puede contarlas mientras la tarea trabaja con el informe que leyó al empezar.
 */
export async function guardarDia(fecha: string, datos: DatosCoach): Promise<void> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  await sql`
    WITH nuevo AS (SELECT ${JSON.stringify(datos)}::jsonb AS d),
    perdidas AS (
      SELECT COALESCE(jsonb_agg(s), '[]'::jsonb) AS lista
      FROM coach_dias c, nuevo,
           jsonb_array_elements(COALESCE(c.datos #> '{cuaderno,sensaciones}', '[]'::jsonb)) s
      WHERE c.fecha = (SELECT MAX(fecha) FROM coach_dias)
        AND s->>'fuente' = 'chat'
        AND s->>'date' >= to_char(${fecha}::date - 2, 'YYYY-MM-DD')
        AND NOT COALESCE(nuevo.d #> '{cuaderno,sensaciones}', '[]'::jsonb) @> jsonb_build_array(s)
    )
    INSERT INTO coach_dias (fecha, datos)
    SELECT ${fecha},
           CASE WHEN nuevo.d ? 'cuaderno' AND perdidas.lista <> '[]'::jsonb
             THEN jsonb_set(nuevo.d, '{cuaderno,sensaciones}',
                            COALESCE(nuevo.d #> '{cuaderno,sensaciones}', '[]'::jsonb) || perdidas.lista)
             ELSE nuevo.d
           END
    FROM nuevo, perdidas
    ON CONFLICT (fecha) DO UPDATE SET datos = EXCLUDED.datos, actualizado_en = now()
  `;
}

export async function obtenerUltimoDia(): Promise<DatosCoach | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`SELECT datos FROM coach_dias ORDER BY fecha DESC LIMIT 1`;
  return (rows[0]?.datos as DatosCoach | undefined) ?? null;
}

export async function obtenerCredencial<T>(proveedor: string): Promise<T | null> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`SELECT datos FROM coach_credenciales WHERE proveedor = ${proveedor}`;
  return (rows[0]?.datos as T | undefined) ?? null;
}

export async function guardarCredencial(proveedor: string, datos: unknown): Promise<void> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  await sql`
    INSERT INTO coach_credenciales (proveedor, datos)
    VALUES (${proveedor}, ${JSON.stringify(datos)}::jsonb)
    ON CONFLICT (proveedor) DO UPDATE SET datos = EXCLUDED.datos, actualizado_en = now()
  `;
}

/** data.json de cada día guardado entre dos fechas (YYYY-MM-DD), del más antiguo al más reciente. */
export async function listarDias(desde: string, hasta: string): Promise<{ fecha: string; datos: DatosCoach }[]> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, datos FROM coach_dias
    WHERE fecha BETWEEN ${desde} AND ${hasta}
    ORDER BY fecha ASC
  `;
  return rows as { fecha: string; datos: DatosCoach }[];
}

export interface Sensacion {
  date: string;
  texto: string;
  fuente: string;
}

/** Añade algo que el usuario le cuenta al coach al cuaderno del último informe; la siguiente revisión lo lee. */
export async function anadirSensacion(sensacion: Sensacion): Promise<boolean> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    UPDATE coach_dias
    SET datos = jsonb_set(
          datos,
          '{cuaderno,sensaciones}',
          COALESCE(datos #> '{cuaderno,sensaciones}', '[]'::jsonb) || jsonb_build_array(${JSON.stringify(sensacion)}::jsonb)
        ),
        actualizado_en = now()
    WHERE fecha = (SELECT MAX(fecha) FROM coach_dias)
      AND datos ? 'cuaderno'
    RETURNING fecha
  `;
  return rows.length > 0;
}

/** Quita una sensación concreta (misma fecha, texto y fuente) del cuaderno del último informe. */
export async function quitarSensacion(sensacion: Sensacion): Promise<boolean> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const rows = await sql`
    UPDATE coach_dias
    SET datos = jsonb_set(
          datos,
          '{cuaderno,sensaciones}',
          COALESCE(
            (SELECT jsonb_agg(s) FROM jsonb_array_elements(datos #> '{cuaderno,sensaciones}') s
             WHERE s <> ${JSON.stringify(sensacion)}::jsonb),
            '[]'::jsonb
          )
        ),
        actualizado_en = now()
    WHERE fecha = (SELECT MAX(fecha) FROM coach_dias)
      AND datos #> '{cuaderno,sensaciones}' @> jsonb_build_array(${JSON.stringify(sensacion)}::jsonb)
    RETURNING fecha
  `;
  return rows.length > 0;
}
