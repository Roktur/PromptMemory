import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { EditPromptClient } from "./EditPromptClient";
import { findPromptById } from "@/lib/db/queries/prompts";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPromptPage({ params }: PageProps) {
  const { id } = await params;
  const prompt = findPromptById(id);

  if (!prompt) notFound();

  return (
    <AppShell variant="detail" backHref={`/prompts/${id}`} heroEyebrow="Edit Prompt">
      <EditPromptClient initialPrompt={prompt} />
    </AppShell>
  );
}
