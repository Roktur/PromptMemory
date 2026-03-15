import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PromptDetailClient } from "./PromptDetailClient";
import { findPromptById } from "@/lib/db/queries/prompts";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PromptPage({ params }: PageProps) {
  const { id } = await params;
  const prompt = findPromptById(id);

  if (!prompt) notFound();

  return (
    <AppShell variant="detail" backHref="/prompts" heroEyebrow="Prompt" heroTitle={prompt.title}>
      <PromptDetailClient initialPrompt={prompt} />
    </AppShell>
  );
}
