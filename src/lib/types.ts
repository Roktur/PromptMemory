// ─────────────────────────────────────────────────────────────────────────────
// Core domain types for Prompt Memory
// These are the canonical shapes used across API, DB, and UI layers.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Tag ─────────────────────────────────────────────────────────────────────

export interface Tag {
  id: number;
  name: string;
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

// ─── Model ───────────────────────────────────────────────────────────────────

export interface Model {
  id: number;
  name: string;
  created_at: string;
}

// ─── Image ───────────────────────────────────────────────────────────────────

export type ImageVariant = "original" | "medium" | "thumb";

export interface PromptImage {
  id: string;
  prompt_id: string;
  filename: string;
  width: number;
  height: number;
  size_bytes: number;
  created_at: string; // ISO 8601
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

export type PromptModel =
  | "gpt-4o"
  | "gpt-4-turbo"
  | "claude-opus-4-6"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5"
  | "gemini-2.0-flash"
  | "gemini-2.5-pro"
  | "mistral-large"
  | "llama-3"
  | string; // allow custom model names

export interface Prompt {
  id: string;
  title: string;
  body: string;
  model: PromptModel | null;
  notes: string | null;
  is_favorite: boolean;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// Prompt with related data — used in detail views
export interface PromptWithRelations extends Prompt {
  tags: Tag[];
  images: PromptImage[];
}

// Lightweight list item — used in virtualized list/grid
export interface PromptListItem extends Prompt {
  tags: Tag[];
  image_count: number;
  cover_image_id: string | null; // first image id for thumbnail
}

// ─── API request/response shapes ─────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface ApiError {
  error: string;
  code?: string;
}

// ─── Filter / sort ───────────────────────────────────────────────────────────

export type SortField = "created_at" | "updated_at" | "title";
export type SortOrder = "asc" | "desc";

export interface PromptFilters {
  search?: string;
  tags?: string[];       // tag names
  model?: string;
  is_favorite?: boolean;
  categoryId?: number;
  sort_by?: SortField;
  sort_order?: SortOrder;
  page?: number;
  per_page?: number;
}
