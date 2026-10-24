export const TIPOS_NOTA = ["idea", "investigar", "articulo"] as const;
export type TipoNota = (typeof TIPOS_NOTA)[number];

export const NOMBRE_TIPO_NOTA: Record<TipoNota, string> = {
  idea: "Idea",
  investigar: "Por investigar",
  articulo: "Artículo",
};

/** Nota propia del usuario en Ideas: una idea, algo que investigar o un artículo que escribir. */
export interface Nota {
  id: number;
  tipo: TipoNota;
  titulo: string;
  texto: string | null;
  /** Investigada, escrita o descartada: sale de la lista principal. */
  hecha: boolean;
  creado_en: string;
  actualizado_en: string;
}

export const MAX_TITULO_NOTA = 200;
export const MAX_TEXTO_NOTA = 10_000;
