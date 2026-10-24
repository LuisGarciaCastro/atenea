import { useState } from "react";
import styles from "../coach.module.css";
import { semanaDe } from "../circuito";
import { T } from "@/app/components/ui/iconos";
import { decimal, disciplina } from "../formato";
import type { DatosCoach, DiaPlan, SesionPlan } from "@/lib/coach/tipos";
import { fechaCorta } from "@/app/components/ui/fechas";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const TOTALES = ["swimming", "cycling", "running", "strength"];

function marca(dia: DiaPlan, sesiones: SesionPlan[]) {
  if (dia.rest || sesiones.length === 0) return null;
  if (sesiones.every((s) => s.status === "done")) {
    return { texto: "✓", fondo: disciplina(sesiones[0].sport).color };
  }
  if (sesiones.some((s) => s.status === "missed" || s.status === "skipped"))
    return { texto: "✕", fondo: "var(--c-red)" };
  if (sesiones.some((s) => s.status === "adjusted")) return { texto: "~", fondo: "var(--c-amber)" };
  return null;
}

export default function VistaSemana({
  datos,
  hoy,
  onEntreno,
  onSesion,
}: {
  datos: DatosCoach;
  hoy: string;
  onEntreno: (id: string) => void;
  onSesion: (fecha: string) => void;
}) {
  const semanas = datos.plan.weeks;
  const actual = semanaDe(datos, hoy);
  const indiceActual = Math.max(0, actual ? semanas.indexOf(actual) : 0);
  const [indice, setIndice] = useState(indiceActual);
  const semana = semanas[indice] ?? actual;
  if (!semana) {
    return (
      <div className={styles.vista}>
        <span className={styles.tituloGrande}>Esta semana</span>
        <span className={styles.vacio}>Todavía no hay plan. Se genera el domingo con la revisión semanal.</span>
      </div>
    );
  }

  const fechas = new Set(semana.days.map((d) => d.date));
  const sesiones = semana.days.flatMap((d) => d.sessions ?? []);
  const entrenosSemana = datos.workouts.filter((w) => fechas.has(w.start.slice(0, 10)));
  const totales = TOTALES.map((sport) => ({
    sport,
    hechos: entrenosSemana.filter((w) => w.sport === sport).reduce((a, w) => a + w.min, 0),
    previstos: sesiones.filter((s) => s.sport === sport).reduce((a, s) => a + s.min, 0),
  }));

  const futura = indice > indiceActual;
  const etiqueta =
    indice === indiceActual
      ? "Esta semana"
      : indice === indiceActual + 1
        ? "Próxima semana"
        : indice === indiceActual - 1
          ? "Semana pasada"
          : semana.label;

  return (
    <div className={styles.vista}>
      <div className={styles.selectorSemana}>
        <button
          type="button"
          className={styles.flechaSemana}
          onClick={() => setIndice((i) => i - 1)}
          disabled={indice === 0}
          aria-label="Semana anterior"
        >
          {T.anterior}
        </button>
        <div className={styles.semanaActual} aria-live="polite">
          <b>{etiqueta}</b>
          <small>
            {semana.label} · {semana.range}
          </small>
        </div>
        <button
          type="button"
          className={styles.flechaSemana}
          onClick={() => setIndice((i) => i + 1)}
          disabled={indice >= semanas.length - 1}
          aria-label="Semana siguiente"
        >
          {T.siguiente}
        </button>
      </div>

      <details className={styles.enfoque}>
        <summary>
          <span>
            <b>{semana.phase}</b>
            {semana.target ? ` · ${semana.target}` : ""}
          </span>
          <span className={styles.enfoqueMas}>Enfoque</span>
        </summary>
        <p>{semana.focus}</p>
      </details>

      <div className={styles.totales}>
        {totales.map((t) => (
          <div key={t.sport} className={styles.total} style={{ borderTopColor: disciplina(t.sport).color }}>
            <span className={styles.totalNombre}>{disciplina(t.sport).nombre}</span>
            <span className={styles.totalCifra}>{decimal((futura ? t.previstos : t.hechos) / 60)}h</span>
            <span className={styles.totalDe}>{futura ? "previstas" : `de ${decimal(t.previstos / 60)}h`}</span>
          </div>
        ))}
      </div>

      <div className={styles.filasSemana}>
        {semana.days.map((dia) => {
          const lista = dia.sessions ?? [];
          const primera = lista[0];
          const f = new Date(`${dia.date}T12:00:00`);
          const esHoy = dia.date === hoy;
          const color = dia.rest || !primera ? "var(--c-fill)" : disciplina(primera.sport).color;
          const m = marca(dia, lista);
          const workoutId = lista.find(
            (s) => s.workoutId && datos.workouts.some((w) => w.id === s.workoutId)
          )?.workoutId;
          const hecho = workoutId ? datos.workouts.find((w) => w.id === workoutId) : undefined;
          const titulo =
            dia.rest || !primera
              ? "Descanso"
              : `${disciplina(primera.sport).nombre} · ${primera.title}${lista.length > 1 ? ` +${lista.length - 1}` : ""}`;
          const sub =
            dia.rest || !primera
              ? "Recuperación"
              : [
                  `${lista.reduce((a, s) => a + s.min, 0)} min`,
                  hecho ? `hecho ${hecho.min}′` : null,
                  primera.note ?? null,
                ]
                  .filter(Boolean)
                  .join(" · ");

          const contenido = (
            <>
              <span className={styles.semanaDia}>
                <b>{DIAS[f.getDay()]}</b>
                <small>{esHoy ? "Hoy" : fechaCorta(dia.date)}</small>
              </span>
              <span className={styles.semanaTexto}>
                <b>{titulo}</b>
                <small>{sub}</small>
              </span>
              <span className={styles.semanaMarca} style={m ? { background: m.fondo } : undefined}>
                {m?.texto}
              </span>
            </>
          );

          const clase = `${styles.semanaFila} ${esHoy ? styles.semanaHoy : ""}`;
          const abrir = workoutId ? () => onEntreno(workoutId) : primera && !dia.rest ? () => onSesion(dia.date) : null;
          return abrir ? (
            <button key={dia.date} type="button" className={clase} style={{ borderLeftColor: color }} onClick={abrir}>
              {contenido}
            </button>
          ) : (
            <div key={dia.date} className={clase} style={{ borderLeftColor: color }}>
              {contenido}
            </div>
          );
        })}
      </div>
    </div>
  );
}
