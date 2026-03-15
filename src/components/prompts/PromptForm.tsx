"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PromptWithRelations } from "@/lib/types";
import { useSearchTags } from "@/hooks/useTags";
import { useCategories } from "@/hooks/useCategories";
import { useModels } from "@/hooks/useModels";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  body: z.string().min(1, "Body is required"),
  model: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PromptFormProps {
  defaultValues?: Partial<PromptWithRelations>;
  onSubmit: (values: FormValues & { tags: string[]; category_id: number | null }) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function PromptForm({ defaultValues, onSubmit, isSubmitting, submitLabel = "Save Prompt" }: PromptFormProps) {
  const [tags, setTags] = useState<string[]>(defaultValues?.tags?.map((t) => t.name) ?? []);
  const [tagInput, setTagInput] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(defaultValues?.category_id ?? null);
  const { data: tagSuggestions } = useSearchTags(tagInput, 8);
  const { data: categories } = useCategories();
  const { data: models } = useModels();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      body: defaultValues?.body ?? "",
      model: defaultValues?.model ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  const addTag = (name: string) => {
    const t = name.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((p) => [...p, t]);
    setTagInput("");
  };

  const handleTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
    if (e.key === "Backspace" && tagInput === "" && tags.length > 0) setTags((p) => p.slice(0, -1));
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit(async (v) => onSubmit({ ...v, tags, category_id: categoryId }))}>

      {/* Title */}
      <div className="form-field">
        <label className="form-label">Title *</label>
        <input
          className="form-input"
          style={errors.title ? { borderColor: "rgba(233,104,104,0.5)" } : {}}
          placeholder="Give your prompt a descriptive title"
          {...register("title")}
        />
        {errors.title && <p className="form-error">{errors.title.message}</p>}
      </div>

      {/* Body */}
      <div className="form-field">
        <label className="form-label">Prompt Text *</label>
        <textarea
          className="form-textarea"
          style={{ minHeight: 240, ...(errors.body ? { borderColor: "rgba(233,104,104,0.5)" } : {}) }}
          placeholder="Write your prompt here..."
          {...register("body")}
        />
        {errors.body && <p className="form-error">{errors.body.message}</p>}
      </div>

      {/* Model */}
      <div className="form-field">
        <label className="form-label">Model</label>
        <select className="form-select" {...register("model")}>
          <option value="">No model specified</option>
          {models?.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
        </select>
      </div>

      {/* Category */}
      <div className="form-field">
        <label className="form-label">Category</label>
        <select
          className="form-select"
          value={categoryId ?? ""}
          onChange={(e) => setCategoryId(e.target.value === "" ? null : parseInt(e.target.value, 10))}
        >
          <option value="">No category</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {/* Color swatch preview */}
        {categoryId && categories && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: categories.find((c) => c.id === categoryId)?.color ?? "#8b5cf6",
                display: "inline-block",
              }}
            />
            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
              {categories.find((c) => c.id === categoryId)?.name}
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="form-field">
        <label className="form-label">Tags</label>
        <div
          className="form-input"
          style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", minHeight: 52, height: "auto", padding: "10px 14px" }}
        >
          {tags.map((tag) => (
            <span key={tag} className="tag-chip tag-chip-accent">
              #{tag}
              <button
                type="button"
                onClick={() => setTags((p) => p.filter((t) => t !== tag))}
                style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", padding: 0, fontSize: "0.9rem", lineHeight: 1 }}
              >×</button>
            </span>
          ))}
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
              placeholder={tags.length === 0 ? "Add tags (Enter or comma)…" : ""}
              style={{ border: 0, background: "transparent", outline: "none", color: "var(--text)", minWidth: 120, width: "100%", fontSize: "0.9rem" }}
            />
            {tagInput.length > 0 && tagSuggestions && tagSuggestions.length > 0 && (
              <div style={{
                position: "absolute", left: 0, top: "100%", zIndex: 20, marginTop: 4,
                background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                minWidth: 200, boxShadow: "var(--shadow)"
              }}>
                {tagSuggestions.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => addTag(tag.name)}
                    style={{
                      display: "flex", justifyContent: "space-between", width: "100%",
                      padding: "10px 14px", border: 0, background: "transparent",
                      color: "var(--muted)", cursor: "pointer", fontSize: "0.88rem", gap: 12
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span>{tag.name}</span>
                    <span style={{ color: "var(--muted)", opacity: 0.6 }}>{tag.prompt_count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="form-field">
        <label className="form-label">Notes</label>
        <textarea
          className="form-textarea"
          style={{ minHeight: 100 }}
          placeholder="Optional notes about this prompt…"
          {...register("notes")}
        />
      </div>

      {/* Submit */}
      <div className="modal-actions">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000", animation: "spin 0.7s linear infinite" }} />
          ) : submitLabel}
        </button>
      </div>
    </form>
  );
}
