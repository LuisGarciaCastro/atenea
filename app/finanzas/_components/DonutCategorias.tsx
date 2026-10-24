import comun from "@/app/components/ui/comun.module.css";
import styles from "@/app/finanzas/analisis.module.css";
import type { PorcionCategoria } from "@/lib/finanzas/calc";
import { formatoDinero } from "@/app/finanzas/formato";

const RADIO = 70;
const GROSOR = 22;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

export default function DonutCategorias({
  datos,
  total,
  categoriaSeleccionada,
  onCategoriaClick,
}: {
  datos: PorcionCategoria[];
  total: number;
  categoriaSeleccionada?: string | null;
  onCategoriaClick?: (categoria: string) => void;
}) {
  if (total <= 0) {
    return <p className={comun.empty}>Sin gastos categorizados este mes todavía.</p>;
  }

  let acumulado = 0;

  return (
    <div className={styles.donutWrap}>
      <svg
        viewBox="0 0 180 180"
        className={styles.donutSvg}
        role="img"
        aria-label="Reparto de gasto por categoría este mes"
      >
        <circle cx="90" cy="90" r={RADIO} fill="none" stroke="var(--fill)" strokeWidth={GROSOR} />
        {datos.map((d) => {
          const fraccion = d.total / total;
          const largo = Math.max(fraccion * CIRCUNFERENCIA - 2, 0);
          const dashoffset = -acumulado;
          acumulado += fraccion * CIRCUNFERENCIA;
          const atenuado = categoriaSeleccionada != null && categoriaSeleccionada !== d.categoria;
          return (
            <circle
              key={d.categoria}
              cx="90"
              cy="90"
              r={RADIO}
              fill="none"
              stroke={d.color}
              strokeWidth={GROSOR}
              strokeDasharray={`${largo} ${CIRCUNFERENCIA - largo}`}
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
              opacity={atenuado ? 0.35 : 1}
              transform="rotate(-90 90 90)"
              style={{
                transition: "opacity 0.3s var(--ease)",
                cursor: onCategoriaClick ? "pointer" : undefined,
              }}
              onClick={onCategoriaClick ? () => onCategoriaClick(d.categoria) : undefined}
            >
              <title>
                {d.categoria}: {formatoDinero(d.total)}
              </title>
            </circle>
          );
        })}
        <text x="90" y="86" textAnchor="middle" className={styles.donutTotalLabel}>
          Total
        </text>
        <text x="90" y="107" textAnchor="middle" className={styles.donutTotalValor}>
          {formatoDinero(total)}
        </text>
      </svg>
      <ul className={styles.leyenda}>
        {datos.map((d) => {
          const activo = categoriaSeleccionada === d.categoria;
          return (
            <li key={d.categoria} className={styles.leyendaItem}>
              <button
                type="button"
                className={`${styles.leyendaBoton} ${activo ? styles.leyendaBotonActivo : ""}`}
                onClick={onCategoriaClick ? () => onCategoriaClick(d.categoria) : undefined}
                disabled={!onCategoriaClick}
              >
                <span className={styles.leyendaSwatch} style={{ background: d.color }} />
                <span className={styles.leyendaLabel}>{d.categoria}</span>
                <span className={styles.leyendaValor}>{formatoDinero(d.total)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
