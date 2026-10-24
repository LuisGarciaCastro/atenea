"use client";

import { useEffect, useState } from "react";

/**
 * Entrada escalonada de las tarjetas: activa la clase «in» tras `retardoMs`
 * (y no al montar) para que la cascada entre widgets se vea.
 */
export function useEntrada(retardoMs = 0): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const fotograma = requestAnimationFrame(() => {
      temporizador = setTimeout(() => setVisible(true), retardoMs);
    });
    return () => {
      cancelAnimationFrame(fotograma);
      clearTimeout(temporizador);
    };
  }, [retardoMs]);

  return visible;
}
