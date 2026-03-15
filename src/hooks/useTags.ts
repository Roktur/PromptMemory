"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tag } from "@/lib/types";

export interface TagWithCount extends Tag {
  prompt_count: number;
}

// ─── useTags — all tags (popular ordering) ────────────────────────────────────

export function useTags(limit = 100) {
  return useQuery({
    queryKey: ["tags", "popular", limit],
    queryFn: async (): Promise<TagWithCount[]> => {
      const res = await fetch(`/api/tags?popular=true&limit=${limit}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    staleTime: 30_000,
  });
}

// ─── useSearchTags — prefix search for autocomplete ──────────────────────────

export function useSearchTags(query: string, limit = 20) {
  return useQuery({
    queryKey: ["tags", "search", query, limit],
    queryFn: async (): Promise<TagWithCount[]> => {
      const sp = new URLSearchParams({ q: query, limit: String(limit) });
      const res = await fetch(`/api/tags?${sp}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: query.length > 0,
    staleTime: 15_000,
  });
}

// ─── useRenameTag ─────────────────────────────────────────────────────────────

export function useRenameTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<Tag>;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tags"] }); },
  });
}

// ─── useDeleteTag ─────────────────────────────────────────────────────────────

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tags"] }); },
  });
}
