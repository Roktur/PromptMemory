import { NextRequest, NextResponse } from "next/server";
import { renameTag, deleteTag } from "@/lib/db/queries/tags";

// ─── PATCH /api/tags/[id] ─────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tagId = parseInt(id, 10);
  if (isNaN(tagId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const tag = renameTag(tagId, name);
  if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tag);
}

// ─── DELETE /api/tags/[id] ────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tagId = parseInt(id, 10);
  if (isNaN(tagId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const ok = deleteTag(tagId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
