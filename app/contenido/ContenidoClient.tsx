"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./cuaderno.module.css";
import miniatura from "./_components/miniatura.module.css";
import { paletaPara } from "./_components/paleta";
import { recortar } from "@/app/components/ui/texto";
import { Cabecera, ErrorCarga, Esqueleto, Vacio as VacioBase } from "@/app/components/ui/Rincon";
import Acciones from "@/app/components/ui/Acciones";
import { T } from "@/app/components/ui/iconos";
import { fechaRelativa } from "@/app/components/ui/fechas";
import { useDatos, type Datos as Estado } from "@/app/components/ui/useDatos";
import type { PersonaConConteo, ResultadoBusqueda, TemaConConteo, VideoConHighlight } from "@/lib/contenido/tipos";
import type { Guardado } from "@/lib/guardados/tipos";
import { FILTROS, type Filtro } from "./filtros";

const ESPERA_BUSQUEDA_MS = 300;

const TIPO_RESULTADO: Record<ResultadoBusqueda["tipo"], { kicker: string; ruta: string }> = {
  video: { kicker: "Vídeo", ruta: "/contenido/videos/" },
  tema: { kicker: "Tema", ruta: "/contenido/temas/" },
  persona: { kicker: "Persona", ruta: "/contenido/personas/" },
};

function hostDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function ContenidoClient({ filtroInicial = "Todo" }: { filtroInicial?: Filtro }) {
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), ESPERA_BUSQUEDA_MS);
    return () => clearTimeout(t);
  }, [q]);

  const buscando = qDebounced.length > 0;
  const quiereVideos = !buscando && (filtro === "Todo" || filtro === "Vídeos");
  const quiereGuardados = !buscando && (filtro === "Todo" || filtro === "Guardados");

  const videos = useDatos(
    quiereVideos ? "/api/contenido/videos" : null,
    (j) => (j as { videos?: VideoConHighlight[] }).videos ?? []
  );
  const guardados = useDatos(
    quiereGuardados ? "/api/guardados" : null,
    (j) => (j as { guardados?: Guardado[] }).guardados ?? []
  );
  const temas = useDatos(
    !buscando && filtro === "Temas" ? "/api/contenido/temas" : null,
    (j) => (j as { temas?: TemaConConteo[] }).temas ?? []
  );
  const personas = useDatos(
    !buscando && filtro === "Personas" ? "/api/contenido/personas" : null,
    (j) => (j as { personas?: PersonaConConteo[] }).personas ?? []
  );
  const resultados = useDatos(
    buscando ? `/api/contenido/buscar?q=${encodeURIComponent(qDebounced)}` : null,
    (j) => (j as { resultados?: ResultadoBusqueda[] }).resultados ?? []
  );

  return (
    <main className={styles.cuaderno}>
      <Cabecera
        kicker={
          videos.datos
            ? `${videos.datos.length} vídeos · ${videos.datos.reduce((a, v) => a + v.highlight_count, 0)} highlights`
            : "Vídeos y guardados"
        }
        titulo="Ideas"
        acciones={<Acciones anadir="enlace" />}
      />

      <label className={styles.buscador}>
        {T.lupa}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Vídeos, temas, personas"
          aria-label="Buscar"
          type="search"
        />
      </label>

      <div className={styles.chips} role="tablist" aria-label="Filtrar el cuaderno">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filtro === f}
            className={`${styles.chip} ${filtro === f && !buscando ? styles.chipOn : ""}`}
            onClick={() => {
              setFiltro(f);
              setQ("");
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {buscando ? (
        <Bloque estado={resultados}>
          {(lista) =>
            lista.length === 0 ? (
              <Vacio />
            ) : (
              <div className={styles.filas}>
                {lista.map((r) => (
                  <Link
                    key={`${r.tipo}-${r.id}`}
                    href={`${TIPO_RESULTADO[r.tipo].ruta}${r.slug}`}
                    className={styles.fila}
                  >
                    <div className={styles.filaTexto}>
                      <span className={styles.filaKicker}>{TIPO_RESULTADO[r.tipo].kicker}</span>
                      <span className={styles.filaTitulo}>{r.titulo}</span>
                      {r.extracto && <span className={styles.filaSub}>{recortar(r.extracto, 90)}</span>}
                    </div>
                    <span className={styles.filaChevron}>{T.fila}</span>
                  </Link>
                ))}
              </div>
            )
          }
        </Bloque>
      ) : filtro === "Temas" ? (
        <Bloque estado={temas}>
          {(lista) =>
            lista.length === 0 ? (
              <Vacio />
            ) : (
              <div className={styles.filas}>
                {lista.map((t) => (
                  <Fila
                    key={t.id}
                    href={`/contenido/temas/${t.slug}`}
                    titulo={t.nombre}
                    sub={`${t.videoCount} vídeo${t.videoCount === 1 ? "" : "s"}`}
                  />
                ))}
              </div>
            )
          }
        </Bloque>
      ) : filtro === "Personas" ? (
        <Bloque estado={personas}>
          {(lista) =>
            lista.length === 0 ? (
              <Vacio />
            ) : (
              <div className={styles.filas}>
                {lista.map((p) => (
                  <Fila
                    key={p.id}
                    href={`/contenido/personas/${p.slug}`}
                    titulo={p.nombre}
                    sub={`${p.videoCount} vídeo${p.videoCount === 1 ? "" : "s"}`}
                  />
                ))}
              </div>
            )
          }
        </Bloque>
      ) : filtro === "Guardados" ? (
        <Bloque estado={guardados}>
          {(lista) =>
            lista.length === 0 ? (
              <Vacio />
            ) : (
              <div className={styles.filas}>
                {lista.map((g) => (
                  <Fila
                    key={g.id}
                    href={g.url}
                    externo
                    titulo={g.titulo ?? hostDe(g.url)}
                    sub={`${g.fuente} · ${fechaRelativa(g.creado_en)}`}
                  />
                ))}
              </div>
            )
          }
        </Bloque>
      ) : (
        <Papelitos filtro={filtro} videos={videos} guardados={guardados} />
      )}
      {filtro === "Guardados" && !buscando && (
        <Link href="/contenido/guardados" className={styles.verTodos}>
          Ver todos los guardados →
        </Link>
      )}
    </main>
  );
}

