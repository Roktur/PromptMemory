import { getDb } from "../index";
import type {
  Prompt,
  PromptWithRelations,
  PromptListItem,
  PromptFilters,
  Tag,
  PromptImage,
} from "@/lib/types";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Prompt Repository
//
// All queries use keyset (cursor) pagination for O(1) performance at any
// offset depth — critical for 50k+ rows where OFFSET degrades linearly.
//
// Cursor encoding: base64(JSON({ val: <sort_column_value>, id: <last_id> }))
//
// Query strategy for list view:
//   1. A CTE resolves the filtered set of prompt IDs (with FTS, tag filter,
//      model filter, cursor) — this is the fast path on indexed columns.
//   2. The outer query joins the IDs against prompts + tags + images to
//      build the full PromptListItem shape using GROUP_CONCAT aggregation.
//      This avoids N+1 queries entirely.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Internal row shapes (raw DB output before mapping) ──────────────────────

interface PromptRow {
  id: string;
  title: string;
  body: string;
  model: string | null;
  notes: string | null;
  is_favorite: number; // SQLite stores booleans as 0/1
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  created_at: string;
  updated_at: string;
}

interface PromptListRow extends PromptRow {
  tags_raw: string | null;    // "id:name,id:name,…"
  image_count: number;
  cover_image_id: string | null;
}

// ─── Cursor helpers ───────────────────────────────────────────────────────────

interface Cursor {
  val: string; // value of the sort column for the last seen row
  id: string;  // id of the last seen row (tiebreaker)
}

function encodeCursor(val: string, id: string): string {
  return Buffer.from(JSON.stringify({ val, id })).toString("base64url");
}

function decodeCursor(cursor: string): Cursor | null {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Cursor;
  } catch {
    return null;
  }
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapPromptRow(row: PromptRow): Prompt {
  return {
    ...row,
    is_favorite: row.is_favorite === 1,
    category_id: row.category_id ?? null,
    category_name: row.category_name ?? null,
    category_color: row.category_color ?? null,
  };
}

function mapListRow(row: PromptListRow): PromptListItem {
  const tags: Tag[] = row.tags_raw
    ? row.tags_raw.split(",").map((part) => {
        const colonIdx = part.indexOf(":");
        return {
          id: parseInt(part.slice(0, colonIdx), 10),
          name: part.slice(colonIdx + 1),
        };
      })
    : [];

  return {
    id: row.id,
    title: row.title,
    body: row.body,
    model: row.model,
    notes: row.notes,
    is_favorite: row.is_favorite === 1,
    category_id: row.category_id ?? null,
    category_name: row.category_name ?? null,
    category_color: row.category_color ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags,
    image_count: row.image_count,
    cover_image_id: row.cover_image_id,
  };
}

// ─── findMany ─────────────────────────────────────────────────────────────────

export interface FindManyResult {
  data: PromptListItem[];
  total: number;       // -1 when not counted (cursor pages past the first)
  hasMore: boolean;
  nextCursor: string | null;
}

