"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./barra-pestanas.module.css";
import { ICONOS_PESTANA } from "./iconos";
import { SECCIONES, esActivo } from "./navegacion";

/** Barra inferior (iPhone): las secciones principales, siempre a la vista. */
export default function BarraPestanas() {
  const pathname = usePathname();
  return (
    <nav className={styles.tabbar} aria-label="Navegación principal">
      {SECCIONES.filter((s) => !s.soloLateral).map((s) => {
        const activo = esActivo(pathname, s.href);
        return (
          <Link
            key={s.id}
            href={s.href}
            className={`${styles.tab} ${activo ? styles.tabOn : ""}`}
            aria-current={activo ? "page" : undefined}
          >
            {ICONOS_PESTANA[s.id]}
            <span>{s.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
