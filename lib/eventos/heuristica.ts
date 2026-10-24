const DIA_SEMANA_REGEX = /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i;
const DIA_RELATIVO_REGEX = /\b(hoy|pasado\s*ma[ñn]ana|ma[ñn]ana)\b/i;
const MESES_REGEX =
  "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";
const FECHA_EXPLICITA_REGEX = new RegExp(
  `\\bd[ií]a\\s+\\d{1,2}\\b|\\bel\\s+\\d{1,2}\\b|\\b\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?\\b|\\b\\d{1,2}\\s+de\\s+(?:${MESES_REGEX})\\b`,
  "i"
);
const PLAZO_RELATIVO_REGEX =
  /\bdentro\s+de\s+[\wáéíóúñ]{1,10}(?:\s+[\wáéíóúñ]{1,10}){0,3}\s+(?:d[ií]as?|semanas?|mes(?:es)?|a[ñn]os?)\b/i;

const HORA_REGEX = /\ba\s+las?\s+\d{1,2}(?:[:.,]\d{2})?\b/i;
const FRANJA_REGEX = /\bmediod[ií]a\b|\bpor\s+la\s+(?:ma[ñn]ana|tarde|noche)\b/i;
const RANGO_HORA_REGEX =
  /\b(?:de|entre|desde)\s+(?:las?\s+)?\d{1,2}(?:[:.,]\d{2})?\s*h?\s+(?:a|y|hasta)\s+(?:las?\s+)?\d{1,2}(?:[:.,]\d{2})?\s*h?\b/i;

/**
 * Palabras de cita puntual: bastan por sí solas (sin hora) para marcar
 * evento. "recuérdame" queda fuera a propósito: "recuérdame llamar al
 * fontanero el jueves" es una tarea con fecha,
 * no una cita a una hora concreta — solo cuenta como evento si además hay
 * hora explícita.
 */
const DISPARADOR_REGEX =
  /\b(recordatorio|recuerda|agenda|ag[eé]ndalo|evento|cita|cumple(?:a[ñn]os)?|quedada|reuni[oó]n|boda|fiesta|aniversario|entrevista)\b/i;

function tieneDia(texto: string): boolean {
  return (
    DIA_SEMANA_REGEX.test(texto) ||
    DIA_RELATIVO_REGEX.test(texto) ||
    FECHA_EXPLICITA_REGEX.test(texto) ||
    PLAZO_RELATIVO_REGEX.test(texto)
  );
}

function tieneHora(texto: string): boolean {
  return HORA_REGEX.test(texto) || FRANJA_REGEX.test(texto) || RANGO_HORA_REGEX.test(texto);
}

function tieneDisparador(texto: string): boolean {
  return DISPARADOR_REGEX.test(texto);
}

/**
 * Heurística de Fase 1: sin IA. Un mensaje "tiene pinta de evento" si
 * menciona un día Y (una hora O una palabra disparadora de cita puntual).
 * Se comprueba antes que esGastoProbable porque fechas como "el 15 a las 3"
 * contienen números sueltos que el detector de gasto confundiría con un importe.
 */
export function esEventoProbable(texto: string): boolean {
  const limpio = texto.trim();
  if (!limpio || limpio.startsWith("/")) return false;
  return tieneDia(limpio) && (tieneHora(limpio) || tieneDisparador(limpio));
}

interface CorreccionEvento {
  id: number;
  texto: string;
}

const CORRECCION_REGEX = /^#(\d+)\s+([\s\S]+)$/;

/**
 * Solo extrae "#id + resto del texto", sin interpretar la corrección:
 * a diferencia de una corrección de gasto (categoría de lista cerrada),
 * una corrección de evento es lenguaje natural libre y la interpreta el agente.
 */
export function leerCorreccionEvento(texto: string): CorreccionEvento | null {
  const match = texto.trim().match(CORRECCION_REGEX);
  if (!match) return null;

  return { id: Number(match[1]), texto: match[2].trim() };
}
