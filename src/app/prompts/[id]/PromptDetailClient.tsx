"use client";

import { Suspense } from "react";
import type { PromptWithRelations } from "@/lib/types";
import { PromptDetail } from "@/components/prompts/PromptDetail";
import { ImageUploader } from "@/components/images/ImageUploader";
import { usePrompt } from "@/hooks/usePrompts";

export function PromptDetailClient({ initialPrompt }: { initialPrompt: PromptWithRelations }) {
  const { data: prompt = initialPrompt } = usePrompt(initialPrompt.id);

  return (
    <>
      <PromptDetail prompt={prompt} />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px" }}>
        <div className="panel surface-glow">
          <p className="section-kicker" style={{ marginBottom: 14 }}>Add Images</p>
          <Suspense>
            <ImageUploader promptId={prompt.id} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
