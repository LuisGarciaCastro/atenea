import Link from "next/link";
import comun from "@/app/components/ui/comun.module.css";
import { T } from "@/app/components/ui/iconos";

/** Vuelta al cuaderno, con el filtro del que se venía ya puesto. */
export default function Volver({ filtro }: { filtro?: "temas" | "personas" | "guardados" }) {
  return (
    <Link href={filtro ? `/contenido?ver=${filtro}` : "/contenido"} className={comun.back}>
      {T.volver} Ideas
    </Link>
  );
}