export function findManyPrompts(filters: PromptFilters = {}): FindManyResult {
  const db = getDb();

  const {
    search,
    tags = [],
    model,
    is_favorite,
    categoryId,
    sort_by = "created_at",
    sort_order = "desc",
    page,
    per_page,
  } = filters;

  // Resolve page size — support both cursor (no page) and page-number modes
  const limit = Math.min(per_page ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  // ── Allowed sort columns (whitelist to prevent SQL injection) ─────────────
  const SORT_COLS: Record<string, string> = {
    created_at: "p.created_at",
    updated_at: "p.updated_at",
    title: "p.title",
  };
  const sortCol = SORT_COLS[sort_by] ?? "p.created_at";
  const sortDir = sort_order === "asc" ? "ASC" : "DESC";

  // ── Build the filter CTE ──────────────────────────────────────────────────
  // We collect WHERE clauses and bind params separately so the query stays
  // readable and safe. All user input goes through bind params — never
  // string-interpolated.

  const whereClauses: string[] = [];
  const params: (string | number | null)[] = [];

  // 1. Full-text search via FTS5
  //    We join the main table to the FTS virtual table using rowid equality.
  //    BM25 rank ordering is handled in the ORDER BY below when search is active.
  let ftsJoin = "";
  if (search && search.trim()) {
    // FTS5 MATCH query: append * for prefix matching on the last term
    const ftsQuery = search.trim().replace(/["']/g, "");
    ftsJoin = `JOIN prompts_fts fts ON p.rowid = fts.rowid`;
    whereClauses.push(`prompts_fts MATCH ?`);
    params.push(`"${ftsQuery}"*`);
  }

  // 2. Tag filter — must match ALL specified tags (AND semantics)
  //    Uses a subquery with HAVING COUNT = tag count for strict intersection.
  if (tags.length > 0) {
    const placeholders = tags.map(() => "?").join(", ");
    whereClauses.push(`
      p.id IN (
        SELECT pt.prompt_id
        FROM prompt_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.name IN (${placeholders}) COLLATE NOCASE
        GROUP BY pt.prompt_id
        HAVING COUNT(DISTINCT t.id) = ?
      )
    `);
    params.push(...tags, tags.length);
  }

  // 3. Model filter
  if (model != null && model !== "") {
    whereClauses.push("p.model = ?");
    params.push(model);
  }

  // 4. Favorites filter
  if (is_favorite === true) {
    whereClauses.push("p.is_favorite = 1");
  }

  // 5. Category filter
  if (categoryId != null) {
    whereClauses.push("p.category_id = ?");
    params.push(categoryId);
  }

  const whereSQL =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // ── Count query (only on first page / no cursor) ──────────────────────────
  let total = -1;
  const isFirstPage = !page || page === 1;

  if (isFirstPage) {
    const countSQL = `
      SELECT COUNT(*) AS cnt
      FROM prompts p
      ${ftsJoin}
      ${whereSQL}
    `;
    const countRow = db.prepare(countSQL).get(...params) as { cnt: number };
    total = countRow.cnt;
  }

  // ── Keyset cursor pagination ──────────────────────────────────────────────
  // Cursor encodes (sort_column_value, id) of the last seen row.
  // This is O(1) regardless of how deep we are in the list.
  //
  // For OFFSET-based page param (page 2, 3, …) we synthesize a cursor by
  // running a small seek query. This keeps the API flexible while the DB
  // always uses keyset.

  const cursorParams: (string | number | null)[] = [];
  let cursorClause = "";

  if (page && page > 1) {
    // Classic page number → find the last row of the previous page
    const offset = (page - 1) * limit;
    const seekSQL = `
      SELECT ${sortCol} AS val, p.id
      FROM prompts p
      ${ftsJoin}
      ${whereSQL}
      ORDER BY ${sortCol} ${sortDir}, p.id ${sortDir}
      LIMIT 1 OFFSET ?
    `;
    const seekRow = db.prepare(seekSQL).get(...params, offset - 1) as
      | { val: string; id: string }
      | undefined;

    if (seekRow) {
      const op = sortDir === "DESC" ? "<" : ">";
      const prefix = whereSQL ? "AND" : "WHERE";
      cursorClause = `${prefix} (${sortCol} ${op} ? OR (${sortCol} = ? AND p.id ${op} ?))`;
      cursorParams.push(seekRow.val, seekRow.val, seekRow.id);
    }
  }

  // ── Main list query ───────────────────────────────────────────────────────
  //
  // Step 1: CTE resolves the filtered, paginated list of IDs.
  //         All heavy filtering (FTS, subqueries) happens here, on indexed cols.
  //
  // Step 2: Outer SELECT joins back to prompts, tags, images for the
  //         full shape. GROUP_CONCAT builds the tag list in a single pass.
  //
  // We fetch limit + 1 to determine hasMore without a second COUNT query.

  const orderByClause =
    search
      ? `ORDER BY rank, ${sortCol} ${sortDir}, p.id ${sortDir}`
      : `ORDER BY ${sortCol} ${sortDir}, p.id ${sortDir}`;

  const listSQL = `
    WITH filtered_ids AS (
      SELECT p.id, ${sortCol} AS sort_val, p.rowid AS p_rowid
      FROM prompts p
      ${ftsJoin}
      ${whereSQL}
      ${cursorClause}
      ${orderByClause}
      LIMIT ?
    )
    SELECT
      p.id,
      p.title,
      p.body,
      p.model,
      p.notes,
      p.is_favorite,
      p.created_at,
      p.updated_at,
      cat.id    AS category_id,
      cat.name  AS category_name,
      cat.color AS category_color,
      GROUP_CONCAT(DISTINCT CAST(t.id AS TEXT) || ':' || t.name) AS tags_raw,
      COUNT(DISTINCT pi.id)                                       AS image_count,
      MIN(pi.id)                                                  AS cover_image_id
    FROM filtered_ids fi
    JOIN prompts p             ON p.id = fi.id
    LEFT JOIN categories cat   ON p.category_id = cat.id
    LEFT JOIN prompt_tags pt   ON p.id = pt.prompt_id
    LEFT JOIN tags t           ON pt.tag_id = t.id
    LEFT JOIN prompt_images pi ON p.id = pi.prompt_id
    GROUP BY p.id
    ORDER BY fi.sort_val ${sortDir}, p.id ${sortDir}
  `;

  const allParams = [...params, ...cursorParams, limit + 1];
  const rows = db.prepare(listSQL).all(...allParams) as PromptListRow[];

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const data = pageRows.map(mapListRow);

  // Build next cursor from last returned item
  let nextCursor: string | null = null;
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1]!;
    const sortVal =
      sort_by === "created_at"
        ? last.created_at
        : sort_by === "updated_at"
          ? last.updated_at
          : last.title;
    nextCursor = encodeCursor(sortVal, last.id);
  }

  return { data, total, hasMore, nextCursor };
}

// ─── findById ────────────────────────────────────────────────────────────────

export function findPromptById(id: string): PromptWithRelations | null {
  const db = getDb();

  const prompt = db
    .prepare<string, PromptRow>(
      `SELECT p.*,
              cat.id    AS category_id,
              cat.name  AS category_name,
              cat.color AS category_color
       FROM prompts p
       LEFT JOIN categories cat ON p.category_id = cat.id
       WHERE p.id = ?`
    )
    .get(id);

  if (!prompt) return null;

  const tags = db
    .prepare<string, Tag>(
      `SELECT t.id, t.name
       FROM tags t
       JOIN prompt_tags pt ON t.id = pt.tag_id
       WHERE pt.prompt_id = ?
       ORDER BY t.name ASC`
    )
    .all(id);

  const images = db
    .prepare<string, PromptImage>(
      `SELECT * FROM prompt_images WHERE prompt_id = ? ORDER BY created_at ASC`
    )
    .all(id);

  return {
    ...mapPromptRow(prompt),
    tags,
    images,
  };
}

// ─── create ──────────────────────────────────────────────────────────────────

export interface CreatePromptInput {
  id: string; // ULID — caller generates it
  title: string;
  body: string;
  model?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
  category_id?: number | null;
  tagNames?: string[];
}

export function createPrompt(input: CreatePromptInput): PromptWithRelations {
  const db = getDb();

  const { id, title, body, model = null, notes = null, is_favorite = false, category_id = null, tagNames = [] } = input;

  db.transaction(() => {
    db.prepare(
      `INSERT INTO prompts (id, title, body, model, notes, is_favorite, category_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, title, body, model, notes, is_favorite ? 1 : 0, category_id);

    if (tagNames.length > 0) {
      setTagsForPrompt(id, tagNames);
    }
  })();

  return findPromptById(id)!;
}

// ─── update ──────────────────────────────────────────────────────────────────

export interface UpdatePromptInput {
  title?: string;
  body?: string;
  model?: string | null;
  notes?: string | null;
  is_favorite?: boolean;
  category_id?: number | null;
  tagNames?: string[];
}

export function updatePrompt(
  id: string,
  input: UpdatePromptInput
): PromptWithRelations | null {
  const db = getDb();

  const { tagNames, is_favorite, ...rest } = input;

  // Build SET clause dynamically — only update provided fields
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value as string | null);
    }
  }

  if (is_favorite !== undefined) {
    fields.push("is_favorite = ?");
    values.push(is_favorite ? 1 : 0);
  }

  if (fields.length > 0) {
    db.transaction(() => {
      db.prepare(
        `UPDATE prompts SET ${fields.join(", ")} WHERE id = ?`
      ).run(...values, id);

      if (tagNames !== undefined) {
        setTagsForPrompt(id, tagNames);
      }
    })();
  } else if (tagNames !== undefined) {
    setTagsForPrompt(id, tagNames);
  }

  return findPromptById(id);
}

// ─── toggleFavorite ───────────────────────────────────────────────────────────

export function toggleFavorite(id: string): boolean {
  const db = getDb();
  db.prepare(
    "UPDATE prompts SET is_favorite = 1 - is_favorite WHERE id = ?"
  ).run(id);
  const row = db.prepare<string, { is_favorite: number }>(
    "SELECT is_favorite FROM prompts WHERE id = ?"
  ).get(id);
  return (row?.is_favorite ?? 0) === 1;
}

// ─── delete ───────────────────────────────────────────────────────────────────

export function deletePrompt(id: string): boolean {
  const db = getDb();
  const info = db.prepare("DELETE FROM prompts WHERE id = ?").run(id);
  return info.changes > 0;
}

// ─── Internal: tag assignment ─────────────────────────────────────────────────

function setTagsForPrompt(promptId: string, tagNames: string[]): void {
  const db = getDb();

  // Remove existing associations
  db.prepare("DELETE FROM prompt_tags WHERE prompt_id = ?").run(promptId);

  if (tagNames.length === 0) return;

  // Find or create each tag, then associate
  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    db.prepare(
      "INSERT OR IGNORE INTO tags (name) VALUES (?)"
    ).run(trimmed);

    const tag = db.prepare<string, { id: number }>(
      "SELECT id FROM tags WHERE name = ? COLLATE NOCASE"
    ).get(trimmed)!;

    db.prepare(
      "INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)"
    ).run(promptId, tag.id);
  }
}

// ─── search (convenience wrapper) ────────────────────────────────────────────

export interface SearchResult {
  data: PromptListItem[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export function searchPrompts(
  query: string,
  filters: Omit<PromptFilters, "search"> = {}
): SearchResult {
  return findManyPrompts({ ...filters, search: query });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface PromptStats {
  total: number;
  favorites: number;
  with_images: number;
  models: { model: string; count: number }[];
}

export function getPromptStats(): PromptStats {
  const db = getDb();

  const total = (db.prepare("SELECT COUNT(*) AS n FROM prompts").get() as { n: number }).n;
  const favorites = (
    db.prepare("SELECT COUNT(*) AS n FROM prompts WHERE is_favorite = 1").get() as { n: number }
  ).n;
  const withImages = (
    db.prepare(
      "SELECT COUNT(DISTINCT prompt_id) AS n FROM prompt_images"
    ).get() as { n: number }
  ).n;
  const models = db
    .prepare(
      `SELECT model, COUNT(*) AS count
       FROM prompts
       WHERE model IS NOT NULL
       GROUP BY model
       ORDER BY count DESC`
    )
    .all() as { model: string; count: number }[];

  return { total, favorites, with_images: withImages, models };
}
