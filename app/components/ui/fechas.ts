const DIA_MS = 86_400_000;

export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function diasDesde(fecha: Date, ahora: Date): number {
  const a = new Date(ahora).setHours(0, 0, 0, 0);
  const b = new Date(fecha).setHours(0, 0, 0, 0);
  return Math.round((a - b) / DIA_MS);
}

/** «hoy», «ayer» o «16 de octubre». Acepta un día YYYY-MM-DD o un instante ISO. */
export function fechaCercana(iso: string, ahora: Date = new Date()): string {
  const fecha = aFecha(iso);
  const dias = diasDesde(fecha, ahora);
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

/** Como fechaCercana, pero con «hace N días» durante la primera semana. */
export function fechaRelativa(iso: string, ahora: Date = new Date()): string {
  const dias = diasDesde(aFecha(iso), ahora);
  if (dias >= 2 && dias < 7) return `hace ${dias} días`;
  return fechaCercana(iso, ahora);
}

/** Un día «YYYY-MM-DD» se lee como día local (no como medianoche UTC); cualquier otra cosa, como instante. */
function aFecha(fecha: string | Date): Date {
  return typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ? new Date(`${fecha}T00:00:00`)
    : new Date(fecha);
}

/** «16 oct» / «3 sept». Acepta un día YYYY-MM-DD o un instante ISO. */
export function fechaCorta(fecha: string | Date): string {
  return aFecha(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "");
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
