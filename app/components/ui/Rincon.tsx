import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import styles from "./rincon.module.css";
import { T } from "./iconos";

/** «‹ Coach»: un enlace (href) o un botón (onClick) para volver un nivel. */
export type Volver = { label: string; href: string } | { label: string; onClick: () => void };

/**
 * Cabecera de pantalla. Arriba, una barra con «‹ Volver» a la izquierda y las
 * acciones a la derecha (`<Acciones>`); debajo, el contexto en gris y el título grande.
 */
export function Cabecera({
  kicker,
  titulo,
  lateral,
  acciones,
  volver,
  separada = false,
}: {
  kicker?: string;
  titulo: string;
  lateral?: ReactNode;
  acciones?: ReactNode;
  volver?: Volver;
  /** Margen inferior para pantallas que no separan sus bloques con gap. */
  separada?: boolean;
}) {
  return (
    <header className={`${styles.cabecera} ${separada ? styles.separada : ""}`}>
      {(volver || acciones) && (
        <div className={styles.barra}>
          {volver &&
            ("href" in volver ? (
              <Link href={volver.href} className={styles.volver}>
                {T.volver}
                {volver.label}
              </Link>
            ) : (
              <button type="button" className={styles.volver} onClick={volver.onClick}>
                {T.volver}
                {volver.label}
              </button>
            ))}
          {acciones && <div className={styles.acciones}>{acciones}</div>}
        </div>
      )}
      <div className={styles.fila}>
        <div className={styles.titulos}>
          {kicker && <span className={styles.kicker}>{kicker}</span>}
          <h1 className={styles.titulo}>{titulo}</h1>
        </div>
        {lateral && <div className={styles.lateral}>{lateral}</div>}
      </div>
    </header>
  );
}

export function ErrorCarga({ onReintentar }: { onReintentar: () => void }) {
  return (
    <button type="button" className={styles.errorCarga} onClick={onReintentar}>
      No he podido cargar esto. Toca para reintentar.
    </button>
  );
}

/** Estado vacío: tarjeta blanca con el texto en gris («Nada apuntado este mes.»). */
export function Vacio({ texto }: { texto: string }) {
  return <p className={styles.vacio}>{texto}</p>;
}

export function Esqueleto({ alto, radio, style }: { alto: number; radio?: string; style?: CSSProperties }) {
  return (
    <div
      className={styles.esqueleto}
      style={{ height: alto, borderRadius: radio ?? "var(--radius-lg)", ...style }}
      aria-hidden="true"
    />
  );
}

export const rincon = styles;
