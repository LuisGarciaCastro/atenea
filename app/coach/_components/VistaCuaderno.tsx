import type { ReactNode } from "react";
import styles from "../coach.module.css";
import { diaCorto } from "../formato";
import type { Cuaderno } from "@/lib/coach/tipos";

const ESTADO_PATRON: Record<string, string> = {
  confirmado: "var(--c-lime)",
  observado: "var(--c-amber)",
  descartado: "var(--c-text-muted)",
};

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={styles.bloque}>
      <h2 className={styles.h2}>{titulo}</h2>
      {children}
    </section>
  );
}

function Nota({ color, titulo, texto }: { color: string; titulo: string; texto: string }) {
  return (
    <div className={styles.destacado}>
      <span className={styles.franja} style={{ background: color }} aria-hidden="true" />
      <div>
        <b>{titulo}</b>
        {texto && <p>{texto}</p>}
      </div>
    </div>
  );
}

export default function VistaCuaderno({ cuaderno }: { cuaderno: Cuaderno | null }) {
  if (!cuaderno) return <span className={styles.mano}>Todavía no hay cuaderno.</span>;

  const habito = cuaderno.habito;
  const bien = habito?.registro.filter((r) => r.ok).length ?? 0;
  const decisiones = [...cuaderno.decisiones].sort(
    (a, b) => Number(b.abierta) - Number(a.abierta) || b.date.localeCompare(a.date)
  );

  return (
    <>
      <p className={styles.texto}>
        Lo que el coach sabe de ti: lo lee cada mañana antes de decidir y lo actualiza con lo aprendido.
      </p>

      {habito && (
        <Seccion titulo="Hábito que estamos corrigiendo">
          <div className={styles.tarjeta}>
            <div className={styles.tarjetaCabecera}>
              <h3 className={styles.h3}>{habito.nombre}</h3>
              <span>
                {bien} de {habito.registro.length} bien
              </span>
            </div>
            <p className={styles.texto}>{habito.objetivo}</p>
            {[...habito.registro].reverse().map((r) => (
              <div key={r.date} className={styles.registro}>
                <span
                  className={styles.marca}
                  style={{ background: r.ok ? "var(--c-lime)" : "var(--c-red)" }}
                  aria-label={r.ok ? "Bien" : "Mal"}
                >
                  {r.ok ? "✓" : "✗"}
                </span>
                <span>
                  <b>{diaCorto(r.date)}</b> {r.dato}
                </span>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {cuaderno.patrones.length > 0 && (
        <Seccion titulo="Patrones">
          <div className={styles.lista}>
            {cuaderno.patrones.map((p) => (
              <details key={p.id} className={styles.sesionPlan}>
                <summary>
                  <span
                    className={styles.punto}
                    style={{ background: ESTADO_PATRON[p.estado] ?? "var(--c-text-muted)" }}
                    aria-hidden="true"
                  />
                  <span className={styles.sesionTitulo}>{p.texto}</span>
                  <span className={styles.estadoTexto}>{p.estado}</span>
                </summary>
                {p.accion && (
                  <p className={styles.texto}>
                    <b>Qué hacemos:</b> {p.accion}
                  </p>
                )}
                <ul className={styles.detalle}>
                  {p.evidencia.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </Seccion>
      )}

      <Seccion titulo="Lo que me has contado">
        {cuaderno.sensaciones.length === 0 ? (
          <span className={styles.mano}>Cuéntale al coach cómo te sientes y quedará apuntado aquí.</span>
        ) : (
          <div className={styles.lista}>
            {[...cuaderno.sensaciones].reverse().map((s, i) => (
              <Nota key={i} color="var(--c-violet)" titulo={diaCorto(s.date)} texto={s.texto} />
            ))}
          </div>
        )}
      </Seccion>

      {decisiones.length > 0 && (
        <Seccion titulo="Decisiones y por qué">
          <div className={styles.lista}>
            {decisiones.map((d, i) => (
              <Nota
                key={i}
                color={d.abierta ? "var(--c-amber)" : "var(--c-cyan)"}
                titulo={`${diaCorto(d.date)} · ${d.texto}${d.abierta ? " (pendiente)" : ""}`}
                texto={d.porque}
              />
            ))}
          </div>
        </Seccion>
      )}

      {cuaderno.tests.length > 0 && (
        <Seccion titulo="Tests">
          <div className={styles.hechos}>
            {[...cuaderno.tests].reverse().map((t, i) => (
              <div key={i}>
                <span>
                  {t.tipo} · {diaCorto(t.date)}
                </span>
                <b>{t.resultado}</b>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {cuaderno.proponerSkill.length > 0 && (
        <Seccion titulo="Propuestas para la skill">
          <div className={styles.lista}>
            {cuaderno.proponerSkill.map((p, i) => (
              <Nota key={i} color="var(--c-violet)" titulo="Propuesta" texto={p} />
            ))}
          </div>
        </Seccion>
      )}

      {cuaderno.huecos.length > 0 && (
        <Seccion titulo="Datos a tener en cuenta">
          <div className={styles.lista}>
            {cuaderno.huecos.map((h, i) => (
              <Nota key={i} color="var(--c-text-muted)" titulo="Dato" texto={h} />
            ))}
          </div>
        </Seccion>
      )}
    </>
  );
}
