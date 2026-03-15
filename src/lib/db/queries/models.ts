import { getDb } from "../index";
import type { Model } from "@/lib/types";

export function findAllModels(): (Model & { prompt_count: number })[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT m.id, m.name, m.created_at,
              COUNT(p.id) AS prompt_count
       FROM models m
       LEFT JOIN prompts p ON p.model = m.name
       GROUP BY m.id
       ORDER BY m.name COLLATE NOCASE ASC`
    )
    .all() as (Model & { prompt_count: number })[];
}

export function findModelById(id: number): Model | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM models WHERE id = ?").get(id) as Model | undefined) ?? null;
}

export function createModel(name: string): Model {
  const db = getDb();
  const info = db.prepare("INSERT INTO models (name) VALUES (?)").run(name.trim());
  return findModelById(info.lastInsertRowid as number)!;
}

export function updateModel(id: number, name: string): Model | null {
  const db = getDb();
  db.prepare("UPDATE models SET name = ? WHERE id = ?").run(name.trim(), id);
  return findModelById(id);
}

export function deleteModel(id: number): boolean {
  const db = getDb();
  const info = db.prepare("DELETE FROM models WHERE id = ?").run(id);
  return info.changes > 0;
}
