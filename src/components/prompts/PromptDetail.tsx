"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PromptWithRelations } from "@/lib/types";
import { ImageGallery } from "@/components/images/ImageGallery";
import { useToggleFavorite, useDeletePrompt } from "@/hooks/usePrompts";
import { formatDateTime, formatRelativeDate } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

interface PromptDetailProps {
  prompt: PromptWithRelations;
}

export function PromptDetail({ prompt }: PromptDetailProps) {
  const router = useRouter();
  const toggle = useToggleFavorite();
  const deleteMutation = useDeletePrompt();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(prompt.id);
    router.push(ROUTES.prompts);
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 48px", display: "grid", gap: 18 }}>

      {/* Actions bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <button
          className={`btn-ghost${prompt.is_favorite ? "" : ""}`}
          style={{ color: prompt.is_favorite ? "#c7ea46" : undefined, borderColor: prompt.is_favorite ? "rgba(199,234,70,0.3)" : undefined }}
          onClick={() => toggle.mutate(prompt.id)}
          type="button"
        >
          {prompt.is_favorite ? "★ Favorited" : "☆ Favorite"}
        </button>

        <button
          className="btn-accent-outline"
          onClick={handleCopy}
          type="button"
        >
          {copied ? "✓ Copied!" : "Copy Prompt"}
        </button>

        <button
          className="btn-ghost"
          onClick={() => router.push(`${ROUTES.prompt(prompt.id)}/edit`)}
          type="button"
        >
          Edit
        </button>

        <button
          className="btn-ghost"
          style={{ color: "var(--danger)", borderColor: "rgba(233,104,104,0.2)", marginLeft: "auto" }}
          onClick={() => setShowDeleteDialog(true)}
          type="button"
        >
          Delete
        </button>
      </div>

      {/* Meta badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
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
                width: 9,
                height: 9,
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
        {prompt.tags.map((tag) => (
          <span key={tag.id} className="prompt-card-badge prompt-card-badge-accent">
            #{tag.name}
          </span>
        ))}
        <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: "0.84rem" }}>
          {formatRelativeDate(prompt.created_at)}
        </span>
      </div>

      {/* Body */}
      <div className="panel surface-glow" style={{ position: "relative" }}>
        <p className="section-kicker" style={{ marginBottom: 14 }}>Prompt Text</p>
        <pre className="prose-prompt">{prompt.body}</pre>
      </div>

      {/* Notes */}
      {prompt.notes && (
        <div className="panel surface-glow">
          <p className="section-kicker" style={{ marginBottom: 10 }}>Notes</p>
          <p style={{ color: "#c3ccd8", fontSize: "0.94rem", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
            {prompt.notes}
          </p>
        </div>
      )}

      {/* Images */}
      {prompt.images.length > 0 && (
        <div>
          <p className="section-kicker" style={{ marginBottom: 12 }}>
            Images ({prompt.images.length})
          </p>
          <ImageGallery images={prompt.images} promptId={prompt.id} />
        </div>
      )}

      {/* Delete modal */}
      {showDeleteDialog && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div>
                <p className="section-kicker">Delete Prompt</p>
                <h2 style={{ fontSize: "1.4rem" }}>Are you sure?</h2>
              </div>
              <button className="modal-close" onClick={() => setShowDeleteDialog(false)} type="button">×</button>
            </div>
            <p className="hero-text" style={{ marginBottom: 24 }}>
              <strong style={{ color: "var(--text)" }}>{prompt.title}</strong> will be permanently deleted.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteDialog(false)} type="button">Cancel</button>
              <button
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
