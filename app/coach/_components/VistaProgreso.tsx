import styles from "../coach.module.css";
import { decimal, diaCorto, disciplina, duracionCorta } from "../formato";
import { resumenSemana } from "../circuito";
import type { DatosCoach } from "@/lib/coach/tipos";

export type Secundaria = "entrenos" | "cuaderno" | "forma";

export default function VistaProgreso({
  datos,
  hoy,
  onEntreno,
  onSecundaria,
}: {
  datos: DatosCoach;
  hoy: string;
  onEntreno: (id: string) => void;
  onSecundaria: (v: Secundaria) => void;
}) {
  const semanas = datos.load.semanas;
  const minutos = semanas.map((s) => s[1] + s[2] + s[3]);
  const max = Math.max(...minutos, 1);
  const mitad = Math.floor(semanas.length / 2);
  const recientes = minutos.slice(mitad).reduce((a, b) => a + b, 0);
  const anteriores = minutos.slice(0, mitad).reduce((a, b) => a + b, 0);
  const tendencia = anteriores > 0 ? Math.round(((recientes - anteriores) / anteriores) * 100) : null;
  const ultimos = [...datos.workouts].sort((a, b) => b.start.localeCompare(a.start));

  return (
    <div className={styles.vista}>
      <section className={styles.tarjeta}>
        <div className={styles.tarjetaCabecera}>
          <span className={styles.tarjetaEtiqueta}>Horas por semana</span>
          {tendencia !== null && (
            <span className={styles.tendencia}>
              {tendencia >= 0 ? "+" : ""}
              {tendencia}% vs. ant.
            </span>
          )}
        </div>
        <div className={styles.volumen}>
          {semanas.map((s, i) => (
            <div key={s[0]} className={styles.volumenCol}>
              <span className={styles.volumenHoras}>{(minutos[i] / 60).toFixed(1).replace(".", ",")}</span>
              <div className={styles.volumenPila} style={{ height: `${(minutos[i] / max) * 100}%` }}>
                <i style={{ flexGrow: s[3], background: "var(--c-run)" }} />
                <i style={{ flexGrow: s[2], background: "var(--c-orange)" }} />
                <i style={{ flexGrow: s[1], background: "var(--c-cyan)" }} />
              </div>
              <span className={styles.volumenFecha}>{i === semanas.length - 1 ? "Esta" : s[0]}</span>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.kms}>
        {resumenSemana(datos, hoy).map(({ sport, km }) => (
          <div key={sport} className={styles.km} style={{ background: disciplina(sport).color }}>
            <span className={styles.kmNombre}>{disciplina(sport).nombre}</span>
            <span className={styles.kmCifra}>{decimal(km, sport === "cycling" ? 0 : 1)}</span>
            <span className={styles.kmSub}>km esta semana</span>
          </div>
        ))}
      </div>

      <section className={styles.bloque}>
        <span className={styles.seccion}>Últimos entrenos</span>
        {ultimos.length === 0 ? (
          <span className={styles.vacio}>Sin entrenos en estos 7 días.</span>
        ) : (
          ultimos.slice(0, 5).map((w) => (
            <button key={w.id} type="button" className={styles.ultimo} onClick={() => onEntreno(w.id)}>
              <span
                className={styles.ultimoFranja}
                style={{ background: disciplina(w.sport).color }}
                aria-hidden="true"
              />
              <span className={styles.ultimoTexto}>
                <b>{w.title}</b>
                <small>
                  {diaCorto(w.start)}
                  {w.hr ? ` · ${w.hr[0]} lpm` : ""}
                </small>
              </span>
              <span className={styles.ultimoMin}>{duracionCorta(w.min)}</span>
            </button>
          ))
        )}
      </section>

      <section className={styles.bloque}>
        <span className={styles.seccion}>Más a fondo</span>
        <div className={styles.enlaces}>
          <button type="button" className={styles.enlaceDisplay} onClick={() => onSecundaria("entrenos")}>
            <span className={styles.enlaceTexto}>
              <b>Todos los entrenos</b>
              <small>{ultimos.length} registrados, con zonas y datos de cada uno</small>
            </span>
          </button>
          <button type="button" className={styles.enlaceDisplay} onClick={() => onSecundaria("forma")}>
            <span className={styles.enlaceTexto}>
              <b>Forma y fatiga</b>
              <small>Carga, frescura y si estás entrenando de más</small>
            </span>
          </button>
          <button type="button" className={styles.enlaceDisplay} onClick={() => onSecundaria("cuaderno")}>
            <span className={styles.enlaceTexto}>
              <b>Cuaderno del coach</b>
              <small>Lo que sabe de ti y por qué decide cada sesión</small>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
