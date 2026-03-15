import { getDb } from "../index";
import type { Category } from "@/lib/types";

export function findAllCategories(): (Category & { prompt_count: number })[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT c.id, c.name, c.color, c.created_at,
              COUNT(p.id) AS prompt_count
       FROM categories c
       LEFT JOIN prompts p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name ASC`
    )
    .all() as (Category & { prompt_count: number })[];
}

export function findCategoryById(id: number): Category | null {
  const db = getDb();
  return (
    (db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as Category | undefined) ?? null
  );
}

export interface CreateCategoryInput {
  name: string;
  color?: string;
}

export function createCategory(input: CreateCategoryInput): Category {
  const db = getDb();
  const { name, color = "#8b5cf6" } = input;
  const info = db
    .prepare("INSERT INTO categories (name, color) VALUES (?, ?)")
    .run(name.trim(), color);
  return findCategoryById(info.lastInsertRowid as number)!;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
}

export function updateCategory(id: number, input: UpdateCategoryInput): Category | null {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name.trim());
  }
  if (input.color !== undefined) {
    fields.push("color = ?");
    values.push(input.color);
  }
  if (fields.length === 0) return findCategoryById(id);

  db.prepare(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
  return findCategoryById(id);
}

export function deleteCategory(id: number): boolean {
  const db = getDb();
  const info = db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  return info.changes > 0;
}
