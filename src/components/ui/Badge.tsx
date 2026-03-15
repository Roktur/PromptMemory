import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "muted";
  removable?: boolean;
  onRemove?: () => void;
}

export function Badge({
  children,
  className,
  variant = "default",
  removable,
  onRemove,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "default" &&
          "bg-[hsl(var(--surface-overlay))] text-[hsl(var(--text-muted))]",
        variant === "accent" &&
          "bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]",
        variant === "muted" &&
          "bg-[hsl(var(--surface-raised))] text-[hsl(var(--text-subtle))]",
        className
      )}
      {...props}
    >
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full hover:bg-[hsl(var(--surface-raised))] p-0.5 text-[hsl(var(--text-subtle))] hover:text-[hsl(var(--text))] transition-colors cursor-pointer"
          aria-label="Remove"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}
