import styles from "../coach.module.css";
import { diaPlan, fraseDelDia, racha, resumenSemana, sesionDe } from "../circuito";
import { colorRecovery, decimal, diaCorto, disciplina, duracionCorta } from "../formato";
import { T } from "@/app/components/ui/iconos";
import { sumarDias } from "@/lib/core/fechas";
import type { DatosCoach } from "@/lib/coach/tipos";

const NOMBRES_ZONA = ["Z1", "Z2", "Z3", "Z4", "Z5"];

export default function VistaHoy({
  datos,
  hoy,
  onEntreno,
  onSesion,
  onSecundaria,
}: {
  datos: DatosCoach;
  hoy: string;
  onEntreno: (id: string) => void;
  onSesion: (fecha: string) => void;
  onSecundaria: () => void;
}) {
  const frase = fraseDelDia(datos, hoy);
  const colorFrase = disciplina(frase.deporte).color;
  const r = racha(datos, hoy);
  const dia = diaPlan(datos, hoy);
  const sesion = sesionDe(dia);
  const hecho = sesion?.workoutId ? datos.workouts.find((w) => w.id === sesion.workoutId) : undefined;
  const completado = sesion?.status === "done";
  const zonas = completado && hecho ? hecho.zones : null;
  const totalZonas = zonas ? zonas.reduce((a, b) => a + b, 0) : 0;
  const semana = resumenSemana(datos, hoy);
  const manana = sesionDe(diaPlan(datos, sumarDias(hoy, 1)));
  const recuperacion = datos.days[datos.days.length - 1] ?? null;
  const horasSueno = recuperacion
    ? (recuperacion.sleep.deep + recuperacion.sleep.rem + recuperacion.sleep.light) / 60
    : 0;

  return (
    <div className={`${styles.vista} ${styles.vistaHoy}`}>
      {sesion ? (
        <section className={styles.entrenoHoy}>
          <div className={styles.entrenoHoyArriba}>
            <span className={styles.entrenoHoyEtiqueta}>Hoy toca · {disciplina(sesion.sport).nombre}</span>
            <span className={styles.entrenoHoyDuracion}>{duracionCorta(sesion.min)}</span>
          </div>
          <span className={styles.entrenoHoyTitulo}>{sesion.title}</span>
          {(sesion.detail?.length || sesion.target) && (
            <span className={styles.entrenoHoyTexto}>
              {sesion.detail?.join(" · ")}
              {sesion.target ? `${sesion.detail?.length ? " · " : ""}Objetivo: ${sesion.target}` : ""}
            </span>
          )}

          {zonas && totalZonas > 0 && (
            <>
              <div className={styles.perfil} aria-label="Perfil de intensidad por zonas">
                {zonas.map((m, i) =>
                  m > 0 ? (
                    <i key={i} style={{ flexGrow: m, height: `${(i + 1) * 20}%`, opacity: 0.35 + (i + 1) * 0.13 }} />
                  ) : null
                )}
              </div>
              <div className={styles.perfilEtiquetas}>
                {zonas.map((m, i) => (m > 0 ? <span key={i}>{NOMBRES_ZONA[i]}</span> : null))}
              </div>
            </>
          )}

          {completado ? (
            hecho ? (
              <button type="button" className={styles.completado} onClick={() => onEntreno(hecho.id)}>
                ✓ Completado · {hecho.min}′
              </button>
            ) : (
              <div className={styles.completado}>✓ Completado</div>
            )
          ) : (
            <button type="button" className={styles.verSesion} onClick={() => onSesion(hoy)}>
              Ver la sesión <span aria-hidden="true">→</span>
            </button>
          )}
        </section>
      ) : (
        <section className={styles.descansoHoy}>
          <span className={styles.entrenoHoyEtiqueta}>Hoy · Descanso</span>
          <span className={styles.descansoTitulo}>{datos.today.headline || "Descanso"}</span>
          <span>Hoy también se entrena: dormir, comer bien y estirar.</span>
        </section>
      )}

      <button type="button" className={styles.manana} onClick={() => onSesion(sumarDias(hoy, 1))} disabled={!manana}>
        <span className={styles.mananaEtiqueta}>Mañana</span>
        <span className={styles.mananaTexto}>
          {manana ? (
            <>
              <b>
                {disciplina(manana.sport).nombre} · {manana.title}
              </b>
              <small>{duracionCorta(manana.min)}</small>
            </>
          ) : (
            <b>Descanso</b>
          )}
        </span>
        {manana && <span className={styles.chevron}>{T.fila}</span>}
      </button>

      {recuperacion && (
        <button type="button" className={styles.recuperacion} onClick={onSecundaria}>
          <span className={styles.recuperacionCabecera}>
            <span className={styles.tarjetaEtiqueta}>
              {recuperacion.date === hoy ? "Recuperación de hoy" : `Recuperación · ${diaCorto(recuperacion.date)}`}
            </span>
            <span className={styles.chevron}>{T.fila}</span>
          </span>
          <span className={styles.recuperacionDatos}>
            <span>
              <b style={{ color: colorRecovery(recuperacion.recovery) }}>{recuperacion.recovery} %</b>
              <small>Recovery</small>
            </span>
            <span>
              <b>{decimal(recuperacion.hrv, 0)}</b>
              <small>HRV (ms)</small>
            </span>
            <span>
              <b>{recuperacion.rhr}</b>
              <small>FC reposo</small>
            </span>
            <span>
              <b>{decimal(horasSueno, 1)} h</b>
              <small>Sueño</small>
            </span>
          </span>
        </button>
      )}

      <section className={styles.resumenSemana} aria-label="Esta semana">
        <span className={styles.resumenTitulo}>Esta semana</span>
        <div className={styles.totales3}>
          {semana.map((t) => (
            <div key={t.sport} className={styles.total} style={{ borderTopColor: disciplina(t.sport).color }}>
              <span className={styles.totalNombre}>{disciplina(t.sport).nombre}</span>
              <span className={styles.totalCifra}>
                {decimal(t.km, t.sport === "cycling" ? 0 : 1)}
                <small> km</small>
              </span>
              <span className={styles.totalDe}>
                {t.min ? duracionCorta(t.min) : "0′"} · {t.sesiones} {t.sesiones === 1 ? "sesión" : "sesiones"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.racha}>
        <span className={styles.rachaCifra}>{r.dias}</span>
        <span className={styles.rachaEtiqueta}>días de racha</span>
        <div className={styles.rachaFranja} aria-label={`Racha de ${r.dias} días`}>
          {r.segmentos.map((s) => (
            <i key={s.fecha} style={{ background: s.color }} />
          ))}
        </div>
      </section>

      <section className={styles.frase}>
        <span className={styles.fraseEtiqueta} style={{ background: colorFrase }}>
          Frase del día · {frase.etiqueta}
        </span>
        <span className={styles.fraseTexto}>{frase.frase}</span>
      </section>
    </div>
  );
}
