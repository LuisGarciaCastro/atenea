import { hash } from "@/app/components/ui/texto";
import type { Libro } from "@/lib/libros/tipos";

/** Color de la portada sin imagen: siempre el mismo para el mismo título. */
export function colorLibro(libro: Pick<Libro, "titulo">): string {
  return `var(--cat-${(hash(libro.titulo) % 6) + 1})`;
}
