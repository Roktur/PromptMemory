import { NextRequest, NextResponse } from "next/server";
import { ulid } from "ulid";
import { findPromptById } from "@/lib/db/queries/prompts";
import { createImage } from "@/lib/db/queries/images";
import { saveImage } from "@/lib/storage";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";

// ─── POST /api/images ─────────────────────────────────────────────────────────
// multipart/form-data: fields: prompt_id, file: <image>

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const promptId = formData.get("prompt_id");
  const file = formData.get("file");

  if (typeof promptId !== "string" || !promptId) {
    return NextResponse.json({ error: "prompt_id is required" }, { status: 422 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 422 });
  }

  // Validate prompt exists
  const prompt = findPromptById(promptId);
  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  // Validate MIME type
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported image type. Accepted: ${ACCEPTED_IMAGE_TYPES.join(", ")}` },
      { status: 422 }
    );
  }

  // Validate size
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max size: ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} MB` },
      { status: 422 }
    );
  }

  const imageId = ulid();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { width, height, size_bytes } = await saveImage(buffer, file.type, imageId);

  const image = createImage({
    id: imageId,
    prompt_id: promptId,
    filename: file.name,
    width,
    height,
    size_bytes,
  });

  return NextResponse.json(image, { status: 201 });
}
