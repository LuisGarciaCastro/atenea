"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import comun from "@/app/components/ui/comun.module.css";
import papel from "@/app/contenido/_components/papelito.module.css";
import Papelito from "@/app/contenido/_components/Papelito";
import miniatura from "@/app/contenido/_components/miniatura.module.css";
import styles from "./video-detalle.module.css";
import Segmentado from "@/app/components/ui/Segmentado";
import { T } from "@/app/components/ui/iconos";
import { ErrorCarga, Esqueleto } from "@/app/components/ui/Rincon";
import { useDatos } from "@/app/components/ui/useDatos";
import Volver from "@/app/contenido/_components/Volver";
import { useEntrada } from "@/app/components/ui/useEntrada";
import { formatoDuracion, formatoFecha } from "@/app/contenido/formato";
import type { Highlight, Segmento, VideoCompleto } from "@/lib/contenido/tipos";

const TIPO_LABEL: Record<string, string> = {
  idea_clave: "Idea clave",
  cita: "Cita",
  dato: "Dato",
};

const IFRAME_ALLOW = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";

export default function VideoClient({ youtubeId }: { youtubeId: string }) {
  const searchParams = useSearchParams();
  const {
    datos: video,
    error,
    noEncontrado,
    recargar,
  } = useDatos(`/api/contenido/videos/${encodeURIComponent(youtubeId)}`, (j) => (j as { video: VideoCompleto }).video);
  const [panel, setPanel] = useState<"highlights" | "transcripcion">("highlights");
  const [inicioSeleccionado, setInicioSeleccionado] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const visible = useEntrada(80);

  useEffect(() => {
    const t = searchParams.get("t");
    if (!t || !video) return;
    const segundos = Number(t);
    if (!Number.isFinite(segundos)) return;
    setInicioSeleccionado(segundos);
    setReproduciendo(true);
    setPanel("highlights");
    const el = document.getElementById(`hl-${Math.floor(segundos)}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [video, searchParams]);

  const palabras = useMemo(() => {
    if (!video) return 0;
    return video.segmentos
      .map((s) => s.texto)
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;
  }, [video]);

  function reproducirDesde(segundos: number) {
    setInicioSeleccionado(Math.floor(segundos));
    setReproduciendo(true);
  }

  if (!video) {
    return (
      <main className={comun.lectura}>
        <Volver />
        {noEncontrado ? (
          <p className={comun.empty}>No se encontró este vídeo.</p>
        ) : error ? (
          <ErrorCarga onReintentar={recargar} />
        ) : (
          <Esqueleto alto={220} style={{ marginTop: 8 }} />
        )}
      </main>
    );
  }

  const duracion = video.duracion_seg ?? 0;

  return (
    <main className={comun.lectura}>
      <Volver />

      <div className={`${miniatura.thumb} ${styles.headerThumb}`} style={{ position: "sticky", top: 8, zIndex: 5 }}>
        {reproduciendo ? (
          <div className={styles.iframeWrap}>
            <iframe
              src={`https://www.youtube.com/embed/${video.youtube_id}?start=${inicioSeleccionado}&autoplay=1`}
              title={video.titulo}
              allow={IFRAME_ALLOW}
              allowFullScreen
            />
          </div>
        ) : (
          <>
            {video.miniatura_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.miniatura_url} alt="" />
            ) : null}
            {video.canal && <span className={miniatura.chan}>{video.canal}</span>}
            <button
              type="button"
              className={styles.playBtn}
              aria-label="Reproducir"
              onClick={() => reproducirDesde(inicioSeleccionado)}
            >
              <span className={miniatura.play}>{T.reproducir}</span>
            </button>
            <span className={miniatura.dur}>
              {formatoDuracion(inicioSeleccionado)} / {formatoDuracion(duracion)}
            </span>
          </>
        )}
      </div>

      <div className={styles.title}>{video.titulo}</div>
      <div className={comun.cap} style={{ marginTop: 4 }}>
        {video.canal}
        {video.fecha_publicacion ? ` · ${formatoFecha(video.fecha_publicacion)}` : ""}
      </div>

      {duracion > 0 && (
        <div className={`${miniatura.timeline} ${styles.progTrack}`} style={{ position: "relative" }}>
          <span className={styles.prog} style={{ width: `${(inicioSeleccionado / duracion) * 100}%` }} />
          {video.highlights.map((h, i) => (
            <button
              key={h.id}
              type="button"
              className={`${miniatura.dot} ${visible ? miniatura.dotIn : ""} ${
                Math.floor(h.inicio_seg) === inicioSeleccionado ? miniatura.dotOn : ""
              }`}
              style={{ left: `${(h.inicio_seg / duracion) * 100}%`, transitionDelay: `${0.3 + i * 0.07}s` }}
              onClick={() => reproducirDesde(h.inicio_seg)}
              aria-label={`Ver highlight en ${formatoDuracion(h.inicio_seg)}`}
            />
          ))}
        </div>
      )}

      <div className={`${comun.w} ${comun.wIn}`} style={{ marginTop: 14, padding: 0 }}>
        <div className={comun.stats}>
          <div>
            <b>{formatoDuracion(duracion)}</b>
            <span>duración</span>
          </div>
          <div>
            <b>{video.highlights.length}</b>
            <span>highlights</span>
          </div>
          <div>
            <b>{palabras.toLocaleString("es-ES")}</b>
            <span>palabras</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Segmentado
          value={panel}
          onChange={setPanel}
          options={[
            { value: "highlights", label: "Highlights" },
            { value: "transcripcion", label: "Transcripción" },
          ]}
        />
      </div>

      {panel === "highlights" ? (
        video.highlights.length === 0 ? (
          <p className={comun.empty}>Este vídeo aún no tiene highlights.</p>
        ) : (
          <div className={papel.lista}>
            {video.highlights.map((h: Highlight) => (
              <Papelito
                key={h.id}
                id={`hl-${Math.floor(h.inicio_seg)}`}
                kicker={TIPO_LABEL[h.tipo] ?? h.tipo}
                titulo={h.texto}
                pie={formatoDuracion(h.inicio_seg)}
                activo={Math.floor(h.inicio_seg) === inicioSeleccionado}
                onClick={() => reproducirDesde(h.inicio_seg)}
              />
            ))}
          </div>
        )
      ) : video.segmentos.length === 0 ? (
        <p className={comun.empty}>Transcripción en proceso…</p>
      ) : (
        <div className={`${comun.w} ${comun.wIn}`} style={{ padding: "8px 16px" }}>
          {video.segmentos.map((s: Segmento, i: number) => (
            <button
              key={i}
              type="button"
              className={`${styles.tr} ${Math.floor(s.inicio_seg) === inicioSeleccionado ? styles.trOn : ""}`}
              onClick={() => reproducirDesde(s.inicio_seg)}
            >
              <span>{formatoDuracion(s.inicio_seg)}</span>
              <span className={styles.trTexto}>{s.texto}</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
