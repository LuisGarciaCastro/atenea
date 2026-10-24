export const ESTADOS_EVENTO = ["pendiente_interpretar", "creado", "necesita_revision"] as const;

export type EstadoEvento = (typeof ESTADOS_EVENTO)[number];

export interface EventoPendiente {
  id: number;
  texto_original: string;
  fecha: string;
  titulo: string | null;
  fecha_hora_evento: string | null;
  estado: EstadoEvento;
  google_event_id: string | null;
  correccion_pendiente: string | null;
  motivo_revision: string | null;
}
