"use client";

import { useEffect, useRef } from "react";

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Comportamiento de un diálogo modal hecho a mano: Escape cierra, la página de
 * detrás no hace scroll, el foco entra al abrir, Tab no se escapa del diálogo y,
 * al cerrar, el foco vuelve a donde estaba. Devuelve la ref para el contenedor
 * con `role="dialog"` y `tabIndex={-1}`.
 */
export function useDialogo<T extends HTMLElement>(onCerrar: () => void) {
  const ref = useRef<T>(null);
  // En una ref para que una lambda nueva en cada render no reinicie el efecto (y robe el foco).
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    const previo = document.activeElement as HTMLElement | null;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // El foco entra en el propio diálogo (el lector anuncia su título), salvo que
    // un campo con autoFocus ya lo tenga.
    if (!dialogo.contains(document.activeElement)) dialogo.focus();

    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrar.current();
        return;
      }
      if (e.key !== "Tab") return;
      const enfocables = [...dialogo.querySelectorAll<HTMLElement>(ENFOCABLES)];
      if (enfocables.length === 0) return e.preventDefault();
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      // Con el foco en el propio contenedor (al abrir) o fuera, el navegador lo sacaría del diálogo.
      if (!enfocables.includes(document.activeElement as HTMLElement)) {
        e.preventDefault();
        (e.shiftKey ? ultimo : primero).focus();
      } else if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", alPulsar);

    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = overflowPrevio;
      previo?.focus?.();
    };
  }, []);

  return ref;
}
