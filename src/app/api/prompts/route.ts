import { NextRequest, NextResponse } from "next/server";
import { ulid } from "ulid";
import { z } from "zod";
import { findManyPrompts, createPrompt } from "@/lib/db/queries/prompts";

// ─── Validation ───────────────────────────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1),
  model: z.string().max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
  is_favorite: z.boolean().optional(),
  category_id: z.number().int().nullable().optional(),
  tags: z.array(z.string().min(1).max(100)).max(50).optional(),
});

const listSchema = z.object({
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  model: z.string().optional(),
  is_favorite: z.enum(["true", "false"]).optional(),
  category_id: z.coerce.number().int().optional(),
  sort_by: z.enum(["created_at", "updated_at", "title"]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  per_page: z.coerce.number().int().min(1).max(200).optional(),
});

// ─── GET /api/prompts ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = listSchema.safeParse(sp);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params", issues: parsed.error.issues }, { status: 400 });
  }

  const q = parsed.data;
  const result = findManyPrompts({
    search: q.search,
    tags: q.tags ? q.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
    model: q.model,
    is_favorite: q.is_favorite === "true" ? true : q.is_favorite === "false" ? false : undefined,
    categoryId: q.category_id,
    sort_by: q.sort_by,
    sort_order: q.sort_order,
    page: q.page,
    per_page: q.per_page,
  });

  return NextResponse.json(result);
}

// ─── POST /api/prompts ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const { title, body: promptBody, model, notes, is_favorite, category_id, tags } = parsed.data;

  const prompt = createPrompt({
    id: ulid(),
    title,
    body: promptBody,
    model: model ?? null,
    notes: notes ?? null,
    is_favorite: is_favorite ?? false,
    category_id: category_id ?? null,
    tagNames: tags ?? [],
  });

  return NextResponse.json(prompt, { status: 201 });
}
