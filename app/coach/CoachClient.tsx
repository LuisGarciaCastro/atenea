"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./coach.module.css";
import { useDatos } from "@/app/components/ui/useDatos";
import BarraCircuito, { type VistaPrincipal } from "./_components/BarraCircuito";
import VistaHoy from "./_components/VistaHoy";
import VistaSemana from "./_components/VistaSemana";
import VistaProgreso, { type Secundaria } from "./_components/VistaProgreso";
import VistaForma from "./_components/VistaForma";
import VistaCuaderno from "./_components/VistaCuaderno";
import { FichaEntreno, VistaEntrenos, VistaRecuperacion } from "./_components/VistasDiarias";
import FichaSesion from "./_components/FichaSesion";
import { diaPlan, semanaDe } from "./circuito";
import { Cabecera, ErrorCarga, Esqueleto, Vacio } from "@/app/components/ui/Rincon";
import Acciones from "@/app/components/ui/Acciones";
import { diaEnMadrid } from "@/lib/core/fechas";
import type { DatosCoach } from "@/lib/coach/tipos";

type Vista = VistaPrincipal | Secundaria | "recuperacion";

const VOLVER: Record<Exclude<Vista, VistaPrincipal>, VistaPrincipal> = {
  recuperacion: "hoy",
  entrenos: "progreso",
  forma: "progreso",
  cuaderno: "progreso",
};

const VISTAS: Vista[] = ["hoy", "semana", "progreso", "recuperacion", "entrenos", "forma", "cuaderno"];

const VOLVER_ETIQUETA: Record<VistaPrincipal, string> = { hoy: "Hoy", semana: "Semana", progreso: "Progreso" };

const TITULOS: Record<Exclude<Vista, VistaPrincipal>, string> = {
  recuperacion: "Recuperación",
  entrenos: "Entrenos",
  forma: "Forma y fatiga",
  cuaderno: "Cuaderno",
};

export default function CoachClient() {
  const { datos, error, cargando, recargar } = useDatos("/api/coach", (j) => (j as { datos: DatosCoach | null }).datos);
  // La vista va en la URL (?vista=semana): así funcionan «atrás» (y el gesto del iPhone) y recargar.
  const router = useRouter();
  const parametros = useSearchParams();
  const pedida = parametros.get("vista") as Vista | null;
  const vista: Vista = pedida && VISTAS.includes(pedida) ? pedida : "hoy";
  const setVista = (v: Vista) => router.push(v === "hoy" ? "/coach" : `/coach?vista=${v}`);
  const [entrenoId, setEntrenoId] = useState<string | null>(null);
  const [sesionFecha, setSesionFecha] = useState<string | null>(null);
  const [hoy] = useState(() => diaEnMadrid());

  const entreno = datos?.workouts.find((w) => w.id === entrenoId) ?? null;
  const sesionDia = datos && sesionFecha ? diaPlan(datos, sesionFecha) : null;
  const principal: VistaPrincipal | null = vista === "hoy" || vista === "semana" || vista === "progreso" ? vista : null;

  const semanaActual = datos ? semanaDe(datos, hoy) : null;

  return (
    <div className={styles.circuito}>
      <main className={styles.pagina}>
        {principal ? (
          <>
            <Cabecera
              kicker={semanaActual ? `${semanaActual.label} · Rumbo a la meta` : "Rumbo a la meta"}
              titulo="Coach"
              acciones={<Acciones />}
            />
            <BarraCircuito activa={principal} onCambiar={setVista} />
          </>
        ) : (
          <Cabecera
            titulo={TITULOS[vista as keyof typeof TITULOS]}
            volver={{
              label: VOLVER_ETIQUETA[VOLVER[vista as keyof typeof VOLVER]],
              onClick: () => setVista(VOLVER[vista as keyof typeof VOLVER]),
            }}
            acciones={<Acciones />}
          />
        )}

        {error ? (
          <ErrorCarga onReintentar={recargar} />
        ) : cargando ? (
          <div className={styles.vista} aria-hidden="true">
            <Esqueleto alto={260} radio="var(--radius-xl)" />
            <Esqueleto alto={120} />
            <Esqueleto alto={160} />
          </div>
        ) : !datos ? (
          <Vacio texto="Tu coach aún no ha publicado nada. La primera revisión llega a las 9:15." />
        ) : (
          <div key={vista} className={styles.transicion}>
            {vista === "hoy" && (
              <VistaHoy
                datos={datos}
                hoy={hoy}
                onEntreno={setEntrenoId}
                onSesion={setSesionFecha}
                onSecundaria={() => setVista("recuperacion")}
              />
            )}
            {vista === "semana" && (
              <VistaSemana datos={datos} hoy={hoy} onEntreno={setEntrenoId} onSesion={setSesionFecha} />
            )}
            {vista === "progreso" && (
              <VistaProgreso datos={datos} hoy={hoy} onEntreno={setEntrenoId} onSecundaria={setVista} />
            )}
            {!principal && (
              <div className={styles.vista}>
                {vista === "recuperacion" && <VistaRecuperacion datos={datos} />}
                {vista === "entrenos" && <VistaEntrenos datos={datos} onEntreno={setEntrenoId} />}
                {vista === "forma" && <VistaForma datos={datos} />}
                {vista === "cuaderno" && <VistaCuaderno cuaderno={datos.cuaderno} />}
              </div>
            )}
            <p className={styles.actualizado}>Actualizado el {datos.generatedLabel}</p>
          </div>
        )}
      </main>

      {entreno && <FichaEntreno entreno={entreno} onCerrar={() => setEntrenoId(null)} />}
      {sesionDia && <FichaSesion dia={sesionDia} onCerrar={() => setSesionFecha(null)} />}
    </div>
  );
}
