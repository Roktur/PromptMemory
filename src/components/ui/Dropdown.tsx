"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}

export function Dropdown({ trigger, items, align = "right" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <div onClick={() => setOpen((v) => !v)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-1 min-w-[160px] rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-overlay))] py-1 shadow-xl",
            align === "right" ? "right-0" : "left-0"
          )}
          role="menu"
        >
          {items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
                item.danger
                  ? "text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.1)]"
                  : "text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-raised))] hover:text-[hsl(var(--text))]"
              )}
            >
              {item.icon && <span className="opacity-70">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
