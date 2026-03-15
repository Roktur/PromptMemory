import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, parseISO } from "date-fns";

// ─── Tailwind class merging ───────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Date formatting ─────────────────────────────────────────────────────────

export function formatRelativeDate(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

export function formatAbsoluteDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy 'at' h:mm a");
}

// ─── File size ────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ─── URL helpers ─────────────────────────────────────────────────────────────

export function imageUrl(
  imageId: string,
  variant: "thumb" | "medium" | "original" = "medium"
): string {
  return `/api/images/${imageId}/file?v=${variant}`;
}

// ─── String helpers ───────────────────────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + "…";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Array helpers ────────────────────────────────────────────────────────────

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ─── Error handling ───────────────────────────────────────────────────────────

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}
