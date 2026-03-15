"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { promptKeys } from "./usePrompts";
import type { PromptImage } from "@/lib/types";

// ─── useUploadImage ───────────────────────────────────────────────────────────

interface UploadImageInput {
  promptId: string;
  file: File;
}

export function useUploadImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ promptId, file }: UploadImageInput): Promise<PromptImage> => {
      const form = new FormData();
      form.append("prompt_id", promptId);
      form.append("file", file);

      const res = await fetch("/api/images", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_data, { promptId }) => {
      qc.invalidateQueries({ queryKey: promptKeys.detail(promptId) });
      qc.invalidateQueries({ queryKey: promptKeys.lists() });
      qc.invalidateQueries({ queryKey: promptKeys.stats() });
    },
  });
}

// ─── useDeleteImage ───────────────────────────────────────────────────────────

interface DeleteImageInput {
  imageId: string;
  promptId: string;
}

export function useDeleteImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ imageId }: DeleteImageInput): Promise<void> => {
      const res = await fetch(`/api/images/${imageId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: (_data, { promptId }) => {
      qc.invalidateQueries({ queryKey: promptKeys.detail(promptId) });
      qc.invalidateQueries({ queryKey: promptKeys.lists() });
      qc.invalidateQueries({ queryKey: promptKeys.stats() });
    },
  });
}

// ─── Image URL helper ─────────────────────────────────────────────────────────

export function imageFileUrl(imageId: string, variant: "thumb" | "medium" | "original" = "medium"): string {
  return `/api/images/${imageId}/file?v=${variant}`;
}
