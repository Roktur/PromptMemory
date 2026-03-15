// ─────────────────────────────────────────────────────────────────────────────
// Migration 001 — Initial schema
//
// Tables:   prompts, tags, prompt_tags, prompt_images
// Search:   prompts_fts (FTS5 virtual table, content-backed)
// Triggers: keep FTS index in sync with prompts rows
// Indexes:  all FK columns + query-heavy columns
// ─────────────────────────────────────────────────────────────────────────────

export const migration_001_initial = {
  version: 1,
  name: "initial_schema",

  up: /* sql */ `

    -- ── prompts ────────────────────────────────────────────────────────────
    --
    -- Primary key: ULID (26-char lexicographically sortable text).
    --   • ULIDs sort by creation time without a separate index.
    --   • Collision-free, URL-safe, no coordination needed.
    --
    -- updated_at is maintained by a trigger (see below).
    -- ────────────────────────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS prompts (
      id          TEXT     PRIMARY KEY,
      title       TEXT     NOT NULL,
      body        TEXT     NOT NULL DEFAULT '',
      model       TEXT,
      notes       TEXT,
      is_favorite INTEGER  NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
      created_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    -- Trigger: auto-update updated_at on every row modification
    CREATE TRIGGER IF NOT EXISTS prompts_updated_at
    AFTER UPDATE ON prompts
    FOR EACH ROW
    WHEN OLD.updated_at = NEW.updated_at   -- only fire if caller didn't set it
    BEGIN
      UPDATE prompts SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = NEW.id;
    END;

    -- ── tags ──────────────────────────────────────────────────────────────
    --
    -- COLLATE NOCASE: "React" and "react" are the same tag.
    -- ────────────────────────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS tags (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT    NOT NULL UNIQUE COLLATE NOCASE
    );

    -- ── prompt_tags ───────────────────────────────────────────────────────
    --
    -- Junction table. CASCADE DELETE keeps it clean when a prompt is removed.
    -- ────────────────────────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS prompt_tags (
      prompt_id  TEXT    NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      tag_id     INTEGER NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
      PRIMARY KEY (prompt_id, tag_id)
    );

    -- ── prompt_images ─────────────────────────────────────────────────────
    --
    -- filename:   original uploaded filename, used to derive storage paths.
    -- width/height: pixel dimensions of the original file (Sharp reads these).
    -- size_bytes: original file size.
    --
    -- Variant files (thumb, medium) are stored at:
    --   uploads/{imageId}/thumb.webp
    --   uploads/{imageId}/medium.webp
    --   uploads/{imageId}/original.{ext}
    -- ────────────────────────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS prompt_images (
      id          TEXT    PRIMARY KEY,
      prompt_id   TEXT    NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      filename    TEXT    NOT NULL,
      width       INTEGER NOT NULL DEFAULT 0,
      height      INTEGER NOT NULL DEFAULT 0,
      size_bytes  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    -- ── FTS5 full-text search ─────────────────────────────────────────────
    --
    -- content='prompts' makes this a content table:
    --   • No duplicate storage — FTS index stores term positions only.
    --   • Reads go through the main table for column data.
    --   • Writes MUST be kept in sync via triggers (below).
    --
    -- tokenize='porter unicode61':
    --   • unicode61: handles non-ASCII characters correctly.
    --   • porter:    stemming ("running" matches "run").
    --
    -- rank (BM25) is available via the built-in rank column.
    -- ────────────────────────────────────────────────────────────────────────

    CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
      title,
      body,
      notes,
      content      = 'prompts',
      content_rowid = 'rowid',
      tokenize     = 'porter unicode61'
    );

    -- Trigger: INSERT — add new row to FTS index
    CREATE TRIGGER IF NOT EXISTS prompts_fts_ai
    AFTER INSERT ON prompts BEGIN
      INSERT INTO prompts_fts (rowid, title, body, notes)
      VALUES (new.rowid, new.title, new.body, new.notes);
    END;

    -- Trigger: DELETE — remove row from FTS index
    CREATE TRIGGER IF NOT EXISTS prompts_fts_ad
    AFTER DELETE ON prompts BEGIN
      INSERT INTO prompts_fts (prompts_fts, rowid, title, body, notes)
      VALUES ('delete', old.rowid, old.title, old.body, old.notes);
    END;

    -- Trigger: UPDATE — delete old entry, insert new entry
    CREATE TRIGGER IF NOT EXISTS prompts_fts_au
    AFTER UPDATE ON prompts BEGIN
      INSERT INTO prompts_fts (prompts_fts, rowid, title, body, notes)
      VALUES ('delete', old.rowid, old.title, old.body, old.notes);
      INSERT INTO prompts_fts (rowid, title, body, notes)
      VALUES (new.rowid, new.title, new.body, new.notes);
    END;

    -- ── Indexes ───────────────────────────────────────────────────────────
    --
    -- Naming: idx_{table}_{columns}
    --
    -- prompts indexes:
    --   • created_at DESC   — default sort for the main list view
    --   • updated_at DESC   — "recently edited" sort
    --   • is_favorite       — favorites filter (low cardinality, partial ok)
    --   • model             — filter by model
    --   • (is_favorite, created_at) covering — favorites list sorted by date
    --
    -- prompt_tags indexes:
    --   • tag_id            — FK reverse lookup (tag → prompts)
    --   The (prompt_id, tag_id) PK already covers prompt → tags direction.
    --
    -- prompt_images indexes:
    --   • prompt_id         — fetch all images for a prompt
    --   • created_at        — order images chronologically
    -- ────────────────────────────────────────────────────────────────────────

    CREATE INDEX IF NOT EXISTS idx_prompts_created_at
      ON prompts (created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_prompts_updated_at
      ON prompts (updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_prompts_is_favorite
      ON prompts (is_favorite)
      WHERE is_favorite = 1;

    CREATE INDEX IF NOT EXISTS idx_prompts_model
      ON prompts (model)
      WHERE model IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_prompts_favorite_created
      ON prompts (is_favorite, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_prompt_tags_tag_id
      ON prompt_tags (tag_id);

    CREATE INDEX IF NOT EXISTS idx_prompt_images_prompt_id
      ON prompt_images (prompt_id);

    CREATE INDEX IF NOT EXISTS idx_prompt_images_created_at
      ON prompt_images (created_at DESC);

  `,

  down: /* sql */ `
    DROP TRIGGER  IF EXISTS prompts_fts_au;
    DROP TRIGGER  IF EXISTS prompts_fts_ad;
    DROP TRIGGER  IF EXISTS prompts_fts_ai;
    DROP TRIGGER  IF EXISTS prompts_updated_at;
    DROP TABLE    IF EXISTS prompts_fts;
    DROP TABLE    IF EXISTS prompt_images;
    DROP TABLE    IF EXISTS prompt_tags;
    DROP TABLE    IF EXISTS tags;
    DROP TABLE    IF EXISTS prompts;
  `,
};
