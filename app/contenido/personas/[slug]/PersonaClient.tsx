"use client";

import Link from "next/link";
import comun from "@/app/components/ui/comun.module.css";
import { ErrorCarga, Esqueleto } from "@/app/components/ui/Rincon";
import { useDatos } from "@/app/components/ui/useDatos";
import styles from "@/app/contenido/detalle.module.css";
import { formatoFecha } from "@/app/contenido/formato";
import AvatarPersona from "@/app/contenido/_components/AvatarPersona";
import Volver from "@/app/contenido/_components/Volver";
import type { PersonaCompleta } from "@/lib/contenido/tipos";

export default function PersonaClient({ slug }: { slug: string }) {
  const {
    datos: persona,
    error,
    noEncontrado,
    recargar,
  } = useDatos(
    `/api/contenido/personas/${encodeURIComponent(slug)}`,
    (j) => (j as { persona: PersonaCompleta }).persona
  );

  if (!persona) {
    return (
      <main className={comun.lectura}>
        <Volver filtro="personas" />
        {noEncontrado ? (
          <p className={comun.empty}>No se encontró esta persona.</p>
        ) : error ? (
          <ErrorCarga onReintentar={recargar} />
        ) : (
          <Esqueleto alto={160} style={{ marginTop: 8 }} />
        )}
      </main>
    );
  }

  return (
    <main className={comun.lectura}>
      <Volver filtro="personas" />

      <header style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 4px" }}>
        <AvatarPersona nombre={persona.nombre} fotoUrl={persona.foto_url} tamano="lg" />
        <div style={{ minWidth: 0 }}>
          <h1 className={comun.h2}>{persona.nombre}</h1>
          {persona.descripcion && (
            <p className={comun.cap} style={{ marginTop: 4 }}>
              {persona.descripcion}
            </p>
          )}
        </div>
      </header>

      <div className={comun.sec}>
        <h2 className={comun.h2}>Vídeos donde aparece</h2>
        <span className={comun.cap}>{persona.videos.length}</span>
      </div>
      {persona.videos.length === 0 ? (
        <p className={comun.empty}>Aún ningún vídeo procesado la menciona.</p>
      ) : (
        <div className={comun.list} style={{ padding: "0 16px" }}>
          {persona.videos.map((video) => (
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
              </div>
            </Link>
          ))}
        </div>
      )}

      {persona.temas.length > 0 && (
        <>
          <div className={comun.sec}>
            <h2 className={comun.h2}>Temas que toca</h2>
          </div>
          <div className={styles.tagWrap}>
            {persona.temas.map((tema) => (
              <Link key={tema.id} href={`/contenido/temas/${tema.slug}`} className={comun.chip}>
                {tema.nombre}
              </Link>
            ))}
          </div>
        </>
      )}

      {persona.personasRelacionadas.length > 0 && (
        <>
          <div className={comun.sec}>
            <h2 className={comun.h2}>Coapariciones</h2>
          </div>
          <div className={comun.list}>
            {persona.personasRelacionadas.map((otra) => (
              <Link key={otra.id} href={`/contenido/personas/${otra.slug}`} className={comun.row}>
                <AvatarPersona nombre={otra.nombre} fotoUrl={otra.foto_url} tamano="sm" />
                <div className={comun.rowT}>
                  <b>{otra.nombre}</b>
                </div>
                <span className={comun.cap}>
                  {otra.peso} vídeo{otra.peso === 1 ? "" : "s"}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
