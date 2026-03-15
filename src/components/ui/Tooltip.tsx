"use client";

import { useState, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), 300);
  };
  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-[var(--radius-sm)] bg-[hsl(var(--surface-overlay))] border border-[hsl(var(--border))] px-2 py-1 text-xs text-[hsl(var(--text-muted))] shadow-md",
            side === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
            side === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-1.5",
            side === "left" && "right-full top-1/2 -translate-y-1/2 mr-1.5",
            side === "right" && "left-full top-1/2 -translate-y-1/2 ml-1.5"
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
