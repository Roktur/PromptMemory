import { NextRequest, NextResponse } from "next/server";
import { findImageById, deleteImage } from "@/lib/db/queries/images";
import { deleteImageFiles } from "@/lib/storage";

type RouteParams = { params: Promise<{ id: string }> };

// ─── DELETE /api/images/[id] ──────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const image = findImageById(id);
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete filesystem files first, then DB row
  await deleteImageFiles(id);
  deleteImage(id);

  return new NextResponse(null, { status: 204 });
}
