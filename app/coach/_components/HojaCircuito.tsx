"use client";

import type { ReactNode } from "react";
import Hoja from "@/app/components/ui/Hoja";
import styles from "../coach.module.css";

/** Hoja del coach: la Hoja común, con los colores de las disciplinas disponibles dentro. */
export default function HojaCircuito({
  titulo,
  kicker,
  onCerrar,
  children,
}: {
  titulo: string;
  kicker?: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  return (
    <Hoja kicker={kicker ?? "Coach"} titulo={titulo} onCerrar={onCerrar}>
      <div className={`${styles.circuito} ${styles.contenidoHoja}`}>{children}</div>
    </Hoja>
  );
}
