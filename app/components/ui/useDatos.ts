"use client";

import { useCallback, useEffect, useState } from "react";
import { useCaptura } from "./captura/CapturaContext";

export interface Datos<T> {
  datos: T | null;
  error: boolean;
  /** La API respondió 404. */
  noEncontrado: boolean;
  cargando: boolean;
  recargar: () => void;
  /** Cambia los datos ya cargados sin volver a pedirlos (tras crear, editar o borrar). */
  mutar: (cambio: (datos: T) => T) => void;
}

/**
 * GET a una API de la app. Se recarga sola cuando la captura rápida guarda
 * algo (version), para que la pantalla refleje lo recién apuntado. Con
 * `url = null` no pide nada.
 */
export function useDatos<T>(url: string | null, extraer: (json: unknown) => T): Datos<T> {
  const { version } = useCaptura();
  // Los datos recuerdan de qué URL vienen: al cambiar de URL no se enseñan los de la anterior.
  const [cargados, setCargados] = useState<{ url: string; datos: T } | null>(null);
  const [error, setError] = useState(false);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!url) return;
    const control = new AbortController();
    setError(false);
    setNoEncontrado(false);
    fetch(url, { signal: control.signal })
      .then((res) => {
        if (res.status === 404) setNoEncontrado(true);
        return res.ok ? res.json() : Promise.reject(new Error(String(res.status)));
      })
      .then((json) => setCargados({ url, datos: extraer(json) }))
      .catch(() => {
        if (!control.signal.aborted) setError(true);
      });
    return () => control.abort();
    // `extraer` suele ser una lambda inline; recargar por ella entraría en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, version, intento]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);
  const mutar = useCallback(
    (cambio: (datos: T) => T) => setCargados((c) => (c ? { url: c.url, datos: cambio(c.datos) } : c)),
    []
  );

  const listos = cargados !== null && cargados.url === url;
  const datos = listos ? cargados.datos : null;
  // Se mira si ya llegó la respuesta, no si hay datos: una API puede responder `null` (p. ej. el
  // coach aún no ha publicado) y eso es un estado vacío, no una carga infinita.
  return { datos, error, noEncontrado, cargando: url !== null && !listos && !error, recargar, mutar };
}
