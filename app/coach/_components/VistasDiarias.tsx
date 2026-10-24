import styles from "../coach.module.css";
import HojaCircuito from "./HojaCircuito";
import { Barras, BarrasApiladas, Lineas } from "./Graficas";
import { colorRecovery, decimal, diaCorto, disciplina } from "../formato";
import type { DatosCoach, EntrenoCoach } from "@/lib/coach/tipos";

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const horasSueno = (d: DatosCoach["days"][number]) => (d.sleep.deep + d.sleep.rem + d.sleep.light) / 60;

function Dato({ titulo, valor, unidad, sub }: { titulo: string; valor: string; unidad?: string; sub?: string }) {
  return (
    <div className={styles.dato}>
      <span className={styles.datoTitulo}>{titulo}</span>
      <span className={styles.datoValor}>
        {valor}
        {unidad && <small> {unidad}</small>}
      </span>
      {sub && <span className={styles.datoSub}>{sub}</span>}
    </div>
  );
}

function FilaEntreno({ entreno, onAbrir }: { entreno: EntrenoCoach; onAbrir: () => void }) {
  const d = disciplina(entreno.sport);
  return (
    <button type="button" className={styles.fila} onClick={onAbrir}>
      <span className={styles.badge} style={{ background: d.color }} aria-hidden="true">
        {d.nombre.charAt(0)}
      </span>
      <span className={styles.filaTexto}>
        <b>{entreno.title}</b>
        <span>
          {diaCorto(entreno.start)} · {entreno.min} min{entreno.dist ? ` · ${entreno.dist}` : ""}
          {entreno.pace ? ` · ${entreno.pace}` : ""}
        </span>
      </span>
      {entreno.hr && <span className={styles.filaDerecha}>{entreno.hr[0]} lpm</span>}
    </button>
  );
}

