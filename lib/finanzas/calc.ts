import { CATEGORIAS_GASTO, type CategoriaGasto, type Gasto } from "@/lib/finanzas/tipos";

/** Color en orden de CATEGORIAS_GASTO con --cat-1…6, repitiendo desde la 7.ª; «Otros» siempre apagado. */
const COLOR_CATEGORIA = Object.fromEntries(
  CATEGORIAS_GASTO.map((c, i) => [c, c === "Otros" ? "var(--text-muted)" : `var(--cat-${(i % 6) + 1})`])
) as Record<CategoriaGasto, string>;

export function colorParaCategoria(categoria: string | null): string {
  return CATEGORIAS_GASTO.includes(categoria as CategoriaGasto)
    ? COLOR_CATEGORIA[categoria as CategoriaGasto]
    : "var(--text-muted)";
}

function mismoMes(fecha: Date, referencia: Date): boolean {
  return fecha.getFullYear() === referencia.getFullYear() && fecha.getMonth() === referencia.getMonth();
}

function mismoDia(fecha: Date, referencia: Date): boolean {
  return mismoMes(fecha, referencia) && fecha.getDate() === referencia.getDate();
}

/** Clave YYYY-MM-DD en base al día de calendario local, no al día UTC. */
function claveDia(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

const categorizados = (gastos: Gasto[]) => gastos.filter((g) => g.estado === "categorizado");

interface ResumenFinanzas {
  totalMesActual: number;
  totalHoy: number;
  totalMesAnterior: number;
  variacionPct: number | null;
}

export function calcularResumen(gastos: Gasto[], ahora: Date = new Date()): ResumenFinanzas {
  const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  let totalMesActual = 0;
  let totalHoy = 0;
  let totalMesAnterior = 0;

  for (const g of categorizados(gastos)) {
    const importe = Number(g.importe ?? 0);
    const fecha = new Date(g.fecha);
    if (mismoMes(fecha, ahora)) totalMesActual += importe;
    if (mismoDia(fecha, ahora)) totalHoy += importe;
    if (mismoMes(fecha, mesAnterior)) totalMesAnterior += importe;
  }

  const variacionPct = totalMesAnterior > 0 ? ((totalMesActual - totalMesAnterior) / totalMesAnterior) * 100 : null;

  return { totalMesActual, totalHoy, totalMesAnterior, variacionPct };
}

export interface PorcionCategoria {
  categoria: string;
  total: number;
  color: string;
}

export function agruparPorCategoria(gastos: Gasto[], ahora: Date = new Date()): PorcionCategoria[] {
  const totales = new Map<string, number>();
  for (const g of categorizados(gastos)) {
    const fecha = new Date(g.fecha);
    if (!mismoMes(fecha, ahora)) continue;
    const categoria = g.categoria ?? "Otros";
    totales.set(categoria, (totales.get(categoria) ?? 0) + Number(g.importe ?? 0));
  }

  return [...totales.entries()]
    .map(([categoria, total]) => ({ categoria, total, color: colorParaCategoria(categoria) }))
    .sort((a, b) => b.total - a.total);
}

interface TotalMes {
  clave: string; // YYYY-MM
  mes: string; // etiqueta corta, p.ej. "Sep"
  total: number;
  esActual: boolean;
}

/** Total gastado en cada uno de los últimos `n` meses (incluye el actual), para
 * las barras de evolución mensual de Finanzas y del widget de Resumen. */
export function totalesUltimosMeses(gastos: Gasto[], n = 6, ahora: Date = new Date()): TotalMes[] {
  const meses: TotalMes[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    const total = categorizados(gastos)
      .filter((g) => mismoMes(new Date(g.fecha), fecha))
      .reduce((sum, g) => sum + Number(g.importe ?? 0), 0);
    const etiqueta = fecha.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
    meses.push({
      clave,
      mes: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1),
      total,
      esActual: i === 0,
    });
  }
  return meses;
}

