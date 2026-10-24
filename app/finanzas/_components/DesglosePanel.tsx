import comun from "@/app/components/ui/comun.module.css";
import styles from "@/app/finanzas/analisis.module.css";
import type { Gasto } from "@/lib/finanzas/tipos";
import { formatoDinero } from "@/app/finanzas/formato";

export default function DesglosePanel({
  titulo,
  gastos,
  onClose,
}: {
  titulo: string;
  gastos: Gasto[];
  onClose: () => void;
}) {
  const total = gastos.reduce((sum, g) => sum + Number(g.importe ?? 0), 0);

  return (
    <div className={styles.desglose}>
      <div className={styles.desgloseCabecera}>
        <span className={styles.desgloseTitulo}>{titulo}</span>
        <span className={styles.desgloseTotal}>{formatoDinero(total)}</span>
        <button type="button" className={styles.desgloseCerrar} onClick={onClose} aria-label="Cerrar desglose">
          ✕
        </button>
      </div>
      {gastos.length === 0 ? (
        <p className={comun.empty}>Sin gastos en esta selección.</p>
      ) : (
        <ul className={styles.desgloseLista}>
          {gastos.map((g) => (
            <li key={g.id} className={styles.desgloseItem}>
              <span>{g.descripcion ?? g.texto_original}</span>
              <span className={styles.desgloseImporte}>
                {g.importe != null ? formatoDinero(Number(g.importe)) : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
