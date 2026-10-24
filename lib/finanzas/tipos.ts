export type EstadoGasto = "pendiente_categorizar" | "categorizado";

export const CATEGORIAS_GASTO = [
  "Alimentación",
  "Restaurantes",
  "Transporte",
  "Ocio",
  "Salud",
  "Hogar",
  "Ropa",
  "Suscripciones",
  "Otros",
] as const;

export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

export interface Gasto {
  id: number;
  texto_original: string;
  importe: number | null;
  categoria: string | null;
  descripcion: string | null;
  estado: EstadoGasto;
  fecha: string;
}

export function normalizarCategoria(valor: string): CategoriaGasto | null {
  const objetivo = valor.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return CATEGORIAS_GASTO.find((c) => c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") === objetivo) ?? null;
}

/** Importe positivo con como mucho dos decimales (acepta número o texto «12,50»), o null. */
export function importeValido(valor: unknown): number | null {
  const n = typeof valor === "string" ? Number(valor.replace(",", ".")) : valor;
  return typeof n === "number" && Number.isFinite(n) && n > 0 && n < 1_000_000 ? Math.round(n * 100) / 100 : null;
}
