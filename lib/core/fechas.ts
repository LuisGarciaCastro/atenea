/** El hub es de una sola persona y vive en una zona horaria (cámbiala aquí y en scripts/coach/*.py y los workflows): «hoy», «mañana» y los meses se cuentan en esa zona, no en la del servidor (UTC en Vercel). */
export const ZONA = "Europe/Madrid";

const DIA_MS = 86_400_000;

/** Día (YYYY-MM-DD) en Madrid de un instante; por defecto, ahora. */
export function diaEnMadrid(instante: Date | string = new Date()): string {
  return new Date(instante).toLocaleDateString("sv-SE", { timeZone: ZONA });
}

/** Mes (YYYY-MM) en Madrid de un instante. */
export function mesEnMadrid(instante: Date | string = new Date()): string {
  return diaEnMadrid(instante).slice(0, 7);
}

/** Hora (0-23) en Madrid de un instante; por defecto, ahora. */
export function horaEnMadrid(instante: Date | string = new Date()): number {
  return Number(new Date(instante).toLocaleString("en-GB", { timeZone: ZONA, hour: "2-digit", hourCycle: "h23" }));
}

/** Suma días a una fecha YYYY-MM-DD (aritmética de calendario, sin zonas). */
export function sumarDias(dia: string, n: number): string {
  return new Date(Date.parse(`${dia}T12:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
}

/** Día de la semana (0 = domingo) de una fecha YYYY-MM-DD. */
export function diaDeLaSemana(dia: string): number {
  return new Date(`${dia}T12:00:00Z`).getUTCDay();
}

/** Días de calendario de `desde` a `hasta` (YYYY-MM-DD). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / DIA_MS);
}
