"use client";

import { useMemo, useState } from "react";
import Acciones from "@/app/components/ui/Acciones";
import comun from "@/app/components/ui/comun.module.css";
import styles from "@/app/finanzas/analisis.module.css";
import DonutCategorias from "@/app/finanzas/_components/DonutCategorias";
import EvolucionGasto from "@/app/finanzas/_components/EvolucionGasto";
import AnalisisAdicional from "@/app/finanzas/_components/AnalisisAdicional";
import FiltrosGastos, { filtrosVacios, type EstadoFiltros } from "@/app/finanzas/_components/FiltrosGastos";
import DesglosePanel from "@/app/finanzas/_components/DesglosePanel";
import GastoItem from "@/app/finanzas/_components/GastoItem";
import { Cabecera, ErrorCarga, Esqueleto, Vacio } from "@/app/components/ui/Rincon";
import { useContador } from "@/app/finanzas/useContador";
import { formatoDinero, formatoFechaLarga } from "@/app/finanzas/formato";
import {
  agruparPorCategoria,
  agruparPorDia,
  calcularResumen,
  comparativaMensualPorCategoria,
  filtrarGastos,
  gastosACsv,
  gastosPorCategoriaEsteMes,
  gastosPorDia,
  ordenarGastos,
  serieDiaria,
  topComercios,
  type RangoEvolucion,
  type RangoPersonalizado,
} from "@/lib/finanzas/calc";
import { CATEGORIAS_GASTO, type Gasto } from "@/lib/finanzas/tipos";
import { useDatos } from "@/app/components/ui/useDatos";
import { diaEnMadrid, sumarDias } from "@/lib/core/fechas";

function rangoPersonalizadoPorDefecto(): RangoPersonalizado {
  const hoy = diaEnMadrid();
  return { desde: sumarDias(hoy, -30), hasta: hoy };
}

const SIN_GASTOS: Gasto[] = [];

