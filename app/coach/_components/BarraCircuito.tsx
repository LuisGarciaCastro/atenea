import styles from "../coach.module.css";

export type VistaPrincipal = "hoy" | "semana" | "progreso";

const PESTANAS: { id: VistaPrincipal; nombre: string }[] = [
  { id: "hoy", nombre: "Hoy" },
  { id: "semana", nombre: "Semana" },
  { id: "progreso", nombre: "Progreso" },
];

export default function BarraCircuito({
  activa,
  onCambiar,
}: {
  activa: VistaPrincipal | null;
  onCambiar: (v: VistaPrincipal) => void;
}) {
  return (
    <nav className={styles.barra} aria-label="Secciones del coach">
      {PESTANAS.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`${styles.pestana} ${activa === p.id ? styles.pestanaOn : ""}`}
          aria-current={activa === p.id ? "page" : undefined}
          onClick={() => onCambiar(p.id)}
        >
          {p.nombre}
        </button>
      ))}
    </nav>
  );
}
