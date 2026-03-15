import type { Migration } from "../migrate";

export const migration_002_categories: Migration = {
  version: 2,
  name: "categories",
  up: `
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      color      TEXT    NOT NULL DEFAULT '#8b5cf6',
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    ALTER TABLE prompts ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_prompts_category_id
      ON prompts(category_id)
      WHERE category_id IS NOT NULL;
  `,
  down: `
    DROP INDEX IF EXISTS idx_prompts_category_id;
    ALTER TABLE prompts DROP COLUMN category_id;
    DROP TABLE IF EXISTS categories;
  `,
};
