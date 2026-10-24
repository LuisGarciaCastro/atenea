import { useEffect, useRef, useState } from "react";

const DURACION_MS = 900;
const EASE_OUT_EXPO = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Anima un número desde 0 hasta `valor` al montar o cuando `valor` cambia
 * de forma significativa (p. ej. al terminar de cargar). Devuelve el valor
 * final directamente si el usuario prefiere movimiento reducido.
 */
export function useContador(valor: number, activo: boolean): number {
  const [mostrado, setMostrado] = useState(activo ? 0 : valor);
  const previo = useRef(valor);

  useEffect(() => {
    if (!activo) {
      setMostrado(valor);
      return;
    }

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMostrado(valor);
      return;
    }

    const inicio = previo.current;
    const delta = valor - inicio;
    if (delta === 0) {
      setMostrado(valor);
      return;
    }

    let frame: number;
    const t0 = performance.now();

    function tick(ahora: number) {
      const progreso = Math.min((ahora - t0) / DURACION_MS, 1);
      setMostrado(inicio + delta * EASE_OUT_EXPO(progreso));
      if (progreso < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        previo.current = valor;
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [valor, activo]);

  return mostrado;
}
