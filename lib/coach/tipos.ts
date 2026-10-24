/**
 * Esquema de data.json del coach (lo genera la tarea diaria siguiendo la
 * skill coach-triatlon, sección 12). Solo se tipan los campos que pinta la
 * app; el resto viaja intacto en el JSON.
 */

interface DiaCoach {
  date: string;
  recovery: number;
  hrv: number;
  rhr: number;
  spo2: number;
  strain: number;
  sleep: { deep: number; rem: number; light: number; awake: number; need: number; perf: number };
}

interface TablaEntreno {
  kind: "swim" | "laps";
  cols: string[];
  rows: (string | number | null)[][];
  barCol?: number;
}

export interface EntrenoCoach {
  id: string;
  start: string;
  sport: "running" | "swimming" | "cycling" | "walking" | "strength" | "other";
  title: string;
  min: number;
  dist: string | null;
  pace: string | null;
  hr: [number, number] | null;
  summary: string;
  src: string;
  facts: [string, string][];
  zones: number[];
  zoneSrc: string;
  table: TablaEntreno | null;
  note: string;
}

interface Destacado {
  icon: string;
  tone: string;
  title: string;
  text: string;
}

interface PuntoCarga {
  date: string;
  load: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface SesionPlan {
  sport: string;
  title: string;
  min: number;
  detail?: string[];
  target?: string;
  status: "planned" | "done" | "missed" | "skipped" | "adjusted";
  note?: string;
  workoutId?: string;
}

export interface DiaPlan {
  date: string;
  rest?: boolean;
  sessions?: SesionPlan[];
}

export interface SemanaPlan {
  label: string;
  range: string;
  phase: string;
  focus: string;
  target: string;
  days: DiaPlan[];
}

export interface Cuaderno {
  actualizado: string;
  tests: { date: string; tipo: string; resultado: string; fuente: string }[];
  patrones: { id: string; texto: string; evidencia: string[]; estado: string; accion?: string }[];
  habito: { nombre: string; objetivo: string; registro: { date: string; ok: boolean; dato?: string }[] } | null;
  sensaciones: { date: string; texto: string; fuente: string }[];
  decisiones: { date: string; texto: string; porque: string; abierta: boolean }[];
  mensual: unknown[];
  proponerSkill: string[];
  huecos: string[];
}

export interface DatosCoach {
  generated: string;
  generatedLabel: string;
  days: DiaCoach[];
  workouts: EntrenoCoach[];
  weekTotals: { count: number; label: string };
  zonesWeek: number[];
  today: { dateLabel: string; headline: string; sub: string; session: string };
  highlights: Destacado[];
  swim: { lead: string; stats: [string, string, string, string][] };
  forma: {
    stats: [string, string, string, string, string][];
    predictions: [string, string, string][];
    note: string;
  };
  load: {
    hoy: { ctl: number; atl: number; tsb: number; ramp: number; acwr: number; monotonia: number };
    serie: PuntoCarga[];
    distribucion: { bajo: number; moderado: number; alto: number; minutos: number };
    /** [semana, minutos de natación, bici, carrera, total]. */
    semanas: [string, number, number, number, number][];
    lectura: string;
    alertas: string[];
    huecos: string[];
  };
  plan: { updated: string; note: string; weeks: SemanaPlan[] };
  cuaderno: Cuaderno;
}

/** Comprobación mínima antes de guardar: que trae las claves que pinta la app. */
export function esDatosCoach(valor: unknown): valor is DatosCoach {
  if (typeof valor !== "object" || valor === null) return false;
  const d = valor as Record<string, unknown>;
  return (
    typeof d.generated === "string" &&
    Array.isArray(d.days) &&
    Array.isArray(d.workouts) &&
    typeof d.today === "object" &&
    typeof d.plan === "object" &&
    typeof d.load === "object"
  );
}
