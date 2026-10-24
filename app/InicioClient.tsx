"use client";

import Link from "next/link";
import { useMemo } from "react";
import styles from "./inicio.module.css";
import { Cabecera, ErrorCarga, Esqueleto } from "./components/ui/Rincon";
import Acciones from "./components/ui/Acciones";
import { ICONOS_PESTANA } from "./components/ui/iconos";
import { MESES, capitalizar } from "./components/ui/fechas";
import { useDatos } from "./components/ui/useDatos";
import { useAhora } from "./components/ui/useAhora";
import { recortar } from "./components/ui/texto";
import { formatoDinero } from "./finanzas/formato";
import { diaPlan, sesionDe } from "./coach/circuito";
import { disciplina, duracionCorta } from "./coach/formato";
import { colorLibro } from "./libros/color";
import { calcularResumen } from "@/lib/finanzas/calc";
import type { Gasto } from "@/lib/finanzas/tipos";
import type { Libro } from "@/lib/libros/tipos";
import type { VideoConHighlight } from "@/lib/contenido/tipos";
import type { DatosCoach } from "@/lib/coach/tipos";
import { ZONA, diaEnMadrid, horaEnMadrid, sumarDias } from "@/lib/core/fechas";
import { NOMBRE } from "@/lib/core/perfil";

function saludo(hora: number): string {
  if (hora < 14) return "Buenos días";
  if (hora < 21) return "Buenas tardes";
  return "Buenas noches";
}

