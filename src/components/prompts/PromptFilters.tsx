"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export function PromptFilters({ total }: { total?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sortBy = searchParams.get("sort_by") ?? "created_at";
  const sortOrder = searchParams.get("sort_order") ?? "desc";
  const hasFilters = !!(
    searchParams.get("search") ||
    searchParams.get("tags") ||
    searchParams.get("is_favorite") ||
    searchParams.get("category")
  );

  const set = (key: string, value: string | null) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (value === null) sp.delete(key);
    else sp.set(key, value);
    sp.delete("page");
    router.push(`${ROUTES.prompts}?${sp.toString()}`);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Top row: count + sort */}
      <div className="sort-bar">
        {total !== undefined && total >= 0 && (
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
            {total.toLocaleString()} prompts
          </span>
        )}

        <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto" }}>
          <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Sort:</span>
          {(["created_at", "updated_at", "title"] as const).map((field) => (
            <button
              key={field}
              className={`sort-btn${sortBy === field ? " is-active" : ""}`}
              onClick={() => set("sort_by", field)}
              type="button"
            >
              {field === "created_at" ? "New" : field === "updated_at" ? "Updated" : "A–Z"}
            </button>
          ))}
          <button
            className="sort-btn"
            onClick={() => set("sort_order", sortOrder === "desc" ? "asc" : "desc")}
            type="button"
            title="Toggle order"
          >
            {sortOrder === "desc" ? "↓" : "↑"}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="active-filters">
          {searchParams.get("search") && (
            <span className="active-filter-chip">
              search: {searchParams.get("search")}
              <button onClick={() => set("search", null)} type="button">×</button>
            </span>
          )}
          {searchParams.get("tags") && (
            <span className="active-filter-chip">
              #{searchParams.get("tags")}
              <button onClick={() => set("tags", null)} type="button">×</button>
            </span>
          )}
          {searchParams.get("is_favorite") === "true" && (
            <span className="active-filter-chip">
              ★ Favorites
              <button onClick={() => set("is_favorite", null)} type="button">×</button>
            </span>
          )}
          {searchParams.get("category") && (
            <span className="active-filter-chip">
              Category: {searchParams.get("category")}
              <button onClick={() => set("category", null)} type="button">×</button>
            </span>
          )}
          <button
            className="btn-ghost"
            style={{ padding: "4px 10px", fontSize: "0.8rem" }}
            onClick={() => router.push(ROUTES.prompts)}
            type="button"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
