"use client";

import { useRouter } from "next/navigation";
import type { PromptListItem } from "@/lib/types";
import { useToggleFavorite } from "@/hooks/usePrompts";
import { imageFileUrl } from "@/hooks/useImages";
import { ROUTES } from "@/lib/constants";
import { formatRelativeDate } from "@/lib/utils";

interface PromptCardProps {
  prompt: PromptListItem;
  style?: React.CSSProperties;
}

export function PromptCard({ prompt, style }: PromptCardProps) {
  const router = useRouter();
  const toggle = useToggleFavorite();

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle.mutate(prompt.id);
  };

  return (
    <div
      className="prompt-card"
      style={style}
      onClick={() => router.push(ROUTES.prompt(prompt.id))}
    >
      {/* Image / Placeholder */}
      <div className="prompt-card-media">
        {prompt.cover_image_id ? (
          <img
            className="prompt-card-image"
            src={imageFileUrl(prompt.cover_image_id, "thumb")}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="prompt-card-placeholder">
            <span style={{ fontSize: "2rem", opacity: 0.4 }}>⬡</span>
            <span style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5 }}>
              No image
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="prompt-card-body">
        {/* Badge row */}
        <div className="prompt-card-badge-row">
          {prompt.category_name && (
            <span
              className="prompt-card-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                borderColor: prompt.category_color ? `${prompt.category_color}55` : undefined,
                color: prompt.category_color ?? undefined,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: prompt.category_color ?? "#8b5cf6",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {prompt.category_name}
            </span>
          )}
          {prompt.model && (
            <span className="prompt-card-badge">{prompt.model}</span>
          )}
          {prompt.tags.slice(0, 2).map((tag) => (
            <span key={tag.id} className="prompt-card-badge prompt-card-badge-accent">
              #{tag.name}
            </span>
          ))}
          {prompt.tags.length > 2 && (
            <span className="prompt-card-badge">+{prompt.tags.length - 2}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="prompt-card-title">{prompt.title}</h3>

        {/* Body preview */}
        <p className="prompt-card-preview">{prompt.body}</p>

        {/* Footer */}
        <div className="prompt-card-footer">
          <span className="prompt-card-stat">{formatRelativeDate(prompt.created_at)}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {prompt.image_count > 0 && (
              <span className="prompt-card-stat" style={{ color: "var(--muted)" }}>
                🖼 {prompt.image_count}
              </span>
            )}
            <button
              className={`prompt-card-fav${prompt.is_favorite ? " is-fav" : ""}`}
              onClick={handleFav}
              aria-label={prompt.is_favorite ? "Unfavorite" : "Favorite"}
              type="button"
            >
              {prompt.is_favorite ? "★" : "☆"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
