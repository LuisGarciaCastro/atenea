import { Suspense } from "react";
import Marco from "@/app/components/ui/Marco";
import CoachClient from "./CoachClient";

export default function CoachPage() {
  return (
    <Marco>
      <Suspense>
        <CoachClient />
      </Suspense>
    </Marco>
  );
}
