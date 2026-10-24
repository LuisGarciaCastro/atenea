import Marco from "@/app/components/ui/Marco";
import VideoClient from "./VideoClient";

interface Params {
  params: Promise<{ youtubeId: string }>;
}

export default async function VideoPage({ params }: Params) {
  const { youtubeId } = await params;
  return (
    <Marco>
      <VideoClient youtubeId={youtubeId} />
    </Marco>
  );
}
