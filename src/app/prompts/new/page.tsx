"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PromptForm } from "@/components/prompts/PromptForm";
import { useCreatePrompt } from "@/hooks/usePrompts";
import { ROUTES } from "@/lib/constants";

export default function NewPromptPage() {
  const router = useRouter();
  const create = useCreatePrompt();

  return (
    <AppShell variant="detail" backHref="/prompts" heroEyebrow="New Prompt">
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 48px" }}>
        <PromptForm
          submitLabel="Save Prompt"
          isSubmitting={create.isPending}
          onSubmit={async (values) => {
            const prompt = await create.mutateAsync({
              title: values.title,
              body: values.body,
              model: values.model || null,
              notes: values.notes || null,
              tags: values.tags,
              category_id: values.category_id,
            });
            router.push(ROUTES.prompt(prompt.id));
          }}
        />
      </div>
    </AppShell>
  );
}
