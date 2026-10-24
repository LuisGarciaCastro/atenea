import Marco from "@/app/components/ui/Marco";
import ContenidoClient from "./ContenidoClient";
import { filtroDe } from "./filtros";

export default async function ContenidoPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  return (
    <Marco>
      <ContenidoClient filtroInicial={filtroDe((await searchParams).ver)} />
    </Marco>
  );
}
