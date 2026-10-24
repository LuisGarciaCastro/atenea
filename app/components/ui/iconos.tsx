import type { ReactElement } from "react";
import type { CategoriaGasto } from "@/lib/finanzas/tipos";

/** Iconos de trazo estilo Lucide; el grosor lo decide quien lo usa. */
function trazo(d: string, grosor: number): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const LIBRO = "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20";

export const ICONOS_PESTANA: Record<string, ReactElement> = {
  inicio: trazo("M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z", 1.8),
  coach: trazo("M22 12h-4l-3 9L9 3l-3 9H2", 1.8),
  notas: trazo("M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2", 1.8),
  hucha: trazo(
    "M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v3M3 5v14a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M20 11h-3a2 2 0 0 0 0 4h3z",
    1.8
  ),
  ideas: trazo("M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3zM9.5 21h5", 1.8),
  libros: trazo(LIBRO, 1.8),
};

/** El juego de iconos de la app. */
export const T = {
  /** Chevron de fila (7×12): «hay más detalle». */
  fila: (
    <svg
      viewBox="0 0 7 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 1l5 5-5 5" />
    </svg>
  ),
  /** Chevron del enlace «‹ Volver» (11×18). */
  volver: (
    <svg
      viewBox="0 0 11 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 2L2 9l7 7" />
    </svg>
  ),
  reproducir: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z" />
    </svg>
  ),
  mas: trazo("M5 12h14M12 5v14", 2.6),
  chat: trazo("M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z", 2),
  cerrar: trazo("M18 6 6 18M6 6l12 12", 2.4),
  check: trazo("m5 12.5 4.5 4.5L19 7.5", 2.6),
  anterior: trazo("m15 18-6-6 6-6", 2.2),
  siguiente: trazo("m9 18 6-6-6-6", 2.2),
  libro: trazo(LIBRO, 1.8),
  enlace: trazo(
    "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    2
  ),
  lupa: trazo("M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5", 2),
  sol: trazo(
    "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
    1.6
  ),
};

/** Icono de cada categoría de gasto. */
export const ICONOS_GASTO: Record<CategoriaGasto, ReactElement> = {
  Hogar: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  ),
  Alimentación: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 4h2l2.4 11h11L21 7H6.2" />
      <circle cx="9" cy="19.5" r="1.5" />
      <circle cx="17" cy="19.5" r="1.5" />
    </svg>
  ),
  Restaurantes: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3v7a2 2 0 1 0 4 0V3M8 10v11M16 3c-1.7 0-3 2-3 5s1.3 5 3 5 3-2 3-5-1.3-5-3-5zM16 13v8" />
    </svg>
  ),
  Transporte: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 17H3v-5l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 7l2 5v5h-2" />
      <path d="M3 12h18" />
      <circle cx="7.5" cy="17" r="2" />
      <circle cx="16.5" cy="17" r="2" />
    </svg>
  ),
  Ocio: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3z" />
      <path d="M14 6v12" strokeDasharray="2 2" />
    </svg>
  ),
  Salud: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20s-7-4.5-9.3-8.8C1.3 8.2 2.7 5 6 5c2 0 3.3 1 4 2.3.7-1.3 2-2.3 4-2.3 3.3 0 4.7 3.2 3.3 6.2C19 15.5 12 20 12 20z" />
    </svg>
  ),
  Ropa: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-1 2h-6z" />
    </svg>
  ),
  Suscripciones: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 9a8 8 0 0 1 14-4.5M20 4v5h-5M20 15a8 8 0 0 1-14 4.5M4 20v-5h5" />
    </svg>
  ),
  Otros: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  ),
};

export function iconoDeGasto(categoria: string | null): ReactElement {
  return ICONOS_GASTO[categoria as CategoriaGasto] ?? ICONOS_GASTO.Otros;
}
