"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStats } from "@/hooks/usePrompts";
import { useTags, useRenameTag, useDeleteTag } from "@/hooks/useTags";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/useCategories";
import {
  useModels,
  useCreateModel,
  useUpdateModel,
  useDeleteModel,
} from "@/hooks/useModels";
import { ROUTES } from "@/lib/constants";

// ── Collapsible section header ───────────────────────────────────────────────
function SectionHeader({
  label, isOpen, onToggle, onAdd,
}: { label: React.ReactNode; isOpen: boolean; onToggle: () => void; onAdd: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: isOpen ? 6 : 0 }}>
      <button
        type="button"
        onClick={onToggle}
        className="filter-btn"
        style={{ flex: 1, minHeight: 48 }}
      >
        <span>{label}</span>
        <span style={{ color: "var(--muted)", fontSize: "0.75rem", display: "inline-block", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>
      <button
        type="button"
        onClick={onAdd}
        style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--muted)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "2px 7px", flexShrink: 0, minHeight: 48, minWidth: 36 }}
        title="Add"
      >+</button>
    </div>
  );
}

function CollapseWrapper({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const PRESET_COLORS = [
  "#8b5cf6","#3b82f6","#10b981","#f59e0b",
  "#ef4444","#ec4899","#06b6d4","#84cc16",
];

// Shared inline action buttons style helper
const actionBtnStyle = (danger = false): React.CSSProperties => ({
  background: "var(--panel)",
  border: `1px solid ${danger ? "rgba(233,104,104,0.25)" : "var(--border)"}`,
  borderRadius: "var(--radius-sm)",
  color: danger ? "var(--danger)" : "var(--muted)",
  cursor: "pointer",
  fontSize: "0.75rem",
  padding: "2px 5px",
  lineHeight: 1.2,
});

export function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);

  // Section open states
  const [tagsOpen, setTagsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);

  const { data: stats } = useStats();
  const { data: tags } = useTags(40);
  const { data: categories } = useCategories();
  const { data: models } = useModels();

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const renameTag = useRenameTag();
  const deleteTag = useDeleteTag();
  const createModel = useCreateModel();
  const updateModel = useUpdateModel();
  const deleteModel = useDeleteModel();

  // Category form state
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]!);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatColor, setEditCatColor] = useState("");
  const newCatInputRef = useRef<HTMLInputElement>(null);
  const editCatInputRef = useRef<HTMLInputElement>(null);

  // Tag edit state
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const editTagInputRef = useRef<HTMLInputElement>(null);

  // Model form state
  const [showNewModelForm, setShowNewModelForm] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [editingModelId, setEditingModelId] = useState<number | null>(null);
  const [editModelName, setEditModelName] = useState("");
  const newModelInputRef = useRef<HTMLInputElement>(null);
  const editModelInputRef = useRef<HTMLInputElement>(null);

  const activeTag = searchParams.get("tags");
  const activeCategory = searchParams.get("category");
  const activeModel = searchParams.get("model");
  const isFavorites = searchParams.get("is_favorite") === "true";

  const navigate = (key: string, value: string | null) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (value === null) sp.delete(key);
    else sp.set(key, value);
    sp.delete("page");
    router.push(`${ROUTES.prompts}?${sp.toString()}`);
  };

  // ── Category handlers ────────────────────────────────────────────────────
  const handleCatCreate = async () => {
    const name = newCatName.trim();
    if (!name) return;
    try {
      await createCategory.mutateAsync({ name, color: newCatColor });
      setNewCatName(""); setNewCatColor(PRESET_COLORS[0]!); setShowNewCatForm(false);
    } catch {}
  };

  const startEditCat = (id: number, name: string, color: string) => {
    setEditingCatId(id); setEditCatName(name); setEditCatColor(color);
    setTimeout(() => editCatInputRef.current?.focus(), 0);
  };

  const handleCatUpdate = async (id: number) => {
    const name = editCatName.trim();
    if (!name) return;
    try { await updateCategory.mutateAsync({ id, name, color: editCatColor }); setEditingCatId(null); } catch {}
  };

  const handleCatDelete = async (id: number) => {
    if (!confirm("Delete this category? Prompts will be uncategorized.")) return;
    await deleteCategory.mutateAsync(id);
    if (activeCategory === String(id)) navigate("category", null);
  };

  // ── Tag handlers ─────────────────────────────────────────────────────────
  const startEditTag = (id: number, name: string) => {
    setEditingTagId(id); setEditTagName(name);
    setTimeout(() => editTagInputRef.current?.focus(), 0);
  };

  const handleTagUpdate = async (id: number) => {
    const name = editTagName.trim();
    if (!name) return;
    try { await renameTag.mutateAsync({ id, name }); setEditingTagId(null); } catch {}
  };

  const handleTagDelete = async (id: number, name: string) => {
    if (!confirm(`Delete tag "#${name}"? It will be removed from all prompts.`)) return;
    await deleteTag.mutateAsync(id);
    if (activeTag === name) navigate("tags", null);
  };

  // ── Model handlers ───────────────────────────────────────────────────────
  const handleModelCreate = async () => {
    const name = newModelName.trim();
    if (!name) return;
    try {
      await createModel.mutateAsync(name);
      setNewModelName(""); setShowNewModelForm(false);
    } catch {}
  };

  const startEditModel = (id: number, name: string) => {
    setEditingModelId(id); setEditModelName(name);
    setTimeout(() => editModelInputRef.current?.focus(), 0);
  };

  const handleModelUpdate = async (id: number) => {
    const name = editModelName.trim();
    if (!name) return;
    try { await updateModel.mutateAsync({ id, name }); setEditingModelId(null); } catch {}
  };

  const handleModelDelete = async (id: number, name: string) => {
    if (!confirm(`Delete model "${name}"?`)) return;
    await deleteModel.mutateAsync(id);
    if (activeModel === name) navigate("model", null);
  };


  return (
    <section
      className={`panel surface-glow sidebar-section${collapsed ? " is-collapsed" : ""}`}
      style={{ display: "grid", gap: 16 }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p className="section-kicker">Navigation</p>
          <h2 style={{ fontSize: "1.3rem" }}>Your prompts</h2>
        </div>
        <button className="sidebar-toggle" onClick={() => setCollapsed((v) => !v)} type="button">
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      {!collapsed && (
        <>
          {stats && (
            <p className="section-meta" style={{ marginTop: -8 }}>
              {stats.prompts.total.toLocaleString()} prompts · {stats.prompts.favorites} favorites
            </p>
          )}

          {/* All / Favorites */}
          <div className="filter-bar-vertical">
            <button
              className={`filter-btn${!activeTag && !isFavorites && !activeCategory && !activeModel ? " is-active" : ""}`}
              onClick={() => router.push(ROUTES.prompts)}
              type="button"
            >
              <span>All Prompts</span>
              {stats && <span className="filter-btn-count">{stats.prompts.total.toLocaleString()}</span>}
            </button>
            <button
              className={`filter-btn${isFavorites ? " is-active" : ""}`}
              onClick={() => navigate("is_favorite", isFavorites ? null : "true")}
              type="button"
            >
              <span>★ Favorites</span>
              {stats && <span className="filter-btn-count">{stats.prompts.favorites}</span>}
            </button>
          </div>

          {/* ── Tags ── */}
          <div>
            <SectionHeader
              label={<>Tags {activeTag && <span style={{ color: "var(--accent)" }}>· {activeTag}</span>}</>}
              isOpen={tagsOpen}
              onToggle={() => setTagsOpen((v) => !v)}
              onAdd={() => setTagsOpen(true)}
            />
            <CollapseWrapper isOpen={tagsOpen}>
              <div className="filter-bar-vertical">
                <AnimatePresence>
                  {tags?.map((tag, i) => (
                    <motion.div key={tag.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ delay: i * 0.04 }} style={{ position: "relative" }}>
                      {editingTagId === tag.id ? (
                        <div style={{ display: "grid", gap: 5, padding: "6px 0" }}>
                          <input ref={editTagInputRef} type="text" value={editTagName} onChange={(e) => setEditTagName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleTagUpdate(tag.id); } if (e.key === "Escape") setEditingTagId(null); }}
                            className="form-input" style={{ fontSize: "0.85rem", padding: "6px 10px" }} />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" className="btn-primary" style={{ fontSize: "0.78rem", padding: "4px 10px" }} onClick={() => handleTagUpdate(tag.id)} disabled={renameTag.isPending}>Save</button>
                            <button type="button" className="btn-secondary" style={{ fontSize: "0.78rem", padding: "4px 10px" }} onClick={() => setEditingTagId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="sidebar-cat-row" style={{ position: "relative" }}>
                          <button className={`filter-btn${activeTag === tag.name ? " is-active" : ""}`} onClick={() => { navigate("tags", activeTag === tag.name ? null : tag.name); if (isFavorites) navigate("is_favorite", null); }} type="button" style={{ flex: 1 }}>
                            <span>#{tag.name}</span>
                            <span className="filter-btn-count">{tag.prompt_count}</span>
                          </button>
                          <div className="sidebar-cat-actions" style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s", pointerEvents: "none" }}>
                            <button type="button" style={actionBtnStyle()} onClick={(e) => { e.stopPropagation(); startEditTag(tag.id, tag.name); }} title="Rename">✎</button>
                            <button type="button" style={actionBtnStyle(true)} onClick={(e) => { e.stopPropagation(); handleTagDelete(tag.id, tag.name); }} title="Delete">✕</button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {(!tags || tags.length === 0) && (
                  <p style={{ color: "var(--muted)", fontSize: "0.82rem", padding: "4px 0" }}>No tags yet.</p>
                )}
              </div>
            </CollapseWrapper>
          </div>

          {/* ── Categories ── */}
          <div>
            <SectionHeader
              label={<>Categories {activeCategory && categories && <span style={{ color: "var(--accent)" }}>· {categories.find((c) => String(c.id) === activeCategory)?.name}</span>}</>}
              isOpen={categoriesOpen}
              onToggle={() => setCategoriesOpen((v) => !v)}
              onAdd={() => { setCategoriesOpen(true); setShowNewCatForm((v) => !v); setTimeout(() => newCatInputRef.current?.focus(), 50); }}
            />
            <CollapseWrapper isOpen={categoriesOpen}>
              {/* New category form */}
              <AnimatePresence>
                {showNewCatForm && (
                  <motion.div key="new-cat" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ display: "grid", gap: 6, padding: "8px 0" }}>
                      <input ref={newCatInputRef} type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCatCreate(); } if (e.key === "Escape") { setShowNewCatForm(false); setNewCatName(""); } }}
                        placeholder="Category name…" className="form-input" style={{ fontSize: "0.85rem", padding: "6px 10px" }} />
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {PRESET_COLORS.map((c) => (
                          <button key={c} type="button" onClick={() => setNewCatColor(c)}
                            style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: newCatColor === c ? "2px solid var(--text)" : "2px solid transparent", cursor: "pointer", padding: 0 }} />
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" className="btn-primary" style={{ fontSize: "0.8rem", padding: "5px 12px" }} onClick={handleCatCreate} disabled={createCategory.isPending || !newCatName.trim()}>
                          {createCategory.isPending ? "Adding…" : "Add"}
                        </button>
                        <button type="button" className="btn-secondary" style={{ fontSize: "0.8rem", padding: "5px 12px" }} onClick={() => { setShowNewCatForm(false); setNewCatName(""); }}>Cancel</button>
                      </div>
                      {createCategory.isError && <p style={{ color: "var(--danger)", fontSize: "0.78rem", margin: 0 }}>{(createCategory.error as Error).message}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="filter-bar-vertical">
                <AnimatePresence>
                  {categories?.map((cat, i) => (
                    <motion.div key={cat.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ delay: i * 0.04 }} style={{ position: "relative" }}>
                      {editingCatId === cat.id ? (
                        <div style={{ display: "grid", gap: 5, padding: "6px 0" }}>
                          <input ref={editCatInputRef} type="text" value={editCatName} onChange={(e) => setEditCatName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCatUpdate(cat.id); } if (e.key === "Escape") setEditingCatId(null); }}
                            className="form-input" style={{ fontSize: "0.85rem", padding: "6px 10px" }} />
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {PRESET_COLORS.map((c) => (
                              <button key={c} type="button" onClick={() => setEditCatColor(c)}
                                style={{ width: 18, height: 18, borderRadius: "50%", background: c, border: editCatColor === c ? "2px solid var(--text)" : "2px solid transparent", cursor: "pointer", padding: 0 }} />
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" className="btn-primary" style={{ fontSize: "0.78rem", padding: "4px 10px" }} onClick={() => handleCatUpdate(cat.id)} disabled={updateCategory.isPending}>Save</button>
                            <button type="button" className="btn-secondary" style={{ fontSize: "0.78rem", padding: "4px 10px" }} onClick={() => setEditingCatId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="sidebar-cat-row" style={{ position: "relative" }}>
                          <button className={`filter-btn${activeCategory === String(cat.id) ? " is-active" : ""}`} onClick={() => navigate("category", activeCategory === String(cat.id) ? null : String(cat.id))} type="button" style={{ flex: 1 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color, flexShrink: 0, display: "inline-block" }} />
                              {cat.name}
                            </span>
                            <span className="filter-btn-count">{cat.prompt_count}</span>
                          </button>
                          <div className="sidebar-cat-actions" style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s", pointerEvents: "none" }}>
                            <button type="button" style={actionBtnStyle()} onClick={(e) => { e.stopPropagation(); startEditCat(cat.id, cat.name, cat.color); }} title="Rename">✎</button>
                            <button type="button" style={actionBtnStyle(true)} onClick={(e) => { e.stopPropagation(); handleCatDelete(cat.id); }} title="Delete">✕</button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {categories?.length === 0 && !showNewCatForm && (
                  <p style={{ color: "var(--muted)", fontSize: "0.82rem", padding: "4px 0" }}>No categories yet.</p>
                )}
              </div>
            </CollapseWrapper>
          </div>

          {/* ── Models ── */}
          <div>
            <SectionHeader
              label={<>Models {activeModel && <span style={{ color: "var(--accent)" }}>· {activeModel}</span>}</>}
              isOpen={modelsOpen}
              onToggle={() => setModelsOpen((v) => !v)}
              onAdd={() => { setModelsOpen(true); setShowNewModelForm((v) => !v); setTimeout(() => newModelInputRef.current?.focus(), 50); }}
            />
            <CollapseWrapper isOpen={modelsOpen}>
              {/* New model form */}
              <AnimatePresence>
                {showNewModelForm && (
                  <motion.div key="new-model" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ display: "grid", gap: 6, padding: "8px 0" }}>
                      <input ref={newModelInputRef} type="text" value={newModelName} onChange={(e) => setNewModelName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleModelCreate(); } if (e.key === "Escape") { setShowNewModelForm(false); setNewModelName(""); } }}
                        placeholder="e.g. gpt-4o-mini" className="form-input" style={{ fontSize: "0.85rem", padding: "6px 10px" }} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" className="btn-primary" style={{ fontSize: "0.8rem", padding: "5px 12px" }} onClick={handleModelCreate} disabled={createModel.isPending || !newModelName.trim()}>
                          {createModel.isPending ? "Adding…" : "Add"}
                        </button>
                        <button type="button" className="btn-secondary" style={{ fontSize: "0.8rem", padding: "5px 12px" }} onClick={() => { setShowNewModelForm(false); setNewModelName(""); }}>Cancel</button>
                      </div>
                      {createModel.isError && <p style={{ color: "var(--danger)", fontSize: "0.78rem", margin: 0 }}>{(createModel.error as Error).message}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="filter-bar-vertical">
                <AnimatePresence>
                  {models?.map((model, i) => (
                    <motion.div key={model.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ delay: i * 0.04 }} style={{ position: "relative" }}>
                      {editingModelId === model.id ? (
                        <div style={{ display: "grid", gap: 5, padding: "6px 0" }}>
                          <input ref={editModelInputRef} type="text" value={editModelName} onChange={(e) => setEditModelName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleModelUpdate(model.id); } if (e.key === "Escape") setEditingModelId(null); }}
                            className="form-input" style={{ fontSize: "0.85rem", padding: "6px 10px" }} />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" className="btn-primary" style={{ fontSize: "0.78rem", padding: "4px 10px" }} onClick={() => handleModelUpdate(model.id)} disabled={updateModel.isPending}>Save</button>
                            <button type="button" className="btn-secondary" style={{ fontSize: "0.78rem", padding: "4px 10px" }} onClick={() => setEditingModelId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="sidebar-cat-row" style={{ position: "relative" }}>
                          <button className={`filter-btn${activeModel === model.name ? " is-active" : ""}`} onClick={() => navigate("model", activeModel === model.name ? null : model.name)} type="button" style={{ flex: 1 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>⬡</span>
                              {model.name}
                            </span>
                            <span className="filter-btn-count">{model.prompt_count}</span>
                          </button>
                          <div className="sidebar-cat-actions" style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s", pointerEvents: "none" }}>
                            <button type="button" style={actionBtnStyle()} onClick={(e) => { e.stopPropagation(); startEditModel(model.id, model.name); }} title="Rename">✎</button>
                            <button type="button" style={actionBtnStyle(true)} onClick={(e) => { e.stopPropagation(); handleModelDelete(model.id, model.name); }} title="Delete">✕</button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {models?.length === 0 && !showNewModelForm && (
                  <p style={{ color: "var(--muted)", fontSize: "0.82rem", padding: "4px 0" }}>No models yet.</p>
                )}
              </div>
            </CollapseWrapper>
          </div>
        </>
      )}

      <style>{`
        .sidebar-cat-row:hover .sidebar-cat-actions {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
      `}</style>
    </section>
  );
}
