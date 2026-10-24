import type { ReactNode } from "react";
import styles from "./chat.module.css";

/** **negrita** dentro de una línea, sin interpretar HTML. */
function enLinea(texto: string): ReactNode[] {
  return texto
    .split(/(\*\*[^*]+\*\*)/g)
    .map((trozo, i) =>
      trozo.startsWith("**") && trozo.endsWith("**") && trozo.length > 4 ? (
        <strong key={i}>{trozo.slice(2, -2)}</strong>
      ) : (
        trozo
      )
    );
}

/** Párrafos y listas con guiones: el formato que pide el prompt del orquestador. */
export default function TextoRespuesta({ texto }: { texto: string }) {
  const bloques = texto.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className={styles.respuesta}>
      {bloques.map((bloque, i) => {
        const lineas = bloque.split("\n").filter((l) => l.trim());
        const esLista = lineas.every((l) => /^\s*[-*•]\s+/.test(l));
        if (esLista) {
          return (
            <ul key={i}>
              {lineas.map((l, j) => (
                <li key={j}>{enLinea(l.replace(/^\s*[-*•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lineas.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {enLinea(l.replace(/^#+\s*/, ""))}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