export function VistaRecuperacion({ datos }: { datos: DatosCoach }) {
  const dias = datos.days;
  const etiquetas = dias.map((d) => diaCorto(d.date).split(" ")[0]);

  return (
    <>
      <section className={styles.tarjeta}>
        <div className={styles.tarjetaCabecera}>
          <h2 className={styles.h2}>Recovery</h2>
          <span>media {decimal(media(dias.map((d) => d.recovery)), 0)}%</span>
        </div>
        <Barras
          etiquetas={etiquetas}
          valores={dias.map((d) => d.recovery)}
          colorDe={colorRecovery}
          formato={(v) => `${v}%`}
        />
      </section>

      <div className={styles.dosColumnas}>
        <section className={styles.tarjeta}>
          <div className={styles.tarjetaCabecera}>
            <h2 className={styles.h2}>HRV</h2>
            <span>ms</span>
          </div>
          <Lineas
            etiquetas={etiquetas}
            series={[{ nombre: "HRV", color: "var(--c-cyan)", valores: dias.map((d) => d.hrv) }]}
          />
        </section>
        <section className={styles.tarjeta}>
          <div className={styles.tarjetaCabecera}>
            <h2 className={styles.h2}>FC en reposo</h2>
            <span>lpm</span>
          </div>
          <Lineas
            etiquetas={etiquetas}
            series={[{ nombre: "FC", color: "var(--c-orange)", valores: dias.map((d) => d.rhr) }]}
          />
        </section>
      </div>

      <section className={styles.tarjeta}>
        <div className={styles.tarjetaCabecera}>
          <h2 className={styles.h2}>Horas dormidas</h2>
          <span>media {decimal(media(dias.map(horasSueno)))} h</span>
        </div>
        <BarrasApiladas
          etiquetas={etiquetas}
          formatoTotal={(t) => decimal(t)}
          series={[
            { nombre: "Profundo", color: "var(--c-violet)", valores: dias.map((d) => d.sleep.deep / 60) },
            { nombre: "REM", color: "var(--c-cyan)", valores: dias.map((d) => d.sleep.rem / 60) },
            { nombre: "Ligero", color: "var(--c-text-muted)", valores: dias.map((d) => d.sleep.light / 60) },
          ]}
        />
      </section>

      <section className={styles.bloque}>
        <h2 className={styles.h2}>Día a día</h2>
        <div className={styles.lista}>
          {[...dias].reverse().map((d) => (
            <div key={d.date} className={styles.fila}>
              <span className={styles.badge} style={{ background: colorRecovery(d.recovery) }}>
                {d.recovery}
              </span>
              <span className={styles.filaTexto}>
                <b>{diaCorto(d.date)}</b>
                <span>
                  HRV {decimal(d.hrv, 0)} ms · FC {d.rhr} lpm · {decimal(horasSueno(d))} h de sueño ({d.sleep.perf}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

const ZONAS = [
  "var(--c-fill)",
  "var(--c-text-muted)",
  "var(--c-cyan)",
  "var(--c-lime)",
  "var(--c-amber)",
  "var(--c-red)",
];

export function VistaEntrenos({ datos, onEntreno }: { datos: DatosCoach; onEntreno: (id: string) => void }) {
  const zonas = datos.zonesWeek;
  const total = zonas.reduce((a, b) => a + b, 0) || 1;

  return (
    <>
      {datos.workouts.length === 0 ? (
        <span className={styles.mano}>Sin entrenos en estos 7 días.</span>
      ) : (
        <div className={styles.lista}>
          {[...datos.workouts].reverse().map((w) => (
            <FilaEntreno key={w.id} entreno={w} onAbrir={() => onEntreno(w.id)} />
          ))}
        </div>
      )}

      {datos.swim.stats.length > 0 && (
        <section className={styles.bloque}>
          <h2 className={styles.h2}>Natación esta semana</h2>
          {datos.swim.lead && <p className={styles.texto}>{datos.swim.lead}</p>}
          <div className={styles.datos}>
            {datos.swim.stats.map((s) => (
              <Dato key={s[0]} titulo={s[0]} valor={s[1]} unidad={s[2]} sub={s[3]} />
            ))}
          </div>
        </section>
      )}

      <section className={styles.tarjeta}>
        <div className={styles.tarjetaCabecera}>
          <h2 className={styles.h2}>Strain</h2>
          <span>escala 0–21</span>
        </div>
        <Barras
          etiquetas={datos.days.map((d) => diaCorto(d.date).split(" ")[0])}
          valores={datos.days.map((d) => d.strain)}
          color="var(--c-orange)"
          formato={(v) => decimal(v)}
        />
      </section>

      <section className={styles.tarjeta}>
        <div className={styles.tarjetaCabecera}>
          <h2 className={styles.h2}>Zonas de FC</h2>
          <span>{Math.round(total)} min</span>
        </div>
        <span className={styles.cifra}>
          {Math.round(((zonas[1] + zonas[2]) / total) * 100)}%<small> en zonas 1–2</small>
        </span>
        <div className={styles.reparto}>
          {zonas.map((m, i) => (m ? <i key={i} style={{ flexGrow: m, background: ZONAS[i] }} /> : null))}
        </div>
        <div className={styles.leyenda}>
          {zonas.map((m, i) =>
            m ? (
              <span key={i}>
                <i style={{ background: ZONAS[i] }} />Z{i} · {Math.round(m)} min
              </span>
            ) : null
          )}
        </div>
      </section>
    </>
  );
}

export function FichaEntreno({ entreno, onCerrar }: { entreno: EntrenoCoach; onCerrar: () => void }) {
  const d = disciplina(entreno.sport);
  const zonaMax = Math.max(...entreno.zones, 1);

  return (
    <HojaCircuito
      kicker={`${d.nombre} · ${diaCorto(entreno.start)} · ${entreno.src}`}
      titulo={entreno.title}
      onCerrar={onCerrar}
    >
      <div className={styles.datos}>
        <Dato titulo="Duración" valor={String(entreno.min)} unidad="min" />
        {entreno.dist && <Dato titulo="Distancia" valor={entreno.dist} />}
        {entreno.pace && <Dato titulo="Ritmo" valor={entreno.pace} />}
        {entreno.hr && <Dato titulo="Pulso" valor={String(entreno.hr[0])} unidad="lpm" sub={`máx. ${entreno.hr[1]}`} />}
      </div>

      {entreno.summary && <p className={styles.texto}>{entreno.summary}</p>}

      {entreno.note && (
        <div className={styles.destacado}>
          <span className={styles.franja} style={{ background: d.color }} aria-hidden="true" />
          <div>
            <b>Lectura del entreno</b>
            <p>{entreno.note}</p>
          </div>
        </div>
      )}

      <section className={styles.bloque}>
        <h2 className={styles.h2}>Zonas de FC · {entreno.zoneSrc}</h2>
        {entreno.zones.map((m, i) => (
          <div key={i} className={styles.zonaFila}>
            <span>Z{i + 1}</span>
            <span className={styles.zonaPista}>
              <i style={{ width: `${(m / zonaMax) * 100}%`, background: ZONAS[i + 1] }} />
            </span>
            <span>{decimal(m, m < 10 ? 1 : 0)} min</span>
          </div>
        ))}
      </section>

      {entreno.facts.length > 0 && (
        <section className={styles.bloque}>
          <h2 className={styles.h2}>Datos</h2>
          <div className={styles.hechos}>
            {entreno.facts.map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      {entreno.table && entreno.table.rows.length > 0 && (
        <section className={styles.bloque}>
          <h2 className={styles.h2}>{entreno.table.kind === "swim" ? "Series" : "Parciales"}</h2>
          <div className={styles.tablaCaja}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  {entreno.table.cols.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entreno.table.rows.map((fila, i) => (
                  <tr key={i} className={fila.length === 1 ? styles.descanso : undefined}>
                    {fila.length === 1 ? (
                      <td colSpan={entreno.table!.cols.length}>Descanso {fila[0]}</td>
                    ) : (
                      fila.map((c, j) => <td key={j}>{c ?? "—"}</td>)
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </HojaCircuito>
  );
}
