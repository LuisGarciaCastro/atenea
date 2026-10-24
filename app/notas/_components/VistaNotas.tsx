"use client";

import { useEffect, useState } from "react";
import cuaderno from "@/app/contenido/cuaderno.module.css";
import styles from "./notas.module.css";
import HojaNota from "./HojaNota";
import Segmentado from "@/app/components/ui/Segmentado";
import { ErrorCarga, Esqueleto, Vacio } from "@/app/components/ui/Rincon";
import { T } from "@/app/components/ui/iconos";
import { fechaRelativa } from "@/app/components/ui/fechas";
import { recortar } from "@/app/components/ui/texto";
import { useDatos } from "@/app/components/ui/useDatos";
import { NOMBRE_TIPO_NOTA, type Nota, type TipoNota } from "@/lib/notas/tipos";

type Filtro = "todas" | TipoNota;

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "idea", label: "Ideas" },
  { value: "investigar", label: "Investigar" },
  { value: "articulo", label: "Artículos" },
];

const VACIO: Record<Filtro, string> = {
  todas: "Aún no has apuntado nada. Toca «+ Nueva nota» arriba para tu primera idea.",
  idea: "Ninguna idea pendiente.",
  investigar: "Nada pendiente de investigar.",
  articulo: "Ningún artículo en la cola.",
};

/**
 * Ideas, cosas por investigar y artículos por escribir del usuario. La nota nueva se crea con el
 * «+» de la cabecera de Tareas: cada vez que `pedirNueva` cambia, se abre su hoja.
 */
export default function VistaNotas({ pedirNueva = 0 }: { pedirNueva?: number }) {
  const { datos, error, cargando, recargar, mutar } = useDatos(
    "/api/notas",
    (j) => (j as { notas?: Nota[] }).notas ?? []
  );
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [verHechas, setVerHechas] = useState(false);
  // undefined: hoja cerrada; null: nota nueva; una nota: editarla.
  const [abierta, setAbierta] = useState<Nota | null | undefined>(undefined);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (pedirNueva > 0) setAbierta(null);
  }, [pedirNueva]);

  function sustituir(nota: Nota) {
    mutar((lista) => [nota, ...lista.filter((n) => n.id !== nota.id)]);
  }

  // Marcar desde la lista: se ve al momento y se deshace si la API falla.
  async function alternarHecha(nota: Nota) {
    setAviso(null);
    sustituir({ ...nota, hecha: !nota.hecha });
    const res = await fetch(`/api/notas/${nota.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hecha: !nota.hecha }),
    }).catch(() => null);
    if (res?.ok) sustituir(((await res.json()) as { nota: Nota }).nota);
    else {
      sustituir(nota);
      setAviso("No he podido guardar el cambio.");
    }
  }

  const delFiltro = (datos ?? []).filter((n) => filtro === "todas" || n.tipo === filtro);
  const pendientes = delFiltro.filter((n) => !n.hecha);
  const hechas = delFiltro.filter((n) => n.hecha);

  return (
    <div className={styles.vista}>
      <Segmentado options={FILTROS} value={filtro} onChange={setFiltro} />
      <h2 className={cuaderno.secTitulo}>Pendientes</h2>

      {aviso && <Vacio texto={aviso} />}

      {error ? (
        <ErrorCarga onReintentar={recargar} />
      ) : cargando || !datos ? (
        <Esqueleto alto={180} />
      ) : (
        <>
          {pendientes.length === 0 ? (
            <Vacio texto={VACIO[filtro]} />
          ) : (
            <Lista notas={pendientes} onAbrir={setAbierta} onAlternar={alternarHecha} />
          )}

          {hechas.length > 0 && (
            <>
              <button type="button" className={styles.verHechas} onClick={() => setVerHechas((v) => !v)}>
                {verHechas ? "Ocultar hechas" : `Ver hechas (${hechas.length})`}
              </button>
              {verHechas && <Lista notas={hechas} onAbrir={setAbierta} onAlternar={alternarHecha} />}
            </>
          )}
        </>
      )}

      {abierta !== undefined && (
        <HojaNota
          nota={abierta ?? undefined}
          tipoInicial={filtro === "todas" ? "idea" : filtro}
          onGuardada={sustituir}
          onBorrada={(id) => mutar((lista) => lista.filter((n) => n.id !== id))}
          onCerrar={() => setAbierta(undefined)}
        />
      )}
    </div>
  );
}

function Lista({
  notas,
  onAbrir,
  onAlternar,
}: {
  notas: Nota[];
  onAbrir: (nota: Nota) => void;
  onAlternar: (nota: Nota) => void;
}) {
  return (
    <div className={cuaderno.filas}>
      {notas.map((n) => (
        <div key={n.id} className={styles.fila}>
          <button
            type="button"
            className={`${styles.casilla} ${n.hecha ? styles.casillaHecha : ""}`}
            onClick={() => onAlternar(n)}
            aria-pressed={n.hecha}
            aria-label={`Hecha: ${n.titulo}`}
          >
            <span>{T.check}</span>
          </button>
          <button type="button" className={styles.abrir} onClick={() => onAbrir(n)}>
            <span className={cuaderno.filaTexto}>
              <span className={cuaderno.filaKicker}>{NOMBRE_TIPO_NOTA[n.tipo]}</span>
              <span className={`${cuaderno.filaTitulo} ${n.hecha ? styles.hecha : ""}`}>{n.titulo}</span>
              <span className={cuaderno.filaSub}>
                {n.texto ? `${recortar(n.texto, 80)} · ` : ""}
                {fechaRelativa(n.actualizado_en)}
              </span>
            </span>
            <span className={cuaderno.filaChevron}>{T.fila}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