function Bloque<T>({ estado, children }: { estado: Estado<T>; children: (datos: T) => ReactNode }) {
  if (estado.error) return <ErrorCarga onReintentar={estado.recargar} />;
  if (estado.cargando || estado.datos === null) return <Esqueleto alto={160} />;
  return <>{children(estado.datos)}</>;
}

function Vacio() {
  return <VacioBase texto="Nada por aquí con ese filtro." />;
}

function Fila({
  href,
  titulo,
  sub,
  externo = false,
}: {
  href: string;
  titulo: string;
  sub: string;
  externo?: boolean;
}) {
  const contenido = (
    <>
      <div className={styles.filaTexto}>
        <span className={styles.filaTitulo}>{titulo}</span>
        <span className={styles.filaSub}>{sub}</span>
      </div>
      <span className={styles.filaChevron}>{T.fila}</span>
    </>
  );
  return externo ? (
    <a href={href} className={styles.fila} target="_blank" rel="noopener noreferrer">
      {contenido}
    </a>
  ) : (
    <Link href={href} className={styles.fila}>
      {contenido}
    </Link>
  );
}

interface Nota {
  clave: string;
  fecha: string;
  kicker: string | null;
  titulo: string;
  extracto: string | null;
  href: string;
  externo: boolean;
  /** Solo vídeos: miniatura y duración. */
  video: { miniatura: string | null; duracion: number | null; canal: string | null; highlights: number } | null;
}

function duracion(seg: number | null): string | null {
  if (!seg) return null;
  const m = Math.floor(seg / 60);
  return `${m}:${String(Math.round(seg % 60)).padStart(2, "0")}`;
}

