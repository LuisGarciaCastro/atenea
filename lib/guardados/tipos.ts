export interface Guardado {
  id: number;
  url: string;
  fuente: string;
  titulo: string | null;
  autor: string | null;
  nota: string | null;
  issue_number: number | null;
  creado_en: string;
}

export interface GuardadoEntrada {
  url: string;
  titulo?: string | null;
  autor?: string | null;
  nota?: string | null;
  issue_number?: number | null;
}
