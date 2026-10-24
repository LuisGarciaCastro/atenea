import { obtenerSql } from "@/lib/core/db";
import { asegurarEsquema } from "./schema";
import { type Persona, type Tema } from "./tipos";

export async function obtenerCatalogo(): Promise<{ temas: Tema[]; personas: Persona[] }> {
  const sql = obtenerSql();
  await asegurarEsquema(sql);
  const [temas, personas] = await Promise.all([
    sql`SELECT id, nombre, slug, descripcion, miniatura_url, resumen FROM temas ORDER BY nombre ASC`,
    sql`SELECT id, nombre, slug, descripcion, foto_url, canal_id FROM personas ORDER BY nombre ASC`,
  ]);
  return { temas: temas as Tema[], personas: personas as Persona[] };
}