export default function AnalisisAvanzadoClient() {
  const { datos, error, cargando, recargar } = useDatos(
    "/api/finanzas",
    (j) => (j as { gastos?: Gasto[] }).gastos ?? []
  );
  const gastos = datos ?? SIN_GASTOS;
  const [rango, setRango] = useState<RangoEvolucion>("mes");
  const [rangoPersonalizado, setRangoPersonalizado] = useState<RangoPersonalizado>(rangoPersonalizadoPorDefecto);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<EstadoFiltros>(filtrosVacios());
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formCategoria, setFormCategoria] = useState<string>(CATEGORIAS_GASTO[0]);
  const [formImporte, setFormImporte] = useState<string>("");

  const resumen = useMemo(() => calcularResumen(gastos), [gastos]);
  const totalMesMostrado = useContador(resumen.totalMesActual, !cargando);
  const totalHoyMostrado = useContador(resumen.totalHoy, !cargando);
  const porCategoria = useMemo(() => agruparPorCategoria(gastos), [gastos]);
  const evolucion = useMemo(
    () => serieDiaria(gastos, rango, new Date(), rangoPersonalizado),
    [gastos, rango, rangoPersonalizado]
  );
  const comparativa = useMemo(() => comparativaMensualPorCategoria(gastos), [gastos]);
  const topComerciosLista = useMemo(() => topComercios(gastos), [gastos]);

  const gastosFiltrados = useMemo(
    () =>
      filtrarGastos(gastos, {
        categoria: filtros.categoria || null,
        texto: filtros.texto,
        importeMin: filtros.importeMin !== "" ? Number(filtros.importeMin.replace(",", ".")) : null,
        desde: filtros.desde || null,
        hasta: filtros.hasta || null,
      }),
    [gastos, filtros]
  );

  const grupos = useMemo(() => agruparPorDia(gastosFiltrados), [gastosFiltrados]);
  const listaOrdenada = useMemo(() => ordenarGastos(gastosFiltrados, filtros.orden), [gastosFiltrados, filtros.orden]);

  const gastosCategoriaSeleccionada = useMemo(
    () => (categoriaSeleccionada ? gastosPorCategoriaEsteMes(gastos, categoriaSeleccionada) : []),
    [gastos, categoriaSeleccionada]
  );
  const gastosDiaSeleccionado = useMemo(
    () => (diaSeleccionado ? gastosPorDia(gastos, diaSeleccionado) : []),
    [gastos, diaSeleccionado]
  );

  function empezarEdicion(gasto: Gasto) {
    setEditandoId(gasto.id);
    setFormCategoria(gasto.categoria ?? CATEGORIAS_GASTO[0]);
    setFormImporte(gasto.importe != null ? String(gasto.importe) : "");
  }

  async function guardarEdicion(id: number) {
    const importe = Number(formImporte.replace(",", "."));
    if (!Number.isFinite(importe) || importe <= 0) return;

    const res = await fetch(`/api/finanzas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoria: formCategoria, importe }),
    }).catch(() => null);
    if (!res?.ok) return window.alert("No he podido guardar el gasto.");
    setEditandoId(null);
    recargar();
  }

  async function borrarGasto(id: number) {
    if (!window.confirm("¿Eliminar este gasto? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/finanzas/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return window.alert("No he podido borrar el gasto.");
    setEditandoId(null);
    recargar();
  }

  function alPincharCategoria(categoria: string) {
    setCategoriaSeleccionada((actual) => (actual === categoria ? null : categoria));
  }

  function alPincharDia(fecha: string) {
    setDiaSeleccionado((actual) => (actual === fecha ? null : fecha));
  }

  function exportarCsv() {
    const csv = gastosACsv(listaOrdenada);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `gastos_${diaEnMadrid()}.csv`;
    enlace.click();
    // Safari aún no ha empezado la descarga al volver de click(): revocar ya la cortaría.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const itemComun = {
    formCategoria,
    formImporte,
    onEmpezarEdicion: empezarEdicion,
    onCategoriaChange: setFormCategoria,
    onImporteChange: setFormImporte,
    onGuardar: guardarEdicion,
    onCancelar: () => setEditandoId(null),
    onBorrar: borrarGasto,
  };

  return (
    <main>
      <Cabecera
        kicker="Hucha"
        titulo="Análisis"
        volver={{ label: "Hucha", href: "/finanzas" }}
        acciones={<Acciones anadir="gasto" />}
      />

      {error ? (
        <ErrorCarga onReintentar={recargar} />
      ) : cargando ? (
        <>
          <Esqueleto alto={120} />
          <div className={comun.sec}>
            <h2 className={comun.h2}>Por categoría este mes</h2>
          </div>
          <Esqueleto alto={220} />
          <div className={comun.sec}>
            <h2 className={comun.h2}>Evolución del gasto</h2>
          </div>
          <Esqueleto alto={220} />
        </>
      ) : (
        <>
          <section className={`${comun.w} ${comun.wIn}`} style={{ marginTop: 16 }}>
            <div className={comun.cap}>Este mes</div>
            <div className={styles.finTop}>
              <div className={comun.big}>{formatoDinero(totalMesMostrado)}</div>
              {resumen.variacionPct !== null && (
                <span
                  className={comun.pill}
                  style={{
                    color: resumen.variacionPct > 0 ? "var(--danger)" : "var(--positive)",
                    background: resumen.variacionPct > 0 ? "var(--danger-soft)" : "var(--positive-soft)",
                  }}
                >
                  {resumen.variacionPct > 0 ? "↑" : "↓"} {Math.abs(resumen.variacionPct).toFixed(0)} % que el mes
                  anterior
                </span>
              )}
            </div>
            <div className={comun.cap} style={{ marginTop: 6 }}>
              Hoy: <b style={{ color: "var(--text)" }}>{formatoDinero(totalHoyMostrado)}</b>
            </div>
          </section>

          <div className={comun.sec}>
            <h2 className={comun.h2}>Por categoría este mes</h2>
          </div>
          <section className={`${comun.w} ${comun.wIn}`}>
            <DonutCategorias
              datos={porCategoria}
              total={resumen.totalMesActual}
              categoriaSeleccionada={categoriaSeleccionada}
              onCategoriaClick={alPincharCategoria}
            />
            {categoriaSeleccionada && (
              <DesglosePanel
                titulo={`${categoriaSeleccionada} · este mes`}
                gastos={gastosCategoriaSeleccionada}
                onClose={() => setCategoriaSeleccionada(null)}
              />
            )}
          </section>

          <div className={comun.sec}>
            <h2 className={comun.h2}>Evolución del gasto</h2>
          </div>
          <section className={`${comun.w} ${comun.wIn}`}>
            <EvolucionGasto
              puntos={evolucion}
              rango={rango}
              onRangoChange={setRango}
              rangoPersonalizado={rangoPersonalizado}
              onRangoPersonalizadoChange={setRangoPersonalizado}
              diaSeleccionado={diaSeleccionado}
              onDiaClick={alPincharDia}
            />
            {diaSeleccionado && (
              <DesglosePanel
                titulo={formatoFechaLarga(diaSeleccionado)}
                gastos={gastosDiaSeleccionado}
                onClose={() => setDiaSeleccionado(null)}
              />
            )}
          </section>

          <AnalisisAdicional comparativa={comparativa} topComerciosLista={topComerciosLista} />

          <div className={styles.gastosCabecera}>
            <h2 className={comun.h2}>Gastos recientes</h2>
            <button
              type="button"
              className={styles.exportarBoton}
              onClick={exportarCsv}
              disabled={listaOrdenada.length === 0}
            >
              Exportar CSV
            </button>
          </div>
          <FiltrosGastos filtros={filtros} onChange={setFiltros} />
          {listaOrdenada.length === 0 ? (
            <Vacio texto="No hay gastos que coincidan con los filtros." />
          ) : filtros.orden !== "fecha" ? (
            <div className={comun.list} style={{ marginTop: 14 }}>
              {listaOrdenada.map((g) => (
                <GastoItem key={g.id} gasto={g} editando={editandoId === g.id} mostrarFecha {...itemComun} />
              ))}
            </div>
          ) : (
            grupos.map((grupo) => (
              <div key={grupo.fecha}>
                <div className={comun.day}>
                  {formatoFechaLarga(grupo.fecha)} · {formatoDinero(grupo.total)}
                </div>
                <div className={comun.list}>
                  {grupo.gastos.map((g) => (
                    <GastoItem key={g.id} gasto={g} editando={editandoId === g.id} {...itemComun} />
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </main>
  );
}
