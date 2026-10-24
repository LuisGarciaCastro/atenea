import { redirect } from "next/navigation";

/** El Panel se repartió entre Hoy, Libros e Ideas: los enlaces antiguos van a Hoy. */
export default function PanelPage() {
  redirect("/");
}
