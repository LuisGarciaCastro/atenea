import styles from "../coach.module.css";
import HojaCircuito from "./HojaCircuito";
import { diaCorto, disciplina, duracionCorta } from "../formato";
import type { DiaPlan } from "@/lib/coach/tipos";

const ESTADOS: Record<string, string> = {
  planned: "Prevista",
  adjusted: "Ajustada por el coach",
  missed: "No hecha",
  skipped: "Saltada",
  done: "Hecha",
};

/** Ficha de lo que toca un día del plan (sesiones aún no hechas o de días futuros). */
export default function FichaSesion({ dia, onCerrar }: { dia: DiaPlan; onCerrar: () => void }) {
  const sesiones = dia.sessions ?? [];
  const primera = sesiones[0];
  const titulo = primera ? primera.title : "Descanso";

  return (
    <HojaCircuito kicker={`${diaCorto(dia.date)} · plan`} titulo={titulo} onCerrar={onCerrar}>
      {sesiones.map((s, i) => {
        const d = disciplina(s.sport);
        return (
          <section key={i} className={styles.sesionFicha} style={{ borderLeftColor: d.color }}>
            {i > 0 && <span className={styles.sesionFichaTitulo}>{s.title}</span>}
            <div className={styles.datos}>
              <div className={styles.dato}>
                <span className={styles.datoTitulo}>Disciplina</span>
                <span className={styles.datoValor} style={{ color: d.color }}>
                  {d.nombre}
                </span>
              </div>
              <div className={styles.dato}>
                <span className={styles.datoTitulo}>Duración</span>
                <span className={styles.datoValor}>{duracionCorta(s.min)}</span>
              </div>
            </div>
            <span className={styles.estadoSesion}>{ESTADOS[s.status] ?? "Prevista"}</span>
            {s.target && (
              <div className={styles.objetivo}>
                <span className={styles.datoTitulo}>Objetivo</span>
                <b>{s.target}</b>
              </div>
            )}
            {s.detail && s.detail.length > 0 && (
              <ol className={styles.bloques}>
                {s.detail.map((linea, j) => (
                  <li key={j}>{linea}</li>
                ))}
              </ol>
            )}
            {s.note && (
              <div className={styles.destacado}>
                <span className={styles.franja} style={{ background: d.color }} aria-hidden="true" />
                <div>
                  <b>Nota del coach</b>
                  <p>{s.note}</p>
                </div>
              </div>
            )}
          </section>
        );
      })}
      {sesiones.length === 0 && (
        <span className={styles.vacio}>Hoy también se entrena: dormir, comer bien y estirar.</span>
      )}
    </HojaCircuito>
  );
}