/** Todos los gastos (de cualquier estado) del mes de calendario de `referencia`. */
export function gastosDelMes(gastos: Gasto[], referencia: Date): Gasto[] {
  return gastos.filter((g) => mismoMes(new Date(g.fecha), referencia));
}

export type RangoEvolucion = "semana" | "mes" | "3meses" | "personalizado";

export interface PuntoEvolucion {
  fecha: string;
  total: number;
}

export interface RangoPersonalizado {
  desde: string;
  hasta: string;
}

const MAX_DIAS_SERIE = 366;

export function serieDiaria(
  gastos: Gasto[],
  rango: RangoEvolucion,
  ahora: Date = new Date(),
  personalizado?: RangoPersonalizado
): PuntoEvolucion[] {
  let inicio: Date;
  let fin: Date;

  if (rango === "personalizado" && personalizado?.desde && personalizado?.hasta) {
    inicio = new Date(`${personalizado.desde}T00:00:00`);
    fin = new Date(`${personalizado.hasta}T00:00:00`);
    if (inicio > fin) [inicio, fin] = [fin, inicio];
  } else {
    const dias = rango === "semana" ? 7 : rango === "mes" ? 30 : 90;
    fin = new Date(ahora);
    fin.setHours(0, 0, 0, 0);
    inicio = new Date(fin);
    inicio.setDate(inicio.getDate() - (dias - 1));
  }

  const totalDias = Math.min(Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1, MAX_DIAS_SERIE);

  // Comparamos por clave de día (no por timestamp) para no excluir el propio
  // día de `fin` (p. ej. hoy): `fin` se fija a medianoche, así que un gasto de
  // hoy a cualquier otra hora quedaría fuera de un rango [inicio, fin] basado
  // en timestamps.
  const claveInicio = claveDia(inicio);
  const claveFin = claveDia(fin);

  const totalesPorDia = new Map<string, number>();
  for (const g of categorizados(gastos)) {
    const clave = claveDia(new Date(g.fecha));
    if (clave < claveInicio || clave > claveFin) continue;
    totalesPorDia.set(clave, (totalesPorDia.get(clave) ?? 0) + Number(g.importe ?? 0));
  }

  const puntos: PuntoEvolucion[] = [];
  for (let i = 0; i < totalDias; i++) {
    const dia = new Date(inicio);
    dia.setDate(dia.getDate() + i);
    const clave = claveDia(dia);
    puntos.push({ fecha: clave, total: totalesPorDia.get(clave) ?? 0 });
  }
  return puntos;
}

/** Gastos categorizados de una categoría concreta dentro del mes de `ahora`. */
export function gastosPorCategoriaEsteMes(gastos: Gasto[], categoria: string, ahora: Date = new Date()): Gasto[] {
  return categorizados(gastos).filter(
    (g) => mismoMes(new Date(g.fecha), ahora) && (g.categoria ?? "Otros") === categoria
  );
}

/** Gastos (de cualquier estado) cuyo día de calendario local coincide con `fecha` (YYYY-MM-DD). */
export function gastosPorDia(gastos: Gasto[], fecha: string): Gasto[] {
  return gastos.filter((g) => claveDia(new Date(g.fecha)) === fecha);
}

interface GrupoDia {
  fecha: string;
  gastos: Gasto[];
  total: number;
}

export function agruparPorDia(gastos: Gasto[]): GrupoDia[] {
  const grupos = new Map<string, Gasto[]>();
  for (const g of gastos) {
    const clave = claveDia(new Date(g.fecha));
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave)!.push(g);
  }

  return [...grupos.entries()]
    .map(([fecha, gastosDia]) => ({
      fecha,
      gastos: gastosDia,
      total: gastosDia.reduce((sum, g) => sum + Number(g.importe ?? 0), 0),
    }))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

interface FiltrosGastos {
  categoria?: string | null;
  texto?: string;
  importeMin?: number | null;
  desde?: string | null;
  hasta?: string | null;
}

