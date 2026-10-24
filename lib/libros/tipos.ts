export const ESTADOS_LIBRO = ["quiero_leer", "leyendo", "leido"] as const;

export type EstadoLibro = (typeof ESTADOS_LIBRO)[number];

export interface Libro {
  id: number;
  open_library_key: string | null;
  titulo: string;
  autor: string | null;
  portada_url: string | null;
  estado: EstadoLibro;
  notas: string | null;
  pagina_actual: number | null;
  paginas_totales: number | null;
  fecha_inicio: string | null;
  /** Cuándo se marcó como leído. */
  fecha_fin: string | null;
  valoracion: number | null;
  creado_en: string;
  actualizado_en: string;
}
