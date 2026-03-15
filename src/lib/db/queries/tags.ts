import { getDb } from "../index";
import type { Tag } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Tag Repository
// ─────────────────────────────────────────────────────────────────────────────

// ─── findAll ─────────────────────────────────────────────────────────────────

export function findAllTags(): Tag[] {
  const db = getDb();
  return db
    .prepare<[], Tag>("SELECT id, name FROM tags ORDER BY name COLLATE NOCASE ASC")
    .all();
}

// ─── findById ────────────────────────────────────────────────────────────────

export function findTagById(id: number): Tag | null {
  const db = getDb();
  return db.prepare<number, Tag>("SELECT * FROM tags WHERE id = ?").get(id) ?? null;
}

// ─── findByName ──────────────────────────────────────────────────────────────

export function findTagByName(name: string): Tag | null {
  const db = getDb();
  return (
    db
      .prepare<string, Tag>(
        "SELECT * FROM tags WHERE name = ? COLLATE NOCASE"
      )
      .get(name) ?? null
  );
}

// ─── findByPromptId ──────────────────────────────────────────────────────────

export function findTagsByPromptId(promptId: string): Tag[] {
  const db = getDb();
  return db
    .prepare<string, Tag>(
      `SELECT t.id, t.name
       FROM tags t
       JOIN prompt_tags pt ON t.id = pt.tag_id
       WHERE pt.prompt_id = ?
       ORDER BY t.name COLLATE NOCASE ASC`
    )
    .all(promptId);
}

// ─── findOrCreate ────────────────────────────────────────────────────────────
// Idempotent: returns existing tag or creates a new one.

export function findOrCreateTag(name: string): Tag {
  const db = getDb();
  const trimmed = name.trim();

  db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(trimmed);

  return db
    .prepare<string, Tag>("SELECT * FROM tags WHERE name = ? COLLATE NOCASE")
    .get(trimmed)!;
}

// ─── getPopularTags ───────────────────────────────────────────────────────────
// Returns tags ordered by usage count — used for tag suggestions in the UI.

export interface TagWithCount extends Tag {
  prompt_count: number;
}

export function getPopularTags(limit = 50): TagWithCount[] {
  const db = getDb();
  return db
    .prepare<number, TagWithCount>(
      `SELECT t.id, t.name, COUNT(pt.prompt_id) AS prompt_count
       FROM tags t
       LEFT JOIN prompt_tags pt ON t.id = pt.tag_id
       GROUP BY t.id
       ORDER BY prompt_count DESC, t.name COLLATE NOCASE ASC
       LIMIT ?`
    )
    .all(limit);
}

// ─── searchTags ──────────────────────────────────────────────────────────────
// Fast prefix search for the tag autocomplete input.

export function searchTags(query: string, limit = 20): TagWithCount[] {
  const db = getDb();
  const pattern = `${query.trim()}%`;
  return db
    .prepare<[string, number], TagWithCount>(
      `SELECT t.id, t.name, COUNT(pt.prompt_id) AS prompt_count
       FROM tags t
       LEFT JOIN prompt_tags pt ON t.id = pt.tag_id
       WHERE t.name LIKE ? COLLATE NOCASE
       GROUP BY t.id
       ORDER BY prompt_count DESC, t.name COLLATE NOCASE ASC
       LIMIT ?`
    )
    .all(pattern, limit);
}

// ─── delete ───────────────────────────────────────────────────────────────────
// Deletes a tag and all its prompt associations (via FK CASCADE).

export function deleteTag(id: number): boolean {
  const db = getDb();
  const info = db.prepare("DELETE FROM tags WHERE id = ?").run(id);
  return info.changes > 0;
}

// ─── pruneOrphanTags ─────────────────────────────────────────────────────────
// Removes tags with zero prompt associations.
// Run periodically or after bulk prompt deletion.

export function pruneOrphanTags(): number {
  const db = getDb();
  const info = db.prepare(
    `DELETE FROM tags
     WHERE id NOT IN (SELECT DISTINCT tag_id FROM prompt_tags)`
  ).run();
  return info.changes;
}

// ─── rename ───────────────────────────────────────────────────────────────────

export function renameTag(id: number, newName: string): Tag | null {
  const db = getDb();
  const trimmed = newName.trim();
  db.prepare("UPDATE tags SET name = ? WHERE id = ?").run(trimmed, id);
  return findTagById(id);
}
