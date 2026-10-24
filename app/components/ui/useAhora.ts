"use client";

import { useEffect, useState } from "react";

/**
 * La hora del navegador, fijada al montar. En el render del servidor (o del build,
 * si la página es estática) aún no se conoce: hasta entonces es null, y así la
 * fecha que se pinta nunca difiere entre servidor y cliente al hidratar.
 */
export function useAhora(): Date | null {
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => setAhora(new Date()), []);
  return ahora;
}
