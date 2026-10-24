export const FILTROS = ["Todo", "Vídeos", "Temas", "Personas", "Guardados"] as const;
export type Filtro = (typeof FILTROS)[number];

/** `?ver=temas` → «Temas»: los detalles vuelven al cuaderno con su filtro puesto. */
export function filtroDe(ver: string | undefined): Filtro {
  return FILTROS.find((f) => f.toLowerCase() === ver?.toLowerCase()) ?? "Todo";
}
