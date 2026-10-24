"use client";

import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import styles from "./hoja.module.css";
import { T } from "./iconos";
import { useDialogo } from "./useDialogo";

/** Hoja inferior modal: scrim, asa, cabecera kicker + título y botón cerrar. */
export default function Hoja({
  kicker,
  titulo,
  onCerrar,
  children,
}: {
  kicker: string;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  const dialogo = useDialogo<HTMLDivElement>(onCerrar);

  return createPortal(
    <div className={styles.capa}>
      <div className={styles.scrim} onClick={onCerrar} aria-hidden="true" />
      <div ref={dialogo} className={styles.hoja} role="dialog" aria-modal="true" aria-label={titulo} tabIndex={-1}>
        <div className={styles.asa} aria-hidden="true" />
        <div className={styles.cabecera}>
          <div className={styles.titulos}>
            <span className={styles.kicker}>{kicker}</span>
            <span className={styles.titulo}>{titulo}</span>
          </div>
          <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
            {T.cerrar}
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
