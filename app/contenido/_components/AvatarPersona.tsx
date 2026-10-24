import type { CSSProperties } from "react";
import styles from "./avatar.module.css";
import { paletaPara } from "@/app/contenido/_components/paleta";
import { iniciales } from "@/app/contenido/formato";

const TAMANOS = { sm: 32, md: 40, lg: 64, xl: 84 } as const;
const FUENTES = { sm: 12, md: 15, lg: 22, xl: 28 } as const;

type Tamano = keyof typeof TAMANOS;

export default function AvatarPersona({
  nombre,
  fotoUrl,
  tamano = "md",
}: {
  nombre: string;
  fotoUrl: string | null;
  tamano?: Tamano;
}) {
  const size = TAMANOS[tamano];

  if (fotoUrl) {
    return (
      <span className={styles.avatar} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fotoUrl} alt={nombre} />
      </span>
    );
  }

  const [c1, c2] = paletaPara(nombre);
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: FUENTES[tamano], "--c1": c1, "--c2": c2 } as CSSProperties}
      aria-hidden="true"
    >
      {iniciales(nombre)}
    </span>
  );
}
