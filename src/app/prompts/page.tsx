import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PromptsView } from "./PromptsView";

export default function PromptsPage() {
  return (
    <AppShell>
      <Suspense>
        <PromptsView />
      </Suspense>
    </AppShell>
  );
}
