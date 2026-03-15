// ─────────────────────────────────────────────────────────────────────────────
// Storage Layer — Sharp image pipeline
// Generates thumb (320×320) and medium (1280×1280) WebP variants on upload.
// Directory layout: uploads/{imageId}/original.ext
//                   uploads/{imageId}/thumb.webp
//                   uploads/{imageId}/medium.webp
// ─────────────────────────────────────────────────────────────────────────────

import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { IMAGE_VARIANTS } from "@/lib/constants";
import type { ImageVariant } from "@/lib/types";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function imageDir(imageId: string): string {
  return path.join(UPLOADS_DIR, imageId);
}

export function getImagePath(imageId: string, variant: ImageVariant, originalExt?: string): string {
  if (variant === "original") {
    if (!originalExt) throw new Error("originalExt is required for 'original' variant");
    return path.join(imageDir(imageId), `original${originalExt}`);
  }
  return path.join(imageDir(imageId), `${variant}.webp`);
}

// ─── Save image ───────────────────────────────────────────────────────────────

export interface SaveImageResult {
  width: number;
  height: number;
  size_bytes: number;
  ext: string; // e.g. ".jpg"
}

/**
 * Accepts a raw file Buffer and its MIME type, persists all three variants,
 * and returns the original image metadata.
 */
export async function saveImage(
  buffer: Buffer,
  mimeType: string,
  imageId: string
): Promise<SaveImageResult> {
  const dir = imageDir(imageId);
  await fs.mkdir(dir, { recursive: true });

  const ext = mimeTypeToExt(mimeType);

  // Persist original
  const originalPath = path.join(dir, `original${ext}`);
  await fs.writeFile(originalPath, buffer);

  // Read metadata from original
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const size_bytes = buffer.byteLength;

  // Generate thumb
  await sharp(buffer)
    .resize(IMAGE_VARIANTS.thumb.width, IMAGE_VARIANTS.thumb.height, {
      fit: "cover",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toFile(path.join(dir, "thumb.webp"));

  // Generate medium
  await sharp(buffer)
    .resize(IMAGE_VARIANTS.medium.width, IMAGE_VARIANTS.medium.height, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 88 })
    .toFile(path.join(dir, "medium.webp"));

  return { width, height, size_bytes, ext };
}

// ─── Delete image files ───────────────────────────────────────────────────────

export async function deleteImageFiles(imageId: string): Promise<void> {
  const dir = imageDir(imageId);
  await fs.rm(dir, { recursive: true, force: true });
}

// ─── Read image file ──────────────────────────────────────────────────────────

export async function readImageFile(imagePath: string): Promise<Buffer> {
  return fs.readFile(imagePath);
}

// ─── MIME → extension ─────────────────────────────────────────────────────────

function mimeTypeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
  };
  return map[mimeType] ?? ".bin";
}
