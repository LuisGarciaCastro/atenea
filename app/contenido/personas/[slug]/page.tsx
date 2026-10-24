import Marco from "@/app/components/ui/Marco";
import PersonaClient from "./PersonaClient";

export default async function PersonaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Marco>
      <PersonaClient slug={slug} />
    </Marco>
  );
}
