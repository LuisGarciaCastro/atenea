import comun from "@/app/components/ui/comun.module.css";
import styles from "@/app/finanzas/analisis.module.css";
import type { ComparativaCategoria, ComercioFrecuente } from "@/lib/finanzas/calc";
import { formatoDinero } from "@/app/finanzas/formato";

export default function AnalisisAdicional({
  comparativa,
  topComerciosLista,
}: {
  comparativa: ComparativaCategoria[];
  topComerciosLista: ComercioFrecuente[];
}) {
  return (
    <>
      <div className={comun.sec}>
        <h2 className={comun.h2}>Comparativa mes a mes</h2>
      </div>
      <section className={`${comun.w} ${comun.wIn}`}>
        {comparativa.length === 0 ? (
          <p className={comun.empty}>Todavía no hay datos suficientes para comparar.</p>
        ) : (
          <ul className={styles.listaLimpia}>
            {comparativa.map((c) => (
              <li key={c.categoria} className={styles.comparativaItem}>
                <span className={styles.comparativaSwatch} style={{ background: c.color }} />
                <span className={styles.comparativaCategoria}>{c.categoria}</span>
                <span className={styles.comparativaValores}>
                  <span className={styles.comparativaActual}>{formatoDinero(c.actual)}</span>
                  <span>vs {formatoDinero(c.anterior)} mes anterior</span>
                </span>
                {c.deltaPct !== null && (
                  <span
                    className={styles.comparativaVariacion}
                    style={{ color: c.deltaPct > 0 ? "var(--danger)" : "var(--positive)" }}
                  >
                    {c.deltaPct > 0 ? "▲" : "▼"} {Math.abs(c.deltaPct).toFixed(0)}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={comun.sec}>
        <h2 className={comun.h2}>Top comercios este mes</h2>
      </div>
      <section className={`${comun.w} ${comun.wIn}`}>
        {topComerciosLista.length === 0 ? (
          <p className={comun.empty}>Todavía no hay gastos categorizados este mes.</p>
        ) : (
          <ol className={styles.listaLimpia}>
            {topComerciosLista.map((t, i) => (
              <li key={t.nombre} className={styles.topItem}>
                <span className={styles.topPosicion}>{i + 1}</span>
                <span className={styles.topNombre}>{t.nombre}</span>
                <span className={styles.topVeces}>
                  {t.veces} {t.veces === 1 ? "vez" : "veces"}
                </span>
                <span className={styles.topTotal}>{formatoDinero(t.total)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
