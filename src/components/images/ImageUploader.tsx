"use client";

import { useCallback, useRef, useState } from "react";
import { useUploadImage } from "@/hooks/useImages";
import { formatBytes } from "@/lib/utils";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/constants";

interface ImageUploaderProps {
  promptId: string;
  onUpload?: () => void;
}

interface FilePreview {
  file: File;
  objectUrl: string;
  error?: string;
}

export function ImageUploader({ promptId, onUpload }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const next: FilePreview[] = [];
    for (const file of Array.from(files)) {
      let error: string | undefined;
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) error = `Unsupported type`;
      else if (file.size > MAX_IMAGE_SIZE_BYTES) error = `Too large (max ${formatBytes(MAX_IMAGE_SIZE_BYTES)})`;
      next.push({ file, objectUrl: URL.createObjectURL(file), error });
    }
    setPreviews((p) => [...p, ...next]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const remove = (i: number) => {
    setPreviews((p) => { URL.revokeObjectURL(p[i]!.objectUrl); return p.filter((_, j) => j !== i); });
  };

  const uploadAll = async () => {
    for (const p of previews.filter((p) => !p.error)) {
      await upload.mutateAsync({ promptId, file: p.file });
    }
    setPreviews([]);
    onUpload?.();
  };

  const validCount = previews.filter((p) => !p.error).length;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        className={`upload-zone${isDragging ? " is-dragover" : ""}`}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <span style={{ fontSize: "2rem", opacity: 0.5 }}>↑</span>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          Drop images here or <span style={{ color: "#c7ea46" }}>click to browse</span>
        </p>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>
          JPEG, PNG, WebP, GIF, AVIF — max {formatBytes(MAX_IMAGE_SIZE_BYTES)}
        </p>
        <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple className="hidden" onChange={(e) => addFiles(e.target.files)} style={{ display: "none" }} />
      </div>

      {previews.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {previews.map((preview, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: "var(--radius-xs)",
              border: `1px solid ${preview.error ? "rgba(233,104,104,0.4)" : "var(--border)"}`,
              background: preview.error ? "rgba(233,104,104,0.05)" : "rgba(255,255,255,0.02)"
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", background: "rgba(0,0,0,0.3)", flexShrink: 0 }}>
                {!preview.error && <img src={preview.objectUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "0.84rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preview.file.name}</p>
                <p style={{ margin: 0, fontSize: "0.76rem", color: preview.error ? "var(--danger)" : "var(--muted)" }}>
                  {preview.error ?? formatBytes(preview.file.size)}
                </p>
              </div>
              <button onClick={() => remove(i)} type="button" style={{ border: 0, background: "transparent", color: "var(--muted)", cursor: "pointer", padding: 4, fontSize: "1.1rem" }}>×</button>
            </div>
          ))}

          {validCount > 0 && (
            <button className="btn-primary" onClick={uploadAll} disabled={upload.isPending} type="button" style={{ justifyContent: "center" }}>
              {upload.isPending
                ? <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                : `Upload ${validCount} image${validCount !== 1 ? "s" : ""}`
              }
            </button>
          )}
        </div>
      )}
    </div>
  );
}
