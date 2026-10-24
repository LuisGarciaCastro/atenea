import Marco from "@/app/components/ui/Marco";
import TemaClient from "./TemaClient";

export default async function TemaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Marco>
      <TemaClient slug={slug} />
    </Marco>
  );
}
