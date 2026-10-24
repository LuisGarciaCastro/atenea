/**
 * Las secciones del hub, en el orden de la barra inferior (iPhone) y de la
 * barra lateral (iPad). Lo que se usa a diario va siempre a la vista: la
 * barra es para ir a sitios; las acciones («+», chat) van arriba en cada pantalla.
 */
export interface Seccion {
  id: string;
  href: string;
  label: string;
  /** Solo en la barra lateral del iPad (en el iPhone se llega desde Hoy). */
  soloLateral?: boolean;
}

export const SECCIONES: Seccion[] = [
  { id: "inicio", href: "/", label: "Hoy" },
  { id: "coach", href: "/coach", label: "Coach" },
  { id: "hucha", href: "/finanzas", label: "Hucha" },
  { id: "libros", href: "/libros", label: "Libros" },
  { id: "ideas", href: "/contenido", label: "Ideas" },
  { id: "notas", href: "/notas", label: "Notas" },
];

export function esActivo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
