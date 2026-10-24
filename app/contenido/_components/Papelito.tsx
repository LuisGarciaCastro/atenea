import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./papelito.module.css";

/** Nota: kicker de color, texto en serif de lectura, extracto y pie. */
export default function Papelito({
  kicker,
  titulo,
  extracto,
  pie,
  href,
  externo = false,
  onClick,
  id,
  activo = false,
}: {
  kicker?: string | null;
  titulo?: string | null;
  extracto?: string | null;
  pie?: ReactNode;
  href?: string;
  externo?: boolean;
  onClick?: () => void;
  id?: string;
  activo?: boolean;
}) {
  const contenido = (
    <>
      {kicker && <span className={styles.kicker}>{kicker}</span>}
      {titulo && <span className={styles.titulo}>{titulo}</span>}
      {extracto && <span className={styles.extracto}>{extracto}</span>}
      {pie && <span className={styles.pie}>{pie}</span>}
    </>
  );

  const clase = `${styles.papelito} ${activo ? styles.activo : ""}`;

  if (onClick) {
    return (
      <button type="button" id={id} className={clase} onClick={onClick} aria-pressed={activo}>
        {contenido}
      </button>
    );
  }
  if (!href) {
    return <div className={clase}>{contenido}</div>;
  }
  if (externo) {
    return (
      <a className={clase} href={href} target="_blank" rel="noopener noreferrer">
        {contenido}
      </a>
    );
  }
  return (
    <Link className={clase} href={href}>
      {contenido}
    </Link>
  );
}
