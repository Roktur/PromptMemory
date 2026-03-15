"use client";

import { useRef, useEffect } from "react";
import type { PromptListItem } from "@/lib/types";
import { PromptCard } from "./PromptCard";

interface PromptGridProps {
  prompts: PromptListItem[];
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
}

function CardSkeleton() {
  return (
    <div className="prompt-card" style={{ pointerEvents: "none" }}>
      <div className="prompt-card-media">
        <div className="prompt-card-placeholder skeleton" style={{ height: 200 }} />
      </div>
      <div className="prompt-card-body" style={{ gap: 10 }}>
        <div className="skeleton" style={{ height: 12, width: "60%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 18, width: "90%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 12, width: "100%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 12, width: "80%", borderRadius: 6 }} />
      </div>
    </div>
  );
}

export function PromptGrid({
  prompts,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
}: PromptGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll via IntersectionObserver on a sentinel element
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !onLoadMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  if (isLoading) {
    return (
      <div className="cards-grid cards-grid-prompts">
        {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div>
      <div className="cards-grid cards-grid-prompts">
        {prompts.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} />
        ))}
      </div>

      {/* Sentinel triggers next page load when scrolled into view */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {isFetchingNextPage && (
        <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            border: "2px solid rgba(199,234,70,0.3)",
            borderTopColor: "#c7ea46",
            animation: "spin 0.7s linear infinite"
          }} />
        </div>
      )}
    </div>
  );
}
