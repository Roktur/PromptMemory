import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Model } from "@/lib/types";

type ModelWithCount = Model & { prompt_count: number };

async function fetchModels(): Promise<ModelWithCount[]> {
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error("Failed to fetch models");
  return res.json();
}

export function useModels() {
  return useQuery<ModelWithCount[]>({
    queryKey: ["models"],
    queryFn: fetchModels,
    staleTime: 30_000,
  });
}

export function useCreateModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to create model");
      }
      return res.json() as Promise<Model>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models"] }),
  });
}

export function useUpdateModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await fetch(`/api/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to update model");
      }
      return res.json() as Promise<Model>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["models"] });
      qc.invalidateQueries({ queryKey: ["prompts"] });
    },
  });
}

export function useDeleteModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/models/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete model");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["models"] });
      qc.invalidateQueries({ queryKey: ["prompts"] });
    },
  });
}
