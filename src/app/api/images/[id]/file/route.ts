import { NextRequest, NextResponse } from "next/server";
import { findImageById } from "@/lib/db/queries/images";
import { getImagePath, readImageFile } from "@/lib/storage";
import type { ImageVariant } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

const VARIANT_MIME: Record<string, string> = {
  thumb: "image/webp",
  medium: "image/webp",
  original: "image/octet-stream", // overridden per ext below
};

const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

// ─── GET /api/images/[id]/file?v=thumb|medium|original ───────────────────────

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const variant = (req.nextUrl.searchParams.get("v") ?? "medium") as ImageVariant;

  if (!["thumb", "medium", "original"].includes(variant)) {
    return NextResponse.json({ error: "Invalid variant. Use: thumb, medium, original" }, { status: 400 });
  }

  const image = findImageById(id);
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolve original file extension from stored filename
  const ext = image.filename.slice(image.filename.lastIndexOf(".")).toLowerCase() || ".bin";

  let filePath: string;
  try {
    filePath = getImagePath(id, variant, ext);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readImageFile(filePath);
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  const mimeType =
    variant === "original"
      ? (EXT_MIME[ext] ?? "application/octet-stream")
      : VARIANT_MIME[variant];

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(fileBuffer.byteLength),
    },
  });
}
