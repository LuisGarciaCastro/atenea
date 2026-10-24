/** Hash entero estable de un texto: el mismo texto da siempre el mismo color, alto, papel… */
export function hash(texto: string): number {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Corta `texto` a `max` caracteres con «…»; null si no hay texto. */
export function recortar(texto: string | null | undefined, max: number): string | null {
  if (!texto) return null;
  return texto.length > max ? `${texto.slice(0, max).trimEnd()}…` : texto;
}
