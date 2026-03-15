// ─────────────────────────────────────────────────────────────────────────────
// Application-wide constants
// ─────────────────────────────────────────────────────────────────────────────

export const APP_NAME = "Prompt Memory";

// ─── Pagination ──────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

// ─── Image processing (Sharp) ────────────────────────────────────────────────

export const IMAGE_VARIANTS = {
  thumb: { width: 320, height: 320 },
  medium: { width: 1280, height: 1280 },
} as const;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

export const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// ─── UI ──────────────────────────────────────────────────────────────────────

// Virtual grid — estimated card dimensions for react-virtual
export const CARD_MIN_WIDTH = 280;
export const CARD_HEIGHT = 340;
export const GRID_GAP = 16;

// How many pixels before the bottom of the list to trigger next page load
export const INFINITE_SCROLL_THRESHOLD = 600;

// ─── Routes ──────────────────────────────────────────────────────────────────

export const ROUTES = {
  home: "/",
  prompts: "/prompts",
  prompt: (id: string) => `/prompts/${id}`,
  newPrompt: "/prompts/new",
} as const;
