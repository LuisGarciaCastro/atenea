import { CategoriaGasto, normalizarCategoria } from "@/lib/finanzas/tipos";

const NUMERO_REGEX = /(?:^|[\s€$])(\d{1,5}(?:[.,]\d{1,2})?)(?:[\s€$]|$)/;

/**
 * Heurística de Fase 1: sin IA, solo para decidir si un mensaje de Telegram
 * "tiene pinta de gasto" y merece guardarse como pendiente_categorizar.
 * Debe ser barata y rápida — la categorización de verdad la hace el cron.
 */
export function esGastoProbable(texto: string): boolean {
  const limpio = texto.trim();
  if (!limpio || limpio.includes("\n") || limpio.length > 80) return false;
  if (limpio.startsWith("/")) return false;
  return NUMERO_REGEX.test(limpio);
}

interface CorreccionGasto {
  id: number;
  categoria: CategoriaGasto;
  importe?: number;
}

const CORRECCION_REGEX = /^#(\d+)\s+(\S+)(?:\s+(\d+(?:[.,]\d{1,2})?))?\s*$/;

/** Parsea correcciones con formato "#<id> <categoría> [importe]". */
export function leerCorreccionGasto(texto: string): CorreccionGasto | null {
  const match = texto.trim().match(CORRECCION_REGEX);
  if (!match) return null;

  const [, idRaw, categoriaRaw, importeRaw] = match;
  const categoria = normalizarCategoria(categoriaRaw);
  if (!categoria) return null;

  return {
    id: Number(idRaw),
    categoria,
    importe: importeRaw ? Number(importeRaw.replace(",", ".")) : undefined,
  };
}
