import { hash } from "../../components/ui/texto";

const PARES_DEGRADADO: [string, string][] = [
  ["var(--cat-1)", "var(--cat-4)"],
  ["var(--cat-2)", "var(--cat-1)"],
  ["var(--cat-3)", "var(--cat-5)"],
  ["var(--cat-4)", "var(--cat-1)"],
  ["var(--cat-5)", "var(--cat-4)"],
  ["var(--cat-6)", "var(--cat-2)"],
];

/** Par de colores determinista a partir de un texto (título, canal…), para
 * las portadas/miniaturas sin imagen real: mismo texto, mismo degradado
 * siempre, sin necesitar guardar nada en la base de datos. */
export function paletaPara(semilla: string): [string, string] {
  return PARES_DEGRADADO[hash(semilla) % PARES_DEGRADADO.length];
}
