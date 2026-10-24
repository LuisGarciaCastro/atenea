"use client";

import type { ReactNode } from "react";
import BarraPestanas from "./BarraPestanas";
import BarraLateral from "./BarraLateral";
import { ProveedorCaptura } from "./captura/CapturaContext";
import styles from "./marco.module.css";

/**
 * La página, igual en todos los módulos: barra inferior en el iPhone, barra
 * lateral en el iPad, y la captura rápida y el chat disponibles en todas partes.
 * El contenido es un contenedor (container queries): cada módulo reparte sus
 * columnas según el ancho que le queda, no según el dispositivo.
 */
export default function Marco({ children }: { children: ReactNode }) {
  return (
    <ProveedorCaptura>
      <div className={styles.shell}>
        <BarraLateral />
        <div className={styles.area}>
          <div className={styles.content}>{children}</div>
        </div>
        <BarraPestanas />
      </div>
    </ProveedorCaptura>
  );
}
