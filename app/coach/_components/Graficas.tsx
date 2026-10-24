import styles from "../coach.module.css";

const ALTO = 120;

interface Serie {
  nombre: string;
  color: string;
  valores: (number | null)[];
}

/** Barras simples (una serie) con etiqueta encima de cada barra. */
export function Barras({
  etiquetas,
  valores,
  color,
  formato = (v) => String(v),
  colorDe,
}: {
  etiquetas: string[];
  valores: (number | null)[];
  color?: string;
  formato?: (v: number) => string;
  colorDe?: (v: number) => string;
}) {
  const max = Math.max(...valores.map((v) => Math.abs(v ?? 0)), 1);
  return (
    <div
      className={styles.barras}
      role="img"
      aria-label={etiquetas.map((e, i) => `${e}: ${valores[i] ?? "—"}`).join(", ")}
    >
      {valores.map((v, i) => (
        <div key={i} className={styles.barraCol}>
          <span className={styles.barraValor}>{v === null ? "—" : formato(v)}</span>
          <div className={styles.barraPista}>
            <i
              style={{
                height: `${v === null ? 0 : Math.max(3, (Math.abs(v) / max) * 100)}%`,
                background: v === null ? undefined : colorDe ? colorDe(v) : color,
              }}
            />
          </div>
          <span className={styles.barraEtiqueta}>{etiquetas[i]}</span>
        </div>
      ))}
    </div>
  );
}

/** Barras apiladas: cada columna suma las series. */
export function BarrasApiladas({
  etiquetas,
  series,
  formatoTotal,
}: {
  etiquetas: string[];
  series: Serie[];
  formatoTotal?: (total: number) => string;
}) {
  const totales = etiquetas.map((_, i) => series.reduce((s, x) => s + (x.valores[i] ?? 0), 0));
  const max = Math.max(...totales, 1);
  return (
    <>
      <div className={styles.barras} role="img" aria-label={etiquetas.map((e, i) => `${e}: ${totales[i]}`).join(", ")}>
        {etiquetas.map((e, i) => (
          <div key={i} className={styles.barraCol}>
            <span className={styles.barraValor}>{formatoTotal ? formatoTotal(totales[i]) : totales[i]}</span>
            <div className={styles.barraPista}>
              <div className={styles.pila} style={{ height: `${(totales[i] / max) * 100}%` }}>
                {series.map((s) => (
                  <i key={s.nombre} style={{ flexGrow: s.valores[i] ?? 0, background: s.color }} />
                ))}
              </div>
            </div>
            <span className={styles.barraEtiqueta}>{e}</span>
          </div>
        ))}
      </div>
      <Leyenda series={series} />
    </>
  );
}

/** Líneas sobre un eje común; `cero` dibuja la línea del 0 si el rango la cruza. */
export function Lineas({ etiquetas, series, cero = false }: { etiquetas: string[]; series: Serie[]; cero?: boolean }) {
  const ancho = 300;
  const todos = series.flatMap((s) => s.valores.filter((v): v is number => v !== null));
  const min = Math.min(...todos, cero ? 0 : Infinity);
  const max = Math.max(...todos, cero ? 0 : -Infinity);
  const rango = max - min || 1;
  const x = (i: number) => (etiquetas.length > 1 ? (i / (etiquetas.length - 1)) * ancho : ancho / 2);
  const y = (v: number) => ALTO - 6 - ((v - min) / rango) * (ALTO - 12);

  return (
    <>
      <svg
        className={styles.lineas}
        viewBox={`0 0 ${ancho} ${ALTO}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={series.map((s) => `${s.nombre}: ${s.valores.filter((v) => v !== null).at(-1) ?? "—"}`).join(", ")}
      >
        {cero && min < 0 && max > 0 && <line x1={0} x2={ancho} y1={y(0)} y2={y(0)} className={styles.lineaCero} />}
        {series.map((s) => {
          const puntos = s.valores
            .map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
            .filter(Boolean)
            .join(" ");
          return (
            <polyline
              key={s.nombre}
              points={puntos}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className={styles.ejeX}>
        <span>{etiquetas[0]}</span>
        <span>{etiquetas.at(-1)}</span>
      </div>
      {series.length > 1 && <Leyenda series={series} />}
    </>
  );
}

function Leyenda({ series }: { series: Serie[] }) {
  return (
    <div className={styles.leyenda}>
      {series.map((s) => (
        <span key={s.nombre}>
          <i style={{ background: s.color }} />
          {s.nombre}
        </span>
      ))}
    </div>
  );
}
