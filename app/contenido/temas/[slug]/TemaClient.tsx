"use client";

import Link from "next/link";
import comun from "@/app/components/ui/comun.module.css";
import { ErrorCarga, Esqueleto } from "@/app/components/ui/Rincon";
import { useDatos } from "@/app/components/ui/useDatos";
import { T } from "@/app/components/ui/iconos";
import styles from "@/app/contenido/detalle.module.css";
import { formatoFecha } from "@/app/contenido/formato";
import AvatarPersona from "@/app/contenido/_components/AvatarPersona";
import Volver from "@/app/contenido/_components/Volver";
import type { TemaCompleto } from "@/lib/contenido/tipos";

export default function TemaClient({ slug }: { slug: string }) {
  const {
    datos: tema,
    error,
    noEncontrado,
    recargar,
  } = useDatos(`/api/contenido/temas/${encodeURIComponent(slug)}`, (j) => (j as { tema: TemaCompleto }).tema);

  if (!tema) {
    return (
      <main className={comun.lectura}>
        <Volver filtro="temas" />
        {noEncontrado ? (
          <p className={comun.empty}>No se encontró este tema.</p>
        ) : error ? (
          <ErrorCarga onReintentar={recargar} />
        ) : (
          <Esqueleto alto={160} style={{ marginTop: 8 }} />
        )}
      </main>
    );
  }

  const pesoMax = tema.temasRelacionados[0]?.peso || 1;

  return (
    <main className={comun.lectura}>
      <Volver filtro="temas" />

      <h1 className={comun.h1}>{tema.nombre}</h1>
      {tema.resumen && (
        <p className={comun.cap} style={{ marginTop: 8 }}>
          {tema.resumen}
        </p>
      )}

      <div className={comun.sec}>
        <h2 className={comun.h2}>Vídeos que lo tocan</h2>
        <span className={comun.cap}>{tema.videos.length}</span>
      </div>
      {tema.videos.length === 0 ? (
        <p className={comun.empty}>Aún ningún vídeo procesado toca este tema.</p>
      ) : (
        <div className={comun.list} style={{ padding: "0 16px" }}>
          {tema.videos.map((video) => (
            <Link key={video.id} href={`/contenido/videos/${video.youtube_id}`} className={styles.videoRow}>
              <span className={styles.videoThumb}>
                {video.miniatura_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.miniatura_url} alt="" />
                )}
              </span>
              <div className={styles.videoInfo}>
                <b>{video.titulo}</b>
                <span>
                  {video.canal ?? "Canal desconocido"}
                  {video.fecha_publicacion ? ` · ${formatoFecha(video.fecha_publicacion)}` : ""}
                </span>
                {video.highlight_destacado && <span className={styles.quote}>“{video.highlight_destacado}”</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {tema.personas.length > 0 && (
        <>
          <div className={comun.sec}>
            <h2 className={comun.h2}>Personas relacionadas</h2>
          </div>
          <div className={comun.list}>
            {tema.personas.map((persona) => (
              <Link key={persona.id} href={`/contenido/personas/${persona.slug}`} className={comun.row}>
                <AvatarPersona nombre={persona.nombre} fotoUrl={persona.foto_url} tamano="sm" />
                <div className={comun.rowT}>
                  <b>{persona.nombre}</b>
                </div>
                <span className={comun.rowChevron}>{T.fila}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {tema.temasRelacionados.length > 0 && (
        <>
          <div className={comun.sec}>
            <h2 className={comun.h2}>Temas relacionados</h2>
          </div>
          <div className={styles.tagWrap}>
            {tema.temasRelacionados.map((relacionado) => {
              const peso = relacionado.peso / pesoMax;
              return (
                <Link
                  key={relacionado.id}
                  href={`/contenido/temas/${relacionado.slug}`}
                  className={comun.chip}
                  style={{ opacity: 0.55 + peso * 0.45, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {relacionado.miniatura_url && (
                    <span className={styles.tagThumb}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={relacionado.miniatura_url} alt="" />
                    </span>
                  )}
                  {relacionado.nombre}
                  <span className={styles.tagPeso}>{relacionado.peso}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
