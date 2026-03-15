"use client";

import { useSearchParams } from "next/navigation";
import { useInfinitePrompts } from "@/hooks/usePrompts";
import { PromptGrid } from "@/components/prompts/PromptGrid";
import { PromptFilters } from "@/components/prompts/PromptFilters";
import type { PromptListItem } from "@/lib/types";

export function PromptsView() {
  const searchParams = useSearchParams();

  const rawCategory = searchParams.get("category");
  const categoryId = rawCategory ? parseInt(rawCategory, 10) : undefined;

  const filters = {
    search: searchParams.get("search") ?? undefined,
    tags: searchParams.get("tags")
      ? searchParams.get("tags")!.split(",").filter(Boolean)
      : undefined,
    model: searchParams.get("model") ?? undefined,
    is_favorite: searchParams.get("is_favorite") === "true" ? true : undefined,
    categoryId: categoryId && !isNaN(categoryId) ? categoryId : undefined,
    sort_by: (searchParams.get("sort_by") as "created_at" | "updated_at" | "title") ?? undefined,
    sort_order: (searchParams.get("sort_order") as "asc" | "desc") ?? undefined,
  };

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfinitePrompts(filters);

  const prompts: PromptListItem[] = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.total ?? -1;

  return (
    <div>
      <PromptFilters total={total >= 0 ? total : undefined} />

      {!isLoading && prompts.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: "2rem", marginBottom: 12 }}>⬡</p>
          <p style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>No prompts found</p>
          <p style={{ fontSize: "0.9rem" }}>Try adjusting your filters or create a new prompt.</p>
        </div>
      ) : (
        <PromptGrid
          prompts={prompts}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          onLoadMore={fetchNextPage}
        />
      )}
    </div>
  );
}
