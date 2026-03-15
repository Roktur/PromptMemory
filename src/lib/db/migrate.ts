#!/usr/bin/env tsx
// ─────────────────────────────────────────────────────────────────────────────
// Migration runner — can be invoked as a CLI script or imported programmatically
//
// Usage:
//   npm run db:migrate              # apply all pending migrations
//   npm run db:migrate -- --status  # list applied / pending migrations
//   npm run db:migrate -- --rollback 1  # roll back migration version 1
// ─────────────────────────────────────────────────────────────────────────────

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { migration_001_initial } from "./migrations/001_initial";
import { migration_002_categories } from "./migrations/002_categories";
import { migration_003_models } from "./migrations/003_models";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
}

// ─── Registry ─────────────────────────────────────────────────────────────────
// Add new migrations here in ascending version order.

export const ALL_MIGRATIONS: Migration[] = [migration_001_initial, migration_002_categories, migration_003_models];

// ─── Runner ───────────────────────────────────────────────────────────────────

export class MigrationRunner {
  constructor(private readonly db: Database.Database) {}

  /** Ensure the tracking table exists */
  private bootstrap(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    INTEGER PRIMARY KEY,
        name       TEXT    NOT NULL,
        applied_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `);
  }

  private getApplied(): Set<number> {
    const rows = this.db
      .prepare("SELECT version FROM schema_migrations ORDER BY version ASC")
      .all() as MigrationRecord[];
    return new Set(rows.map((r) => r.version));
  }

  /** Apply all pending migrations */
  migrate(): void {
    this.bootstrap();
    const applied = this.getApplied();
    const pending = ALL_MIGRATIONS.filter((m) => !applied.has(m.version));

    if (pending.length === 0) {
      console.log("[migrate] All migrations up to date.");
      return;
    }

    for (const migration of pending) {
      console.log(`[migrate] Applying ${migration.version}: ${migration.name}...`);

      this.db.transaction(() => {
        this.db.exec(migration.up);
        this.db
          .prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)")
          .run(migration.version, migration.name);
      })();

      console.log(`[migrate] ✓ Applied ${migration.version}: ${migration.name}`);
    }
  }

  /** Roll back a single migration by version number */
  rollback(version: number): void {
    this.bootstrap();
    const applied = this.getApplied();

    if (!applied.has(version)) {
      throw new Error(`Migration ${version} has not been applied.`);
    }

    const migration = ALL_MIGRATIONS.find((m) => m.version === version);
    if (!migration) {
      throw new Error(`Migration ${version} not found in registry.`);
    }

    console.log(`[migrate] Rolling back ${version}: ${migration.name}...`);

    this.db.transaction(() => {
      this.db.exec(migration.down);
      this.db
        .prepare("DELETE FROM schema_migrations WHERE version = ?")
        .run(version);
    })();

    console.log(`[migrate] ✓ Rolled back ${version}: ${migration.name}`);
  }

  /** Print status of all migrations */
  status(): void {
    this.bootstrap();
    const applied = this.getApplied();

    console.log("\nMigration status:");
    console.log("─".repeat(50));

    for (const m of ALL_MIGRATIONS) {
      const state = applied.has(m.version) ? "✓ applied" : "○ pending";
      console.log(`  [${state}]  ${m.version}: ${m.name}`);
    }

    console.log("─".repeat(50));
    console.log(`  ${applied.size} applied, ${ALL_MIGRATIONS.length - applied.size} pending\n`);
  }
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

function openDb(): Database.Database {
  const dbPath = process.env.DB_PATH ?? "./data/prompt-memory.db";
  const resolved = path.resolve(dbPath);
  const dir = path.dirname(resolved);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(resolved);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

// Detect if this file is the main entry point (run directly via tsx)
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("migrate.ts") || process.argv[1].endsWith("migrate.js"));

if (isMain) {
  const db = openDb();
  const runner = new MigrationRunner(db);
  const args = process.argv.slice(2);

  try {
    if (args.includes("--status")) {
      runner.status();
    } else if (args.includes("--rollback")) {
      const idx = args.indexOf("--rollback");
      const version = parseInt(args[idx + 1] ?? "", 10);
      if (isNaN(version)) {
        console.error("Usage: --rollback <version>");
        process.exit(1);
      }
      runner.rollback(version);
    } else {
      runner.migrate();
    }
  } catch (err) {
    console.error("[migrate] Error:", (err as Error).message);
    process.exit(1);
  } finally {
    db.close();
  }
}
