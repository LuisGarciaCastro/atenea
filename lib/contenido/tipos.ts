type EstadoVideo = "pendiente" | "procesado" | "error";
export type TipoHighlight = "idea_clave" | "cita" | "dato";

export interface Video {
  id: number;
  youtube_id: string;
  titulo: string;
  canal: string | null;
  url: string;
  duracion_seg: number | null;
  fecha_publicacion: string | null;
  fecha_procesado: string | null;
  miniatura_url: string | null;
  resumen: string | null;
  estado: EstadoVideo;
  error_motivo: string | null;
  issue_number: number | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Tema {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  miniatura_url: string | null;
  resumen: string | null;
}

export interface Persona {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  foto_url: string | null;
  canal_id: string | null;
}

export interface SegmentoEntrada {
  inicio_seg: number;
  fin_seg: number;
  texto: string;
}

export interface HighlightEntrada {
  inicio_seg: number;
  fin_seg: number | null;
  texto: string;
  tipo: TipoHighlight;
  importancia: number;
}

export interface TemaEntrada {
  nombre: string;
  descripcion?: string | null;
  /**
   * Párrafo sintetizado por el agente a partir de los vídeos/highlights ya
   * etiquetados con este tema (más el vídeo que se está procesando ahora).
   * Se sobrescribe en cada llamada que lo incluya, porque cada una ya
   * incorpora el histórico acumulado — si no se envía, se conserva el
   * resumen existente en vez de borrarlo.
   */
  resumen?: string | null;
  contexto?: string | null;
}

export interface PersonaEntrada {
  nombre: string;
  descripcion?: string | null;
  foto_url?: string | null;
  canal_id?: string | null;
  contexto?: string | null;
}

export interface MetadatosVideoEntrada {
  youtube_id: string;
  titulo: string;
  canal: string | null;
  url: string;
  duracion_seg: number | null;
  fecha_publicacion: string | null;
  miniatura_url: string | null;
  issue_number: number | null;
}

export interface ProcesamientoVideoEntrada {
  resumen: string;
  segmentos: SegmentoEntrada[];
  highlights: HighlightEntrada[];
  temas: TemaEntrada[];
  personas: PersonaEntrada[];
}

export interface Segmento {
  inicio_seg: number;
  fin_seg: number;
  texto: string;
}

export interface Highlight {
  id: number;
  inicio_seg: number;
  fin_seg: number | null;
  texto: string;
  tipo: TipoHighlight;
  importancia: number;
}

export interface TemaConContexto extends Tema {
  contexto: string | null;
}

export interface PersonaConContexto extends Persona {
  contexto: string | null;
}

export interface VideoRelacionado {
  id: number;
  youtube_id: string;
  titulo: string;
  canal: string | null;
  miniatura_url: string | null;
  puntuacion: number;
}

export interface VideoCompleto extends Video {
  segmentos: Segmento[];
  highlights: Highlight[];
  temas: TemaConContexto[];
  personas: PersonaConContexto[];
  relacionados: VideoRelacionado[];
}

export interface VideoDeTema {
  id: number;
  youtube_id: string;
  titulo: string;
  canal: string | null;
  miniatura_url: string | null;
  fecha_publicacion: string | null;
  contexto: string | null;
  highlight_destacado: string | null;
}

export interface TemaRelacionado extends Tema {
  peso: number;
}

export interface TemaCompleto extends Tema {
  videos: VideoDeTema[];
  personas: Persona[];
  temasRelacionados: TemaRelacionado[];
}

export interface VideoDePersona {
  id: number;
  youtube_id: string;
  titulo: string;
  canal: string | null;
  miniatura_url: string | null;
  fecha_publicacion: string | null;
  contexto: string | null;
}

export interface PersonaRelacionada extends Persona {
  peso: number;
}

export interface PersonaCompleta extends Persona {
  videos: VideoDePersona[];
  temas: Tema[];
  personasRelacionadas: PersonaRelacionada[];
}

export interface TemaConConteo extends Tema {
  videoCount: number;
}

export interface PersonaConConteo extends Persona {
  videoCount: number;
}

export interface VideoConHighlight extends Video {
  highlight_destacado: string | null;
  highlight_count: number;
  tema_principal: string | null;
}

type TipoResultadoBusqueda = "video" | "tema" | "persona";

export interface ResultadoBusqueda {
  tipo: TipoResultadoBusqueda;
  id: number;
  slug: string;
  titulo: string;
  extracto: string | null;
  imagenUrl: string | null;
}
