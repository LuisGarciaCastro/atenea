import styles from "../coach.module.css";
import { BarrasApiladas, Lineas } from "./Graficas";
import { colorTono, decimal } from "../formato";
import type { DatosCoach } from "@/lib/coach/tipos";
import { fechaCorta } from "@/app/components/ui/fechas";

export default function VistaForma({ datos }: { datos: DatosCoach }) {
  const { load, forma } = datos;
  const serie = load.serie;
  const etiquetas = serie.map((p) => fechaCorta(p.date));
  const tsb = load.hoy.tsb;

  return (
    <>
      <section className={styles.tarjeta}>
        <div className={styles.tarjetaCabecera}>
          <h2 className={styles.h2}>Forma y fatiga</h2>
          <span>últimos {serie.length} días</span>
        </div>
        <Lineas
          etiquetas={etiquetas}
          series={[
            { nombre: "Forma (CTL)", color: "var(--c-cyan)", valores: serie.map((p) => p.ctl) },
            { nombre: "Fatiga (ATL)", color: "var(--c-orange)", valores: serie.map((p) => p.atl) },
          ]}
        />
      </section>

      <div className={styles.datos}>
        <Cifra
          titulo="Forma (CTL)"
          valor={decimal(load.hoy.ctl)}
          sub={`${load.hoy.ramp >= 0 ? "+" : ""}${decimal(load.hoy.ramp)} en 7 días`}
        />
        <Cifra titulo="Fatiga (ATL)" valor={decimal(load.hoy.atl)} sub="media de 7 días" />
        <Cifra
          titulo="Frescura (TSB)"
          valor={decimal(tsb)}
          sub={tsb >= 0 ? "fresco" : "cargado"}
          color={tsb >= 0 ? "var(--c-lime)" : tsb < -25 ? "var(--c-red)" : "var(--c-amber)"}
        />
        <Cifra
          titulo="Ratio 7/28 (ACWR)"
          valor={decimal(load.hoy.acwr, 2)}
          sub="seguro entre 0,8 y 1,3"
          color={load.hoy.acwr > 1.3 ? "var(--c-amber)" : "var(--c-lime)"}
        />
      </div>

      {load.lectura && (
        <div className={styles.destacado}>
          <span className={styles.franja} style={{ background: "var(--c-orange)" }} aria-hidden="true" />
          <div>
            <b>Lectura</b>
            <p>{load.lectura}</p>
          </div>
        </div>
      )}

      <section className={styles.tarjeta}>
        <div className={styles.tarjetaCabecera}>
          <h2 className={styles.h2}>Frescura</h2>
          <span>TSB diario</span>
        </div>
        <Lineas
          etiquetas={etiquetas}
          cero
          series={[{ nombre: "TSB", color: "var(--c-amber)", valores: serie.map((p) => p.tsb) }]}
        />
      </section>

      <section className={styles.tarjeta}>
        <div className={styles.tarjetaCabecera}>
          <h2 className={styles.h2}>Reparto de intensidad</h2>
          <span>28 días · {load.distribucion.minutos} min</span>
        </div>
        <span className={styles.cifra}>
          {load.distribucion.bajo}%<small> suave · objetivo ≥ 80 %</small>
        </span>
        <div className={styles.reparto}>
          <i style={{ flexGrow: load.distribucion.bajo, background: "var(--c-lime)" }} />
          <i style={{ flexGrow: load.distribucion.moderado, background: "var(--c-amber)" }} />
          <i style={{ flexGrow: load.distribucion.alto || 0.01, background: "var(--c-orange)" }} />
        </div>
        <div className={styles.leyenda}>
          <span>
            <i style={{ background: "var(--c-lime)" }} />
            Z1–Z2 {load.distribucion.bajo}%
          </span>
          <span>
            <i style={{ background: "var(--c-amber)" }} />
            Z3 {load.distribucion.moderado}%
          </span>
          <span>
            <i style={{ background: "var(--c-orange)" }} />
            Z4–Z5 {load.distribucion.alto}%
          </span>
        </div>
      </section>

      {load.semanas.length > 0 && (
        <section className={styles.tarjeta}>
          <div className={styles.tarjetaCabecera}>
            <h2 className={styles.h2}>Minutos por semana</h2>
            <span>últimas {load.semanas.length}</span>
          </div>
          <BarrasApiladas
            etiquetas={load.semanas.map((s) => s[0])}
            series={[
              { nombre: "Natación", color: "var(--c-cyan)", valores: load.semanas.map((s) => s[1]) },
              { nombre: "Bici", color: "var(--c-amber)", valores: load.semanas.map((s) => s[2]) },
              { nombre: "Carrera", color: "var(--c-orange)", valores: load.semanas.map((s) => s[3]) },
            ]}
          />
        </section>
      )}

      {(load.alertas.length > 0 || load.huecos.length > 0) && (
        <div className={styles.lista}>
          {load.alertas.map((a, i) => (
            <div key={`a${i}`} className={styles.destacado}>
              <span className={styles.franja} style={{ background: "var(--c-amber)" }} aria-hidden="true" />
              <div>
                <b>Alerta</b>
                <p>{a}</p>
              </div>
            </div>
          ))}
          {load.huecos.map((h, i) => (
            <div key={`h${i}`} className={styles.destacado}>
              <span className={styles.franja} style={{ background: "var(--c-text-muted)" }} aria-hidden="true" />
              <div>
                <b>Dato a tener en cuenta</b>
                <p>{h}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className={styles.bloque}>
        <h2 className={styles.h2}>Estimaciones de Garmin</h2>
        <div className={styles.datos}>
          {forma.stats.map((s) => (
            <Cifra
              key={s[0]}
              titulo={s[0]}
              valor={`${s[1]}${s[2] ? ` ${s[2]}` : ""}`}
              sub={s[3]}
              color={colorTono(s[4])}
            />
          ))}
        </div>
      </section>

      {forma.predictions.length > 0 && (
        <section className={styles.bloque}>
          <h2 className={styles.h2}>Predicción de carrera</h2>
          <div className={styles.hechos}>
            {forma.predictions.map(([dist, tiempo, ritmo]) => (
              <div key={dist}>
                <span>{dist}</span>
                <b>
                  {tiempo} <small>{ritmo}</small>
                </b>
              </div>
            ))}
          </div>
        </section>
      )}

      {forma.note && <p className={styles.nota}>{forma.note}</p>}
    </>
  );
}

function Cifra({ titulo, valor, sub, color }: { titulo: string; valor: string; sub: string; color?: string }) {
  return (
    <div className={styles.dato}>
      <span className={styles.datoTitulo}>{titulo}</span>
      <span className={styles.datoValor} style={color ? { color } : undefined}>
        {valor}
      </span>
      <span className={styles.datoSub}>{sub}</span>
    </div>
  );
}
