"use client";

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { PromptFilters, PromptWithRelations, PromptListItem } from "@/lib/types";
import type { FindManyResult } from "@/lib/db/queries/prompts";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const promptKeys = {
  all: ["prompts"] as const,
  lists: () => [...promptKeys.all, "list"] as const,
  list: (filters: PromptFilters) => [...promptKeys.lists(), filters] as const,
  details: () => [...promptKeys.all, "detail"] as const,
  detail: (id: string) => [...promptKeys.details(), id] as const,
  stats: () => ["stats"] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

function buildSearchParams(filters: PromptFilters): string {
  const sp = new URLSearchParams();
  if (filters.search) sp.set("search", filters.search);
  if (filters.tags?.length) sp.set("tags", filters.tags.join(","));
  if (filters.model) sp.set("model", filters.model);
  if (filters.is_favorite !== undefined) sp.set("is_favorite", String(filters.is_favorite));
  if (filters.sort_by) sp.set("sort_by", filters.sort_by);
  if (filters.sort_order) sp.set("sort_order", filters.sort_order);
  if (filters.page) sp.set("page", String(filters.page));
  if (filters.per_page) sp.set("per_page", String(filters.per_page));
  return sp.toString();
}

async function fetchPrompts(filters: PromptFilters): Promise<FindManyResult> {
  const qs = buildSearchParams(filters);
  const res = await fetch(`/api/prompts?${qs}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function fetchPrompt(id: string): Promise<PromptWithRelations> {
  const res = await fetch(`/api/prompts/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── usePrompts — paginated list ──────────────────────────────────────────────

export function usePrompts(filters: PromptFilters = {}) {
  return useQuery({
    queryKey: promptKeys.list(filters),
    queryFn: () => fetchPrompts(filters),
  });
}

// ─── useInfinitePrompts — infinite scroll ─────────────────────────────────────

export function useInfinitePrompts(filters: Omit<PromptFilters, "page"> = {}) {
  return useInfiniteQuery<
    FindManyResult,
    Error,
    InfiniteData<FindManyResult>,
    ReturnType<typeof promptKeys.list>,
    number
  >({
    queryKey: promptKeys.list(filters),
    queryFn: ({ pageParam }) => fetchPrompts({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + 1 : undefined,
  });
}

// ─── usePrompt — single detail ────────────────────────────────────────────────

export function usePrompt(id: string) {
  return useQuery({
    queryKey: promptKeys.detail(id),
    queryFn: () => fetchPrompt(id),
    enabled: !!id,
  });
}

// ─── useCreatePrompt ──────────────────────────────────────────────────────────

interface CreatePromptInput {
  title: string;
  body: string;
  model?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
  tags?: string[];
  category_id?: number | null;
}

export function useCreatePrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePromptInput): Promise<PromptWithRelations> => {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: promptKeys.lists() });
      qc.invalidateQueries({ queryKey: promptKeys.stats() });
    },
  });
}

// ─── useUpdatePrompt ──────────────────────────────────────────────────────────

interface UpdatePromptInput {
  id: string;
  title?: string;
  body?: string;
  model?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
  tags?: string[];
  category_id?: number | null;
}

export function useUpdatePrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdatePromptInput): Promise<PromptWithRelations> => {
      const res = await fetch(`/api/prompts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (updated) => {
      qc.setQueryData(promptKeys.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}

// ─── useDeletePrompt ──────────────────────────────────────────────────────────

export function useDeletePrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/prompts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: promptKeys.detail(id) });
      qc.invalidateQueries({ queryKey: promptKeys.lists() });
      qc.invalidateQueries({ queryKey: promptKeys.stats() });
    },
  });
}

// ─── useToggleFavorite ────────────────────────────────────────────────────────

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<PromptWithRelations> => {
      const current = await fetchPrompt(id);
      const res = await fetch(`/api/prompts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: !current.is_favorite }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (updated) => {
      qc.setQueryData(promptKeys.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}

// ─── useStats ─────────────────────────────────────────────────────────────────

export function useStats() {
  return useQuery({
    queryKey: promptKeys.stats(),
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    staleTime: 60_000,
  });
}
