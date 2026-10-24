"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import styles from "./hucha.module.css";
import { Cabecera, ErrorCarga, Esqueleto, Vacio } from "@/app/components/ui/Rincon";
import Acciones from "@/app/components/ui/Acciones";
import HojaGasto from "./_components/HojaGasto";
import { T } from "@/app/components/ui/iconos";
import { MESES, capitalizar, fechaCercana } from "@/app/components/ui/fechas";
import { useCaptura } from "@/app/components/ui/captura/CapturaContext";
import { useDatos } from "@/app/components/ui/useDatos";
import { useAhora } from "@/app/components/ui/useAhora";
import { formatoDinero } from "./formato";
import { agruparPorCategoria, calcularResumen, colorParaCategoria, gastosDelMes } from "@/lib/finanzas/calc";
import type { Gasto } from "@/lib/finanzas/tipos";

/** Meses hacia atrás que cubre /api/finanzas (365 días). */
const MESES_ATRAS = 11;

export default function FinanzasClient() {
  const { avisar } = useCaptura();
  const { datos, error, cargando, recargar, mutar } = useDatos(
    "/api/finanzas",
    (j) => (j as { gastos?: Gasto[] }).gastos ?? []
  );
  const ahora = useAhora();
  // Meses hacia atrás desde el actual: 0 es este mes.
  const [desfase, setDesfase] = useState(0);
  const mesRef = useMemo(
    () => (ahora ? new Date(ahora.getFullYear(), ahora.getMonth() + desfase, 1) : null),
    [ahora, desfase]
  );
  const [borrados, setBorrados] = useState<Set<number>>(new Set());
  const [abiertoId, setAbiertoId] = useState<number | null>(null);

  const gastos = useMemo(() => (datos ?? []).filter((g) => !borrados.has(g.id)), [datos, borrados]);
  const resumen = useMemo(() => mesRef && calcularResumen(gastos, mesRef), [gastos, mesRef]);
  const categorias = useMemo(() => (mesRef ? agruparPorCategoria(gastos, mesRef) : []), [gastos, mesRef]);
  const movimientos = useMemo(() => (mesRef ? gastosDelMes(gastos, mesRef) : []), [gastos, mesRef]);
  const abierto = gastos.find((g) => g.id === abiertoId) ?? null;
  const totalCategorias = categorias.reduce((sum, c) => sum + c.total, 0) || 1;

  const mes = mesRef ? MESES[mesRef.getMonth()] : "";
  const mesAnterior = mesRef ? MESES[(mesRef.getMonth() + 11) % 12] : "";
  const variacion = resumen?.variacionPct ?? null;

  async function borrar(id: number) {
    setAbiertoId(null);
    setBorrados((s) => new Set(s).add(id));
    const res = await fetch(`/api/finanzas/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      avisar("Borrado");
    } else {
      setBorrados((s) => {
        const copia = new Set(s);
        copia.delete(id);
        return copia;
      });
      avisar("No he podido borrarlo");
    }
  }

  const selector = (
    <div className={styles.selectorMes}>
      <button
        type="button"
        className={styles.flecha}
        onClick={() => setDesfase((d) => d - 1)}
        aria-label="Mes anterior"
        // La API solo trae los últimos 365 días: más atrás saldría «0 €» aunque hubiera gastos.
        disabled={desfase <= -MESES_ATRAS}
      >
        {T.anterior}
      </button>
      <span className={styles.mes} aria-live="polite">
        {mesRef ? capitalizar(mes) : "\u00a0"}
      </span>
      <button
        type="button"
        className={styles.flecha}
        onClick={() => setDesfase((d) => d + 1)}
        aria-label="Mes siguiente"
        disabled={desfase === 0}
      >
        {T.siguiente}
      </button>
    </div>
  );

  return (
    <main className={styles.hucha}>
      <Cabecera
        kicker={mesRef ? String(mesRef.getFullYear()) : "\u00a0"}
        titulo="Hucha"
        lateral={selector}
        acciones={<Acciones anadir="gasto" />}
      />

      {error ? (
        <ErrorCarga onReintentar={recargar} />
      ) : cargando || !resumen ? (
        <>
          <Esqueleto alto={96} />
          <Esqueleto alto={220} />
        </>
      ) : (
        <div className={styles.columnas}>
          <div className={styles.columna}>
            <section className={styles.cifraBloque}>
              <span className={styles.etiqueta}>Gastado en {mes}</span>
              <span className={styles.cifra}>{formatoDinero(resumen.totalMesActual)}</span>
              {variacion !== null && (
                <span className={`${styles.delta} ${variacion > 0 ? styles.deltaSube : ""}`}>
                  {variacion > 0 ? "↑" : "↓"} {Math.abs(Math.round(variacion))} % que {mesAnterior}
                </span>
              )}
            </section>

            {categorias.length > 0 && (
              <section className={styles.categorias} aria-label="Por categoría">
                <div className={styles.barraCategorias} aria-hidden="true">
                  {categorias.map((c) => (
                    <i key={c.categoria} style={{ flexGrow: c.total, background: c.color }} />
                  ))}
                </div>
                <ul className={styles.leyenda}>
                  {categorias.map((c) => (
                    <li key={c.categoria} className={styles.categoria}>
                      <i className={styles.punto} style={{ background: c.color }} aria-hidden="true" />
                      <span className={styles.catNombre}>{c.categoria}</span>
                      <span className={styles.pct}>{Math.round((c.total / totalCategorias) * 100)} %</span>
                      <span className={styles.catImporte}>{formatoDinero(c.total)}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/finanzas/avanzado" className={styles.analisis}>
                  Ver análisis completo →
                </Link>
              </section>
            )}
          </div>
          <section className={`${styles.seccion} ${styles.columna}`}>
            <h2 className={styles.secTitulo}>Movimientos</h2>
            {movimientos.length === 0 ? (
              <Vacio texto="Nada apuntado este mes." />
            ) : (
              <div className={styles.movimientos}>
                {movimientos.map((g) => (
                  <Movimiento key={g.id} gasto={g} onAbrir={() => setAbiertoId(g.id)} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {abierto && (
        <HojaGasto
          gasto={abierto}
          onCerrar={() => setAbiertoId(null)}
          onGuardado={(g) => {
            mutar((lista) => lista.map((x) => (x.id === g.id ? g : x)));
            setAbiertoId(null);
            avisar("Guardado ✓");
          }}
          onBorrar={() => borrar(abierto.id)}
        />
      )}
    </main>
  );
}

function Movimiento({ gasto, onAbrir }: { gasto: Gasto; onAbrir: () => void }) {
  const pendiente = gasto.estado === "pendiente_categorizar" || !gasto.categoria;
  const titulo = gasto.descripcion ?? gasto.texto_original;

  return (
    <button type="button" className={styles.movimiento} onClick={onAbrir}>
      <span
        className={`${styles.badge} ${pendiente ? styles.badgePendiente : ""}`}
        style={pendiente ? undefined : ({ "--color": colorParaCategoria(gasto.categoria) } as CSSProperties)}
        aria-hidden="true"
      >
        {pendiente ? "?" : gasto.categoria!.charAt(0)}
      </span>
      <span className={styles.movTexto}>
        <span className={styles.movTitulo}>{titulo}</span>
        <span className={styles.movSub}>
          {pendiente ? "Sin categoría · toca para ponerla" : gasto.categoria} · {fechaCercana(gasto.fecha)}
        </span>
      </span>
      <span className={styles.movImporte}>
        {gasto.importe !== null ? `−${formatoDinero(Number(gasto.importe))}` : "—"}
      </span>
      <span className={styles.chevron}>{T.fila}</span>
    </button>
  );
}
