import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findPromptById, updatePrompt, deletePrompt } from "@/lib/db/queries/prompts";
import { deleteImagesByPromptId } from "@/lib/db/queries/images";
import { deleteImageFiles } from "@/lib/storage";

// ─── Validation ───────────────────────────────────────────────────────────────

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
  model: z.string().max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
  is_favorite: z.boolean().optional(),
  category_id: z.number().int().nullable().optional(),
  tags: z.array(z.string().min(1).max(100)).max(50).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/prompts/[id] ────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const prompt = findPromptById(id);
  if (!prompt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(prompt);
}

// ─── PATCH /api/prompts/[id] ──────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const { tags, ...rest } = parsed.data;
  const updated = updatePrompt(id, { ...rest, tagNames: tags });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

// ─── DELETE /api/prompts/[id] ─────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Clean up image files before deleting DB rows (FK cascade handles DB rows)
  const imageIds = deleteImagesByPromptId(id);
  await Promise.all(imageIds.map(deleteImageFiles));

  const deleted = deletePrompt(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