function Papelitos({
  filtro,
  videos,
  guardados,
}: {
  filtro: Filtro;
  videos: Estado<VideoConHighlight[]>;
  guardados: Estado<Guardado[]>;
}) {
  const conGuardados = filtro === "Todo";

  const notas = useMemo<Nota[]>(() => {
    const deVideos: Nota[] = (videos.datos ?? []).map((v) => ({
      clave: `v-${v.id}`,
      fecha: v.fecha_procesado ?? v.creado_en,
      kicker: v.tema_principal ?? v.canal,
      titulo: v.titulo,
      extracto: v.highlight_destacado,
      href: `/contenido/videos/${v.youtube_id}`,
      externo: false,
      video: { miniatura: v.miniatura_url, duracion: v.duracion_seg, canal: v.canal, highlights: v.highlight_count },
    }));
    const deGuardados: Nota[] = conGuardados
      ? (guardados.datos ?? []).map((g) => ({
          clave: `g-${g.id}`,
          fecha: g.creado_en,
          kicker: `Guardado · ${g.fuente}`,
          titulo: g.titulo ?? hostDe(g.url),
          extracto: recortar(g.nota, 90),
          href: g.url,
          externo: true,
          video: null,
        }))
      : [];
    return [...deVideos, ...deGuardados].sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [videos.datos, guardados.datos, conGuardados]);

  if (videos.error) return <ErrorCarga onReintentar={videos.recargar} />;
  if (videos.cargando || (conGuardados && guardados.cargando)) {
    return (
      <>
        <Esqueleto alto={320} radio="var(--radius-xl)" />
        <Esqueleto alto={140} />
      </>
    );
  }
  if (notas.length === 0) return <Vacio />;

  // El último vídeo, en grande; el resto (vídeos y guardados), en la lista.
  const destacada = notas.find((n) => n.video) ?? null;
  const lista = notas.filter((n) => n !== destacada);

  return (
    <div className={styles.todo}>
      {destacada && <Destacada nota={destacada} />}
      {lista.length > 0 && (
        <section className={styles.seccion}>
          <h2 className={styles.secTitulo}>Recientes</h2>
          <div className={styles.filas}>
            {lista.map((n) => (
              <FilaNota key={n.clave} nota={n} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Enlace({ nota, className, children }: { nota: Nota; className: string; children: ReactNode }) {
  return nota.externo ? (
    <a href={nota.href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <Link href={nota.href} className={className}>
      {children}
    </Link>
  );
}

function Destacada({ nota }: { nota: Nota }) {
  const [c1, c2] = paletaPara(nota.titulo);
  const v = nota.video!;
  const dur = duracion(v.duracion);
  return (
    <Enlace nota={nota} className={styles.destacada}>
      <span className={miniatura.thumb} style={{ "--c1": c1, "--c2": c2, borderRadius: 0 } as CSSProperties}>
        {v.miniatura && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.miniatura} alt="" />
        )}
        <span className={miniatura.play}>{T.reproducir}</span>
        {dur && <span className={miniatura.dur}>{dur}</span>}
      </span>
      <span className={styles.destacadaTexto}>
        <span className={styles.filaKicker}>
          {nota.kicker ?? "Vídeo"} · {fechaRelativa(nota.fecha)}
        </span>
        <span className={styles.destacadaTitulo}>{nota.titulo}</span>
        <span className={styles.filaSub}>
          {[v.canal, `${v.highlights} highlight${v.highlights === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
        </span>
        {nota.extracto && <span className={styles.cita}>“{recortar(nota.extracto, 160)}”</span>}
      </span>
    </Enlace>
  );
}

function FilaNota({ nota }: { nota: Nota }) {
  const [c1, c2] = paletaPara(nota.titulo);
  return (
    <Enlace nota={nota} className={styles.fila}>
      {nota.video ? (
        <span className={`${miniatura.thumb} ${styles.miniThumb}`} style={{ "--c1": c1, "--c2": c2 } as CSSProperties}>
          {nota.video.miniatura && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nota.video.miniatura} alt="" />
          )}
        </span>
      ) : (
        <span className={styles.icono} aria-hidden="true">
          {T.enlace}
        </span>
      )}
      <span className={styles.filaTexto}>
        <span className={styles.filaTitulo}>{nota.titulo}</span>
        <span className={styles.filaSub}>
          {nota.kicker ?? (nota.video ? "Vídeo" : "Guardado")} · {fechaRelativa(nota.fecha)}
        </span>
      </span>
      <span className={styles.filaChevron}>{T.fila}</span>
    </Enlace>
  );
}
