"use client";

import styles from "./acciones.module.css";
import { T } from "./iconos";
import { useCaptura, type HojaCapturaId } from "./captura/CapturaContext";

const ETIQUETAS: Record<HojaCapturaId, string> = {
  pick: "Apuntar",
  gasto: "Nuevo gasto",
  libro: "Nuevo libro",
  enlace: "Guardar enlace",
};

/** Lo que crea el «+»: una hoja de la captura rápida o una acción propia de la pantalla. */
export type Anadir = HojaCapturaId | { etiqueta: string; accion: () => void };

/**
 * Acciones de la cabecera, arriba a la derecha en todas las pantallas:
 * el chat y, si la pantalla crea algo, su «+» (que abre directamente lo que toca).
 */
export default function Acciones({ anadir }: { anadir?: Anadir }) {
  const { abrir, abrirChat } = useCaptura();
  const propia = typeof anadir === "object" ? anadir : null;
  return (
    <div className={styles.acciones}>
      <button type="button" className={styles.boton} onClick={abrirChat} aria-label="Pregúntame sobre tus datos">
        {T.chat}
      </button>
      {anadir && (
        <button
          type="button"
          className={`${styles.boton} ${styles.anadir}`}
          onClick={() => (propia ? propia.accion() : abrir(anadir as HojaCapturaId))}
        >
          {T.mas}
          <span className={styles.etiqueta}>{propia ? propia.etiqueta : ETIQUETAS[anadir as HojaCapturaId]}</span>
        </button>
      )}
    </div>
  );
}
