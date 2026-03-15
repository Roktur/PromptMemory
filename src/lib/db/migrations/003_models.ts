import type { Migration } from "../migrate";

export const migration_003_models: Migration = {
  version: 3,
  name: "models",
  up: `
    CREATE TABLE IF NOT EXISTS models (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL COLLATE NOCASE UNIQUE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO models (name) VALUES
      ('gpt-4o'),
      ('gpt-4-turbo'),
      ('claude-opus-4-6'),
      ('claude-sonnet-4-6'),
      ('claude-haiku-4-5'),
      ('gemini-2.0-flash'),
      ('gemini-2.5-pro'),
      ('mistral-large'),
      ('llama-3');
  `,
  down: `DROP TABLE IF EXISTS models;`,
};
