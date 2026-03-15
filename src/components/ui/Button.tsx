"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface))] disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer",
          // variants
          variant === "default" &&
            "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent-hover))]",
          variant === "ghost" &&
            "text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-overlay))] hover:text-[hsl(var(--text))]",
          variant === "danger" &&
            "bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))] hover:opacity-90",
          variant === "outline" &&
            "border border-[hsl(var(--border))] text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-raised))] hover:text-[hsl(var(--text))]",
          // sizes
          size === "sm" && "h-7 px-3 text-xs rounded-[var(--radius-sm)]",
          size === "md" && "h-9 px-4 text-sm rounded-[var(--radius-md)]",
          size === "lg" && "h-11 px-6 text-base rounded-[var(--radius-md)]",
          size === "icon" && "h-9 w-9 rounded-[var(--radius-md)]",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
