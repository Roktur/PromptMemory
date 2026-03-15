"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { PromptImage } from "@/lib/types";
import { imageFileUrl } from "@/hooks/useImages";
import { formatBytes } from "@/lib/utils";

interface ImageLightboxProps {
  images: PromptImage[];
  initialIndex: number;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const image = images[index]!;

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer z-10"
        aria-label="Close"
      >
        <X size={20} />
      </button>

      {/* Nav buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer z-10"
            aria-label="Previous"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer z-10"
            aria-label="Next"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Image */}
      <div className="flex max-h-screen max-w-screen-lg flex-col items-center gap-3 p-12">
        <img
          key={image.id}
          src={imageFileUrl(image.id, "medium")}
          alt={image.filename}
          className="max-h-[80vh] max-w-full rounded-[var(--radius-md)] object-contain shadow-2xl"
        />
        <div className="flex items-center gap-3 text-xs text-white/50">
          <span>{image.filename}</span>
          <span>·</span>
          <span>{image.width} × {image.height}</span>
          <span>·</span>
          <span>{formatBytes(image.size_bytes)}</span>
          {images.length > 1 && (
            <>
              <span>·</span>
              <span>{index + 1} / {images.length}</span>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
