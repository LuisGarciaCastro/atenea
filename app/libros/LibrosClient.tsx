"use client";

import { useMemo, useState } from "react";
import styles from "./estanteria.module.css";
import FichaLibro from "./_components/FichaLibro";
import { Cabecera, ErrorCarga, Esqueleto, Vacio } from "@/app/components/ui/Rincon";
import { T } from "@/app/components/ui/iconos";
import Acciones from "@/app/components/ui/Acciones";
import { useDatos } from "@/app/components/ui/useDatos";
import { useAhora } from "@/app/components/ui/useAhora";
import type { EstadoLibro, Libro } from "@/lib/libros/tipos";
import { diaEnMadrid } from "@/lib/core/fechas";
import { recortar } from "@/app/components/ui/texto";
import { colorLibro } from "./color";

const OBJETIVO_ANUAL = 12;
const SIN_LIBROS: Libro[] = [];

const SEGMENTOS: { estado: EstadoLibro; etiqueta: string }[] = [
  { estado: "leyendo", etiqueta: "Leyendo" },
  { estado: "quiero_leer", etiqueta: "Por leer" },
  { estado: "leido", etiqueta: "Leídos" },
];

function porcentajeLeido(libro: Libro): number {
  if (!libro.pagina_actual || !libro.paginas_totales) return 0;
  return Math.min(100, Math.round((libro.pagina_actual / libro.paginas_totales) * 100));
}

export default function LibrosClient() {
  const { datos, error, cargando, recargar, mutar } = useDatos(
    "/api/libros",
    (j) => (j as { libros?: Libro[] }).libros ?? []
  );
  const libros = datos ?? SIN_LIBROS;
  const [filtro, setFiltro] = useState<EstadoLibro>("leyendo");
  const [abiertoId, setAbiertoId] = useState<number | null>(null);

  // El año sale del navegador: la página es estática y en el build podría ser otro (error de hidratación).
  const ahora = useAhora();
  const anio = ahora ? diaEnMadrid(ahora).slice(0, 4) : null;
  const leidosAnio = useMemo(
    () =>
      anio
        ? libros.filter((l) => l.estado === "leido" && l.fecha_fin && diaEnMadrid(l.fecha_fin).startsWith(anio)).length
        : 0,
    [libros, anio]
  );
  const visibles = useMemo(() => libros.filter((l) => l.estado === filtro), [libros, filtro]);
  const abierto = libros.find((l) => l.id === abiertoId) ?? null;

  function actualizarLocal(libro: Libro) {
    mutar((lista) => lista.map((l) => (l.id === libro.id ? libro : l)));
  }

  function quitarLocal(id: number) {
    mutar((lista) => lista.filter((l) => l.id !== id));
    setAbiertoId(null);
  }

  return (
    <main className={styles.estanteria}>
      <Cabecera
        kicker={anio ? `${leidosAnio} de ${OBJETIVO_ANUAL} leídos en ${anio}` : "\u00a0"}
        titulo="Libros"
        acciones={<Acciones anadir="libro" />}
      />

      <div className={styles.segmentado} role="tablist" aria-label="Filtrar libros">
        {SEGMENTOS.map((s) => (
          <button
            key={s.estado}
            type="button"
            role="tab"
            aria-selected={filtro === s.estado}
            className={`${styles.segmento} ${filtro === s.estado ? styles.segmentoOn : ""}`}
            onClick={() => setFiltro(s.estado)}
          >
            {s.etiqueta} · {libros.filter((l) => l.estado === s.estado).length}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorCarga onReintentar={recargar} />
      ) : cargando ? (
        <Esqueleto alto={360} radio="var(--radius-xl)" />
      ) : visibles.length === 0 ? (
        <Vacio texto={VACIOS[filtro]} />
      ) : filtro === "leyendo" ? (
        <div className={styles.leyendoLista}>
          {visibles.map((libro) => (
            <TarjetaLeyendo key={libro.id} libro={libro} onAbrir={() => setAbiertoId(libro.id)} />
          ))}
        </div>
      ) : (
        <div className={styles.lista}>
          {visibles.map((libro) => (
            <FilaLibro key={libro.id} libro={libro} onAbrir={() => setAbiertoId(libro.id)} />
          ))}
        </div>
      )}

      {abierto && (
        <FichaLibro
          libro={abierto}
          onCerrar={() => setAbiertoId(null)}
          onActualizado={(libro) => {
            actualizarLocal(libro);
            if (libro.estado !== abierto.estado) setFiltro(libro.estado);
          }}
          onQuitado={() => quitarLocal(abierto.id)}
        />
      )}
    </main>
  );
}

const VACIOS: Record<EstadoLibro, string> = {
  leyendo: "No estás leyendo nada ahora. Elige uno de «Por leer» o pulsa + para añadir un libro.",
  quiero_leer: "Tu lista está vacía. Pulsa + para añadir un libro.",
  leido: "Aún no has terminado ningún libro.",
};

/** Portada real si la hay; si no, un bloque de color con el título en serif. */
function Portada({ libro, grande = false }: { libro: Libro; grande?: boolean }) {
  return (
    <span
      className={`${styles.portada} ${grande ? styles.portadaGrande : ""}`}
      style={{ background: colorLibro(libro) }}
      aria-hidden="true"
    >
      {libro.portada_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={libro.portada_url} alt="" />
      ) : (
        grande && (
          <>
            <span className={styles.portadaTitulo}>{recortar(libro.titulo, 40)}</span>
            {libro.autor && <span className={styles.portadaAutor}>{libro.autor}</span>}
          </>
        )
      )}
    </span>
  );
}

function TarjetaLeyendo({ libro, onAbrir }: { libro: Libro; onAbrir: () => void }) {
  const pct = porcentajeLeido(libro);
  return (
    <section className={styles.leyendo} aria-label={libro.titulo}>
      <Portada libro={libro} grande />
      <div className={styles.leyendoTexto}>
        <h2 className={styles.leyendoTitulo}>{libro.titulo}</h2>
        <span className={styles.filaAutor}>{libro.autor ?? "Autor desconocido"}</span>
      </div>
      <div className={styles.leyendoProgreso}>
        <span className={styles.progreso}>
          <i style={{ width: `${pct}%` }} />
        </span>
        <span className={styles.leyendoPie}>
          <span>
            {libro.pagina_actual
              ? `Pág. ${libro.pagina_actual}${libro.paginas_totales ? ` de ${libro.paginas_totales}` : ""}`
              : "Aún sin empezar"}
          </span>
          <b>{pct} %</b>
        </span>
      </div>
      <button type="button" className={styles.actualizar} onClick={onAbrir}>
        Actualizar página
      </button>
    </section>
  );
}

function FilaLibro({ libro, onAbrir }: { libro: Libro; onAbrir: () => void }) {
  const valoracion = libro.valoracion ?? 0;

  return (
    <button type="button" className={styles.fila} onClick={onAbrir}>
      <Portada libro={libro} />
      <div className={styles.filaTexto}>
        <span className={styles.filaTitulo}>{libro.titulo}</span>
        <span className={styles.filaAutor}>{libro.autor ?? "Autor desconocido"}</span>
      </div>
      {libro.estado === "leido" && valoracion > 0 && (
        <span className={styles.estrellas} aria-label={`${valoracion} de 5 estrellas`}>
          {"★".repeat(valoracion)}
          {"☆".repeat(5 - valoracion)}
        </span>
      )}
      <span className={styles.chevron}>{T.fila}</span>
    </button>
  );
}
