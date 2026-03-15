import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ─────────────────────────────────────────────────────────────────────────────
// DB Singleton
//
// Uses a global to survive Next.js hot-module replacement in dev.
// In production a module-level reference is stable.
//
// PostgreSQL migration path:
//   Replace this file with a `pg` Pool singleton.
//   All query files use only standard SQL — no SQLite-specific syntax
//   except for FTS5 (which maps to pg_trgm / tsvector in Postgres).
// ─────────────────────────────────────────────────────────────────────────────

const DB_PATH = process.env.DB_PATH ?? "./data/prompt-memory.db";

declare global {
  // eslint-disable-next-line no-var
  var __promptMemoryDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const resolved = path.resolve(DB_PATH);

  // Ensure the directory exists (first boot)
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(resolved);

  // ── Performance pragmas ────────────────────────────────────────────────────
  //
  // WAL mode:        Allows concurrent readers while writing.
  //                  Critical for Next.js — multiple requests hit the DB
  //                  simultaneously.
  //
  // synchronous=NORMAL: Safe with WAL (no data loss on OS crash),
  //                  ~3× faster than FULL.
  //
  // cache_size:      64 MB page cache. At 50k prompts (~2 KB avg body)
  //                  the hot working set fits entirely in cache.
  //
  // mmap_size:       512 MB memory-mapped I/O. Read-heavy workloads
  //                  bypass the page cache entirely — zero copy.
  //
  // temp_store:      Sort / group operations use RAM instead of disk.
  //
  // foreign_keys:    Enforce referential integrity at the DB level.
  //
  // busy_timeout:    Retry for up to 5 s before returning SQLITE_BUSY.
  //                  Prevents spurious 500s under write contention.
  // ──────────────────────────────────────────────────────────────────────────
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = -65536");       // 64 MB  (value is negative KB)
  db.pragma("mmap_size = 536870912");     // 512 MB
  db.pragma("temp_store = MEMORY");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.pragma("wal_autocheckpoint = 1000"); // Checkpoint every ~4 MB of WAL

  return db;
}

export function getDb(): Database.Database {
  if (!global.__promptMemoryDb) {
    global.__promptMemoryDb = createConnection();
    // Run migrations automatically on first connection
    runMigrationsSync(global.__promptMemoryDb);
  }
  return global.__promptMemoryDb;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline migration bootstrap
//
// Imported here (not from migrate.ts) to avoid a circular dependency.
// migrate.ts is the CLI entry point; this is the runtime entry point.
// ─────────────────────────────────────────────────────────────────────────────

function runMigrationsSync(db: Database.Database): void {
  // Ensure the tracking table exists before anything else
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version   INTEGER PRIMARY KEY,
      name      TEXT    NOT NULL,
      applied_at TEXT   NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  const applied = new Set<number>(
    (db.prepare("SELECT version FROM schema_migrations").all() as { version: number }[])
      .map((r) => r.version)
  );

  for (const migration of MIGRATIONS) {
    if (!applied.has(migration.version)) {
      db.transaction(() => {
        db.exec(migration.up);
        db.prepare(
          "INSERT INTO schema_migrations (version, name) VALUES (?, ?)"
        ).run(migration.version, migration.name);
      })();
      console.log(`[db] Applied migration ${migration.version}: ${migration.name}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Migration registry — import and register all migrations here.
// Each new migration file must be added to this array in order.
// ─────────────────────────────────────────────────────────────────────────────

import { migration_001_initial } from "./migrations/001_initial";
import { migration_002_categories } from "./migrations/002_categories";
import { migration_003_models } from "./migrations/003_models";

const MIGRATIONS = [migration_001_initial, migration_002_categories, migration_003_models];
