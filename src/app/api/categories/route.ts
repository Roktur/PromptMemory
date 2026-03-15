import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findAllCategories, createCategory } from "@/lib/db/queries/categories";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function GET() {
  const categories = findAllCategories();
  return NextResponse.json(categories);
}

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

  try {
    const category = createCategory(parsed.data);
    return NextResponse.json(category, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "Category name already exists" }, { status: 409 });
    }
    throw err;
  }
}