export default function InicioClient() {
  const ahora = useAhora();
  const gastos = useDatos("/api/finanzas", (j) => (j as { gastos?: Gasto[] }).gastos ?? []);
  const libros = useDatos("/api/libros", (j) => (j as { libros?: Libro[] }).libros ?? []);
  const videos = useDatos("/api/contenido/videos", (j) => {
    const json = j as { videos?: VideoConHighlight[]; totalHighlights?: number };
    return { videos: json.videos ?? [], totalHighlights: json.totalHighlights ?? 0 };
  });
  const coach = useDatos("/api/coach", (j) => (j as { datos: DatosCoach | null }).datos);

  const fecha = ahora?.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: ZONA });
  const hoy = ahora ? diaEnMadrid(ahora) : null;

  return (
    <main className={styles.inicio}>
      <Cabecera
        kicker={fecha ? capitalizar(fecha) : " "}
        titulo={`${ahora ? saludo(horaEnMadrid(ahora)) : "Hola"}${NOMBRE ? `, ${NOMBRE}` : ""}`}
        acciones={<Acciones anadir="pick" />}
      />

      <div className={styles.rejilla}>
        <div className={styles.columna}>
          {coach.cargando ? (
            <Esqueleto alto={190} radio="var(--radius-xl)" />
          ) : (
            coach.datos && hoy && <TarjetaCoach datos={coach.datos} hoy={hoy} />
          )}
        </div>

        <div className={styles.columna}>
          <section className={styles.minis} aria-label="Resumen">
            {gastos.error ? (
              <ErrorCarga onReintentar={gastos.recargar} />
            ) : gastos.cargando || !ahora ? (
              <Esqueleto alto={128} />
            ) : (
              <TarjetaHucha gastos={gastos.datos ?? []} ahora={ahora} />
            )}
            {libros.error ? (
              <ErrorCarga onReintentar={libros.recargar} />
            ) : libros.cargando ? (
              <Esqueleto alto={128} />
            ) : (
              <TarjetaLectura libros={libros.datos ?? []} />
            )}
          </section>

          <section className={styles.seccion} aria-labelledby="ultima-idea">
            <div className={styles.secCabecera}>
              <h2 id="ultima-idea" className={styles.secTitulo}>
                Última idea
              </h2>
              <Link href="/contenido" className={styles.verTodo}>
                Ver todo
              </Link>
            </div>
            {videos.error ? (
              <ErrorCarga onReintentar={videos.recargar} />
            ) : videos.cargando ? (
              <Esqueleto alto={150} />
            ) : (
              <TarjetaIdea videos={videos.datos?.videos ?? []} totalHighlights={videos.datos?.totalHighlights ?? 0} />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function TarjetaCoach({ datos, hoy }: { datos: DatosCoach; hoy: string }) {
  const sesion = sesionDe(diaPlan(datos, hoy));
  const manana = sesionDe(diaPlan(datos, sumarDias(hoy, 1)));
  const hecha = sesion?.status === "done";
  return (
    <Link href="/coach" className={styles.coach}>
      <div className={styles.coachArriba}>
        <span className={styles.coachEtiqueta}>
          {sesion ? `Hoy · ${disciplina(sesion.sport).nombre}` : "Hoy · Descanso"}
        </span>
        {sesion && <span className={styles.coachDuracion}>{duracionCorta(sesion.min)}</span>}
      </div>
      <span className={styles.coachTitulo}>{sesion?.title ?? datos.today.headline ?? "Descanso"}</span>
      <span className={styles.coachSub}>
        {hecha ? "Hecho. Buen trabajo." : sesion?.target ? recortar(sesion.target, 80) : "Rumbo a la meta"}
      </span>
      <span className={styles.coachPie}>
        <span>{manana ? `Mañana: ${manana.title} · ${duracionCorta(manana.min)}` : "Mañana: descanso"}</span>
        <span className={styles.coachCta}>{sesion && !hecha ? "Ver sesión" : "Ver plan"} →</span>
      </span>
    </Link>
  );
}

function TarjetaHucha({ gastos, ahora }: { gastos: Gasto[]; ahora: Date }) {
  const resumen = useMemo(() => calcularResumen(gastos, ahora), [gastos, ahora]);
  const mesAnterior = MESES[(ahora.getMonth() + 11) % 12];
  const variacion = resumen.variacionPct;
  return (
    <Link href="/finanzas" className={styles.mini}>
      <span className={`${styles.miniEtiqueta} ${styles.etiquetaHucha}`}>
        {ICONOS_PESTANA.hucha}
        Hucha
      </span>
      <span className={styles.miniCifra}>{formatoDinero(resumen.totalMesActual)}</span>
      <span className={styles.miniPie}>
        {variacion === null
          ? `Gastado en ${MESES[ahora.getMonth()]}`
          : `${variacion > 0 ? "↑" : "↓"} ${Math.abs(Math.round(variacion))} % que ${mesAnterior}`}
      </span>
    </Link>
  );
}

function TarjetaLectura({ libros }: { libros: Libro[] }) {
  const leyendo = libros.find((l) => l.estado === "leyendo") ?? null;
  const pct =
    leyendo?.pagina_actual && leyendo.paginas_totales
      ? Math.min(100, Math.round((leyendo.pagina_actual / leyendo.paginas_totales) * 100))
      : 0;
  return (
    <Link href="/libros" className={styles.mini}>
      <span className={`${styles.miniEtiqueta} ${styles.etiquetaLibros}`}>
        {ICONOS_PESTANA.libros}
        Leyendo
      </span>
      {leyendo ? (
        <>
          <span className={styles.lecturaTitulo}>{leyendo.titulo}</span>
          <span className={styles.barra} aria-hidden="true">
            <i style={{ width: `${pct}%`, background: colorLibro(leyendo) }} />
          </span>
          <span className={styles.miniPie}>{pct} % leído</span>
        </>
      ) : (
        <span className={styles.miniPie}>Elige tu próxima lectura</span>
      )}
    </Link>
  );
}

function TarjetaIdea({ videos, totalHighlights }: { videos: VideoConHighlight[]; totalHighlights: number }) {
  const ultimo = videos[0] ?? null;
  return (
    <Link href={ultimo ? `/contenido/videos/${ultimo.youtube_id}` : "/contenido"} className={styles.tarjeta}>
      <span className={styles.ideaEtiqueta}>
        {ultimo?.tema_principal ?? "Ideas"} · {videos.length} vídeo{videos.length === 1 ? "" : "s"} · {totalHighlights}{" "}
        highlight{totalHighlights === 1 ? "" : "s"}
      </span>
      <span className={styles.ideaTitulo}>{ultimo?.titulo ?? "Tu primera idea te espera"}</span>
      {ultimo?.highlight_destacado && (
        <span className={styles.ideaCita}>“{recortar(ultimo.highlight_destacado, 120)}”</span>
      )}
    </Link>
  );
}
