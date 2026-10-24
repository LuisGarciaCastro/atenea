"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Toast from "./Toast";
import HojaCaptura from "./HojaCaptura";
import PanelChat from "../chat/PanelChat";

export type HojaCapturaId = "pick" | "gasto" | "libro" | "enlace";

interface Captura {
  hoja: HojaCapturaId | null;
  abrir: (hoja: HojaCapturaId) => void;
  cerrar: () => void;
  avisar: (texto: string) => void;
  /** Sube cada vez que se guarda algo desde la captura: las páginas lo usan para recargar. */
  version: number;
  guardado: (aviso: string) => void;
  /** El chat «Pregúntame»: se abre desde la cabecera de cada pantalla o la barra lateral. */
  abrirChat: () => void;
}

const CapturaContext = createContext<Captura | null>(null);

export function useCaptura(): Captura {
  const ctx = useContext(CapturaContext);
  if (!ctx) throw new Error("useCaptura debe usarse dentro de <ProveedorCaptura>");
  return ctx;
}

const DURACION_TOAST_MS = 1800;

export function ProveedorCaptura({ children }: { children: ReactNode }) {
  const [hoja, setHoja] = useState<HojaCapturaId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [chat, setChat] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avisar = useCallback((texto: string) => {
    setToast(texto);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), DURACION_TOAST_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const guardado = useCallback(
    (aviso: string) => {
      setHoja(null);
      setVersion((v) => v + 1);
      avisar(aviso);
    },
    [avisar]
  );

  const valor = useMemo<Captura>(
    () => ({
      hoja,
      abrir: setHoja,
      cerrar: () => setHoja(null),
      avisar,
      version,
      guardado,
      abrirChat: () => setChat(true),
    }),
    [hoja, avisar, version, guardado]
  );

  return (
    <CapturaContext.Provider value={valor}>
      {children}
      <HojaCaptura />
      {chat && <PanelChat onCerrar={() => setChat(false)} />}
      <Toast texto={toast} />
    </CapturaContext.Provider>
  );
}
