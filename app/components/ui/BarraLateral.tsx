"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./barra-lateral.module.css";
import { ICONOS_PESTANA } from "./iconos";
import { SECCIONES, esActivo } from "./navegacion";

/** Barra lateral (iPad y pantallas anchas): todas las secciones. Las acciones van en la cabecera de cada pantalla. */
export default function BarraLateral() {
  const pathname = usePathname();
  return (
    <aside className={styles.lateral}>
      <Link href="/" className={styles.marca}>
        <span className={styles.logo} aria-hidden="true">
          A
        </span>
        Atenea
      </Link>
      <nav aria-label="Navegación principal" className={styles.secciones}>
        {SECCIONES.map((s) => {
          const activo = esActivo(pathname, s.href);
          return (
            <Link
              key={s.id}
              href={s.href}
              className={`${styles.item} ${activo ? styles.itemOn : ""}`}
              aria-current={activo ? "page" : undefined}
            >
              {ICONOS_PESTANA[s.id]}
              {s.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
