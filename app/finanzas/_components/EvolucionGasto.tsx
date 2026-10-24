import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import comun from "@/app/components/ui/comun.module.css";
import styles from "@/app/finanzas/analisis.module.css";
import Segmentado from "@/app/components/ui/Segmentado";
import type { PuntoEvolucion, RangoEvolucion, RangoPersonalizado } from "@/lib/finanzas/calc";
import { formatoDinero } from "@/app/finanzas/formato";
import { fechaCorta } from "@/app/components/ui/fechas";

const RANGOS: { value: RangoEvolucion; label: string }[] = [
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "3meses", label: "3 meses" },
  { value: "personalizado", label: "Rango" },
];

const ALTO = 120;

export default function EvolucionGasto({
  puntos,
  rango,
  onRangoChange,
  rangoPersonalizado,
  onRangoPersonalizadoChange,
  diaSeleccionado,
  onDiaClick,
}: {
  puntos: PuntoEvolucion[];
  rango: RangoEvolucion;
  onRangoChange: (rango: RangoEvolucion) => void;
  rangoPersonalizado: RangoPersonalizado;
  onRangoPersonalizadoChange: (rango: RangoPersonalizado) => void;
  diaSeleccionado?: string | null;
  onDiaClick?: (fecha: string) => void;
}) {
  const max = Math.max(...puntos.map((p) => p.total), 1);
  const ancho = Math.max(puntos.length * (rango === "3meses" ? 6 : puntos.length > 45 ? 6 : 18), 100);
  const anchoBarra = rango === "3meses" || puntos.length > 45 ? 4 : 14;
  const hayDatos = puntos.some((p) => p.total > 0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Al cambiar de rango o llegar nuevos datos, mostramos el día más reciente
  // (el último punto de la serie) en vez de dejar el scroll anclado al más antiguo.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [rango, ancho]);

  return (
    <div>
      <Segmentado value={rango} onChange={onRangoChange} options={RANGOS} />
      {rango === "personalizado" && (
        <div className={styles.rangoPersonalizado}>
          <label>
            Desde
            <input
              type="date"
              value={rangoPersonalizado.desde}
              max={rangoPersonalizado.hasta || undefined}
              onChange={(e) => onRangoPersonalizadoChange({ ...rangoPersonalizado, desde: e.target.value })}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={rangoPersonalizado.hasta}
              min={rangoPersonalizado.desde || undefined}
              onChange={(e) => onRangoPersonalizadoChange({ ...rangoPersonalizado, hasta: e.target.value })}
            />
          </label>
        </div>
      )}
      {!hayDatos ? (
        <p className={comun.empty}>Todavía no hay gastos categorizados en este rango.</p>
      ) : (
        <div className={styles.evolucionScroll} ref={scrollRef}>
          <svg
            viewBox={`0 0 ${ancho} ${ALTO}`}
            width={ancho}
            height={ALTO}
            role={onDiaClick ? "group" : "img"}
            aria-label="Evolución del gasto total por día"
            preserveAspectRatio="none"
          >
            <line x1="0" y1={ALTO - 1} x2={ancho} y2={ALTO - 1} stroke="var(--border)" strokeWidth="1" />
            {puntos.map((p, i) => {
              const anchoColumna = ancho / puntos.length;
              const x = i * anchoColumna + (anchoColumna - anchoBarra) / 2;
              const alto = p.total > 0 ? Math.max((p.total / max) * (ALTO - 12), 3) : 0;
              const seleccionado = diaSeleccionado === p.fecha;
              return (
                <g
                  key={p.fecha}
                  style={onDiaClick ? { cursor: "pointer" } : undefined}
                  onClick={onDiaClick ? () => onDiaClick(p.fecha) : undefined}
                  // Cada día es un botón también con teclado y lector de pantalla, no solo con ratón.
                  {...(onDiaClick && {
                    role: "button",
                    tabIndex: 0,
                    "aria-pressed": seleccionado,
                    "aria-label": `${fechaCorta(p.fecha)}: ${formatoDinero(p.total)}`,
                    onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onDiaClick(p.fecha);
                      }
                    },
                  })}
                >
                  <rect
                    x={i * anchoColumna}
                    y={0}
                    width={anchoColumna}
                    height={ALTO - 1}
                    fill={seleccionado ? "var(--fill)" : "transparent"}
                  />
                  <rect
                    x={x}
                    y={ALTO - 1 - alto}
                    width={anchoBarra}
                    height={alto}
                    rx={Math.min(anchoBarra / 2, 4)}
                    fill="var(--hucha)"
                    opacity={p.total > 0 ? 1 : 0.15}
                  >
                    <title>
                      {fechaCorta(p.fecha)}: {formatoDinero(p.total)}
                    </title>
                  </rect>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
