import { diaDeLaSemana, diaEnMadrid, diasEntre, sumarDias } from "@/lib/core/fechas";
import { FRASES } from "./frases";
import { disciplina } from "./formato";
import type { DatosCoach, DiaPlan, SemanaPlan, SesionPlan } from "@/lib/coach/tipos";

export function semanaDe(datos: DatosCoach, fecha: string): SemanaPlan | null {
  const semanas = datos.plan.weeks;
  return semanas.find((s) => s.days.some((d) => d.date === fecha)) ?? semanas[0] ?? null;
}

export function diaPlan(datos: DatosCoach, fecha: string): DiaPlan | null {
  for (const s of datos.plan.weeks) {
    const d = s.days.find((x) => x.date === fecha);
    if (d) return d;
  }
  return null;
}

export function sesionDe(dia: DiaPlan | null): SesionPlan | null {
  return dia && !dia.rest ? (dia.sessions?.[0] ?? null) : null;
}

/** Frase del día de la disciplina de hoy, o de la de mañana si hoy toca descanso. */
export function fraseDelDia(datos: DatosCoach, hoy: string): { deporte: string; etiqueta: string; frase: string } {
  const deHoy = sesionDe(diaPlan(datos, hoy));
  const deManana = deHoy ? null : sesionDe(diaPlan(datos, sumarDias(hoy, 1)));
  const sport = deHoy?.sport ?? deManana?.sport ?? "running";
  const lista = FRASES[sport] ?? FRASES.running;
  const diaDelAno = diasEntre(`${hoy.slice(0, 4)}-01-01`, hoy);
  const nombre = disciplina(sport).nombre.toLowerCase();
  return { deporte: sport, etiqueta: deHoy ? nombre : `mañana ${nombre}`, frase: lista[diaDelAno % lista.length] };
}

interface Racha {
  dias: number;
  segmentos: { fecha: string; color: string }[];
}

/**
 * Días seguidos con entreno o con descanso del plan, hacia atrás desde hoy (o
 * desde ayer si hoy aún no hay entreno). data.json solo trae 7 días de
 * entrenos, así que los días anteriores salen de la carga diaria de load.serie.
 */
export function racha(datos: DatosCoach, hoy: string): Racha {
  const primerDeporte = new Map<string, string>();
  for (const w of [...datos.workouts].sort((a, b) => a.start.localeCompare(b.start))) {
    const dia = w.start.slice(0, 10);
    if (!primerDeporte.has(dia)) primerDeporte.set(dia, w.sport);
  }
  const conCarga = new Set(datos.load.serie.filter((p) => p.load > 0).map((p) => p.date));
  const descansos = new Set(datos.plan.weeks.flatMap((s) => s.days.filter((d) => d.rest).map((d) => d.date)));
  const entreno = (f: string) => primerDeporte.has(f) || conCarga.has(f);

  let dias = 0;
  let cursor = entreno(hoy) ? hoy : sumarDias(hoy, -1);
  while (entreno(cursor) || descansos.has(cursor)) {
    dias += 1;
    cursor = sumarDias(cursor, -1);
  }

  const segmentos = Array.from({ length: 14 }, (_, i) => {
    const fecha = sumarDias(hoy, i - 13);
    const sport = primerDeporte.get(fecha);
    const color = sport
      ? disciplina(sport).color
      : conCarga.has(fecha)
        ? "var(--c-text-soft)"
        : fecha === hoy
          ? "var(--c-fill-hi)"
          : "var(--c-dot-empty)";
    return { fecha, color };
  });

  return { dias, segmentos };
}

/** «4,67 km» → 4,67 · «1.450 m» → 1,45 (en km). */
function km(dist: string | null): number {
  if (!dist) return 0;
  const n = Number(
    dist
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.]/g, "")
  );
  if (!Number.isFinite(n)) return 0;
  return /\bkm\b/.test(dist) ? n : n / 1000;
}

/** Los tres deportes del triatlón, en el orden en que se muestran. */
export const DEPORTES_TRIATLON = ["swimming", "running", "cycling"] as const;

export interface TotalSemana {
  sport: (typeof DEPORTES_TRIATLON)[number];
  km: number;
  min: number;
  sesiones: number;
}

/** Km, minutos y sesiones de cada deporte del triatlón en la semana en curso (de lunes a hoy). */
export function resumenSemana(datos: DatosCoach, hoy: string): TotalSemana[] {
  const lunes = sumarDias(hoy, -((diaDeLaSemana(hoy) + 6) % 7));
  const deLaSemana = datos.workouts.filter((w) => {
    const dia = diaEnMadrid(w.start);
    return dia >= lunes && dia <= hoy;
  });
  return DEPORTES_TRIATLON.map((sport) => {
    const entrenos = deLaSemana.filter((w) => w.sport === sport);
    return {
      sport,
      km: entrenos.reduce((a, w) => a + km(w.dist), 0),
      min: entrenos.reduce((a, w) => a + w.min, 0),
      sesiones: entrenos.length,
    };
  });
}
