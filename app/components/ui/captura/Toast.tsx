import styles from "./captura.module.css";

export default function Toast({ texto }: { texto: string | null }) {
  return (
    <div className={styles.toastZona} role="status" aria-live="polite">
      {texto && <div className={styles.toast}>{texto}</div>}
    </div>
  );
}