export function filtrarGastos(gastos: Gasto[], filtros: FiltrosGastos): Gasto[] {
  const texto = filtros.texto?.trim().toLowerCase();
  return gastos.filter((g) => {
    if (filtros.categoria && g.categoria !== filtros.categoria) return false;
    if (texto) {
      const contenido = `${g.descripcion ?? ""} ${g.texto_original}`.toLowerCase();
      if (!contenido.includes(texto)) return false;
    }
    if (filtros.importeMin != null && Number(g.importe ?? 0) < filtros.importeMin) return false;
    const clave = claveDia(new Date(g.fecha));
    if (filtros.desde && clave < filtros.desde) return false;
    if (filtros.hasta && clave > filtros.hasta) return false;
    return true;
  });
}

export type OrdenGastos = "fecha" | "importe-desc" | "importe-asc";

export function ordenarGastos(gastos: Gasto[], orden: OrdenGastos): Gasto[] {
  const copia = [...gastos];
  if (orden === "importe-desc") {
    copia.sort((a, b) => Number(b.importe ?? 0) - Number(a.importe ?? 0));
  } else if (orden === "importe-asc") {
    copia.sort((a, b) => Number(a.importe ?? 0) - Number(b.importe ?? 0));
  } else {
    copia.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }
  return copia;
}

export interface ComparativaCategoria {
  categoria: string;
  actual: number;
  anterior: number;
  deltaPct: number | null;
  color: string;
}

export function comparativaMensualPorCategoria(gastos: Gasto[], ahora: Date = new Date()): ComparativaCategoria[] {
  const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const actual = new Map<string, number>();
  const anterior = new Map<string, number>();

  for (const g of categorizados(gastos)) {
    const fecha = new Date(g.fecha);
    const categoria = g.categoria ?? "Otros";
    const importe = Number(g.importe ?? 0);
    if (mismoMes(fecha, ahora)) {
      actual.set(categoria, (actual.get(categoria) ?? 0) + importe);
    } else if (mismoMes(fecha, mesAnterior)) {
      anterior.set(categoria, (anterior.get(categoria) ?? 0) + importe);
    }
  }

  const categorias = new Set([...actual.keys(), ...anterior.keys()]);
  return [...categorias]
    .map((categoria) => {
      const totalActual = actual.get(categoria) ?? 0;
      const totalAnterior = anterior.get(categoria) ?? 0;
      const deltaPct = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior) * 100 : null;
      return {
        categoria,
        actual: totalActual,
        anterior: totalAnterior,
        deltaPct,
        color: colorParaCategoria(categoria),
      };
    })
    .sort((a, b) => b.actual - a.actual);
}

export interface ComercioFrecuente {
  nombre: string;
  total: number;
  veces: number;
}

export function topComercios(gastos: Gasto[], ahora: Date = new Date(), limite = 5): ComercioFrecuente[] {
  const totales = new Map<string, { total: number; veces: number }>();

  for (const g of categorizados(gastos)) {
    const fecha = new Date(g.fecha);
    if (!mismoMes(fecha, ahora)) continue;
    const nombre = (g.descripcion ?? g.texto_original).trim();
    const actual = totales.get(nombre) ?? { total: 0, veces: 0 };
    actual.total += Number(g.importe ?? 0);
    actual.veces += 1;
    totales.set(nombre, actual);
  }

  return [...totales.entries()]
    .map(([nombre, v]) => ({ nombre, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}

function escaparCeldaCsv(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

export function gastosACsv(gastos: Gasto[]): string {
  const cabecera = ["Fecha", "Descripción", "Categoría", "Importe", "Estado"];
  const filas = gastos.map((g) => [
    claveDia(new Date(g.fecha)),
    g.descripcion ?? g.texto_original,
    g.categoria ?? "",
    g.importe != null ? String(g.importe) : "",
    g.estado,
  ]);
  return [cabecera, ...filas].map((fila) => fila.map((c) => escaparCeldaCsv(String(c))).join(",")).join("\n");
}
