import { getDb } from "../index";
import type { PromptImage } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Image Repository
//
// Responsible for the prompt_images table only.
// Actual file I/O (Sharp processing, filesystem writes) lives in
// src/lib/storage/index.ts — this layer is purely DB.
// ─────────────────────────────────────────────────────────────────────────────

// ─── findByPromptId ───────────────────────────────────────────────────────────

export function findImagesByPromptId(promptId: string): PromptImage[] {
  const db = getDb();
  return db
    .prepare<string, PromptImage>(
      `SELECT * FROM prompt_images
       WHERE prompt_id = ?
       ORDER BY created_at ASC`
    )
    .all(promptId);
}

// ─── findById ────────────────────────────────────────────────────────────────

export function findImageById(id: string): PromptImage | null {
  const db = getDb();
  return (
    db
      .prepare<string, PromptImage>("SELECT * FROM prompt_images WHERE id = ?")
      .get(id) ?? null
  );
}

// ─── create ──────────────────────────────────────────────────────────────────

export interface CreateImageInput {
  id: string;        // ULID — caller generates it
  prompt_id: string;
  filename: string;  // original filename (e.g. "photo.jpg")
  width: number;
  height: number;
  size_bytes: number;
}

export function createImage(input: CreateImageInput): PromptImage {
  const db = getDb();

  db.prepare(
    `INSERT INTO prompt_images (id, prompt_id, filename, width, height, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    input.id,
    input.prompt_id,
    input.filename,
    input.width,
    input.height,
    input.size_bytes
  );

  return findImageById(input.id)!;
}

// ─── delete ───────────────────────────────────────────────────────────────────

export function deleteImage(id: string): boolean {
  const db = getDb();
  const info = db.prepare("DELETE FROM prompt_images WHERE id = ?").run(id);
  return info.changes > 0;
}

// ─── deleteByPromptId ────────────────────────────────────────────────────────
// Called when a prompt is deleted without CASCADE (e.g. bulk cleanup).
// In practice, the FK CASCADE handles this, but this is useful for
// storage cleanup coordination (delete files before the DB rows).

export function deleteImagesByPromptId(promptId: string): string[] {
  const db = getDb();

  // Return IDs so the caller can clean up filesystem storage
  const rows = db
    .prepare<string, { id: string }>(
      "SELECT id FROM prompt_images WHERE prompt_id = ?"
    )
    .all(promptId);

  if (rows.length > 0) {
    db.prepare("DELETE FROM prompt_images WHERE prompt_id = ?").run(promptId);
  }

  return rows.map((r) => r.id);
}

// ─── countByPromptId ─────────────────────────────────────────────────────────

export function countImagesByPromptId(promptId: string): number {
  const db = getDb();
  const row = db
    .prepare<string, { n: number }>(
      "SELECT COUNT(*) AS n FROM prompt_images WHERE prompt_id = ?"
    )
    .get(promptId);
  return row?.n ?? 0;
}

// ─── getStorageStats ─────────────────────────────────────────────────────────

export interface ImageStorageStats {
  total_images: number;
  total_size_bytes: number;
  avg_width: number;
  avg_height: number;
}

export function getImageStorageStats(): ImageStorageStats {
  const db = getDb();
  const row = db
    .prepare<
      [],
      {
        total_images: number;
        total_size_bytes: number;
        avg_width: number;
        avg_height: number;
      }
    >(
      `SELECT
         COUNT(*)       AS total_images,
         SUM(size_bytes) AS total_size_bytes,
         AVG(width)     AS avg_width,
         AVG(height)    AS avg_height
       FROM prompt_images`
    )
    .get();

  return {
    total_images: row?.total_images ?? 0,
    total_size_bytes: row?.total_size_bytes ?? 0,
    avg_width: Math.round(row?.avg_width ?? 0),
    avg_height: Math.round(row?.avg_height ?? 0),
  };
}
