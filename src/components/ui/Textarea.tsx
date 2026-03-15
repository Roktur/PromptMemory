"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] px-3 py-2 text-sm text-[hsl(var(--text))] placeholder:text-[hsl(var(--text-subtle))] transition-colors focus:border-[hsl(var(--accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.2)] disabled:opacity-50 resize-y min-h-[120px]",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
