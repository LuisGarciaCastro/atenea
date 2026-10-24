import { NextResponse } from "next/server";

const MAX_ID = 2_147_483_647;

/** Id de una ruta o de un cuerpo JSON: entero positivo que cabe en un INTEGER de Postgres. */
export function leerId(valor: unknown): number | null {
  const n = typeof valor === "string" && valor.trim() !== "" ? Number(valor) : valor;
  return typeof n === "number" && Number.isInteger(n) && n > 0 && n <= MAX_ID ? n : null;
}

/** ¿Es `valor` uno de los valores permitidos? Sirve de guarda de tipo para listas `as const`. */
export function esDe<T extends string>(lista: readonly T[], valor: unknown): valor is T {
  return typeof valor === "string" && (lista as readonly string[]).includes(valor);
}

/** Fecha YYYY-MM-DD que existe (Date.parse aceptaría un 31 de febrero, por eso se compara la vuelta). */
export function esFecha(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(valor);
}

/** Entero dentro de [min, max], o null. */
export function enteroEntre(valor: unknown, min: number, max: number): number | null {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= min && valor <= max ? valor : null;
}

/** Texto recortado y no vacío, o null. */
export function textoNoVacio(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

/** Segundo argumento de las rutas dinámicas `[id]`. */
export interface ConId {
  params: Promise<{ id: string }>;
}

/** Id de una ruta `[id]`, o null si no es válido. */
export async function idDeRuta({ params }: ConId): Promise<number | null> {
  return leerId((await params).id);
}

export function error(mensaje: string, status: number): NextResponse {
  return NextResponse.json({ error: mensaje }, { status });
}

/** Cuerpo JSON de la petición, o null si no es JSON válido. */
export async function leerJson(request: Request): Promise<Record<string, unknown> | null> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

export type Manejador<R extends Request, C> = (request: R, contexto: C) => Promise<Response>;

/**
 * Errores de Postgres que vienen de datos de la petición (una referencia que no existe, un
 * valor con formato inválido, un duplicado): 400/409 en vez de 500, para que quien llama
 * (sobre todo los agentes) sepa que debe corregir lo que manda.
 */
const ERRORES_DE_ENTRADA: Record<string, [string, number]> = {
  "23503": ["Referencia a un registro que no existe", 400],
  "23505": ["Ya existe un registro con esos datos", 409],
  "23514": ["Valor fuera de rango", 400],
  "22007": ["Fecha con formato no válido", 400],
  "22008": ["Fecha fuera de rango", 400],
  "22P02": ["Valor con formato no válido", 400],
  "22003": ["Número fuera de rango", 400],
};

/** Envuelve un manejador de ruta: cualquier error inesperado responde 500 en JSON en vez de HTML. */
export function conErrores<R extends Request, C>(manejador: Manejador<R, C>): Manejador<R, C> {
  return async (request, contexto) => {
    try {
      return await manejador(request, contexto);
    } catch (e) {
      console.error(`${request.method} ${new URL(request.url).pathname}:`, e);
      const codigo = (e as { code?: unknown } | null)?.code;
      const deEntrada = typeof codigo === "string" ? ERRORES_DE_ENTRADA[codigo] : undefined;
      return deEntrada ? error(...deEntrada) : error("Error interno", 500);
    }
  };
}
