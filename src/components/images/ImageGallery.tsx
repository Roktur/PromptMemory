"use client";

import { useState } from "react";
import { Trash2, ZoomIn } from "lucide-react";
import type { PromptImage } from "@/lib/types";
import { imageFileUrl } from "@/hooks/useImages";
import { useDeleteImage } from "@/hooks/useImages";
import { formatBytes } from "@/lib/utils";
import { ImageLightbox } from "./ImageLightbox";

interface ImageGalleryProps {
  images: PromptImage[];
  promptId: string;
}

export function ImageGallery({ images, promptId }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const deleteImage = useDeleteImage();

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((image, idx) => (
          <div
            key={image.id}
            className="group relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-[hsl(var(--surface))]"
          >
            <img
              src={imageFileUrl(image.id, "thumb")}
              alt={image.filename}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => setLightboxIndex(idx)}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
                aria-label="View full size"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => deleteImage.mutate({ imageId: image.id, promptId })}
                disabled={deleteImage.isPending}
                className="rounded-full bg-white/10 p-2 text-red-400 hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Delete image"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Size badge */}
            <div className="absolute bottom-1 left-1 rounded-sm bg-black/50 px-1 py-0.5 text-[9px] text-white/80">
              {formatBytes(image.size_bytes)}
            </div>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
