"use client";

import { useState } from "react";
import cuaderno from "@/app/contenido/cuaderno.module.css";
import { Cabecera } from "@/app/components/ui/Rincon";
import Acciones from "@/app/components/ui/Acciones";
import VistaNotas from "./_components/VistaNotas";

export default function NotasClient() {
  // El «+» de la cabecera: cada pulsación abre la hoja de nota nueva.
  const [pedirNota, setPedirNota] = useState(0);
  return (
    <main className={cuaderno.cuaderno}>
      <Cabecera
        kicker="Ideas, cosas por investigar y artículos"
        titulo="Notas"
        acciones={<Acciones anadir={{ etiqueta: "Nueva nota", accion: () => setPedirNota((n) => n + 1) }} />}
      />
      <VistaNotas pedirNueva={pedirNota} />
    </main>
  );
}
