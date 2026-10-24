/** Los tonos del data.json (pensados para el dashboard antiguo) llevados a la paleta del coach. */
const TONOS: Record<string, string> = {
  green: "var(--c-lime)",
  teal: "var(--c-cyan)",
  blue: "var(--c-cyan)",
  indigo: "var(--c-violet)",
  orange: "var(--c-amber)",
  red: "var(--c-red)",
};

export function colorTono(tono: string): string {
  return TONOS[tono] ?? "var(--c-text-muted)";
}

/** Verde/ámbar/rojo de WHOOP, en la paleta del hub. */
export function colorRecovery(valor: number): string {
  if (valor >= 67) return "var(--c-lime)";
  if (valor >= 34) return "var(--c-amber)";
  return "var(--c-red)";
}

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** «2026-10-16» → «vie 16». */
export function diaCorto(iso: string): string {
  const f = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return `${DIAS[f.getDay()]} ${f.getDate()}`;
}

export function decimal(valor: number, decimales = 1): string {
  return valor.toLocaleString("es-ES", { maximumFractionDigits: decimales, minimumFractionDigits: decimales });
}

/** Disciplinas del coach y su color (definidos en coach.module.css). */
const DEPORTES_CIRCUITO: Record<string, { nombre: string; color: string }> = {
  swimming: { nombre: "Nadar", color: "var(--c-swim)" },
  cycling: { nombre: "Bici", color: "var(--c-bike)" },
  running: { nombre: "Correr", color: "var(--c-run)" },
  strength: { nombre: "Fuerza", color: "var(--c-strength)" },
  walking: { nombre: "Caminar", color: "var(--c-text-muted)" },
  other: { nombre: "Otro", color: "var(--c-text-muted)" },
};

export function disciplina(clave: string) {
  return DEPORTES_CIRCUITO[clave] ?? DEPORTES_CIRCUITO.other;
}

/** 150 → «2h30», 45 → «45′». */
export function duracionCorta(minutos: number): string {
  if (minutos < 60) return `${minutos}′`;
  const m = minutos % 60;
  return `${Math.floor(minutos / 60)}h${m ? String(m).padStart(2, "0") : ""}`;
}
