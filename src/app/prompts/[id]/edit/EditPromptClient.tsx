"use client";

import { useRouter } from "next/navigation";
import type { PromptWithRelations } from "@/lib/types";
import { PromptForm } from "@/components/prompts/PromptForm";
import { useUpdatePrompt } from "@/hooks/usePrompts";
import { ROUTES } from "@/lib/constants";

export function EditPromptClient({ initialPrompt }: { initialPrompt: PromptWithRelations }) {
  const router = useRouter();
  const update = useUpdatePrompt();

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 48px" }}>
      <PromptForm
        defaultValues={initialPrompt}
        submitLabel="Save Changes"
        isSubmitting={update.isPending}
        onSubmit={async (values) => {
          await update.mutateAsync({
            id: initialPrompt.id,
            title: values.title,
            body: values.body,
            model: values.model || null,
            notes: values.notes || null,
            tags: values.tags,
            category_id: values.category_id,
          });
          router.push(ROUTES.prompt(initialPrompt.id));
        }}
      />
    </div>
  );
}
