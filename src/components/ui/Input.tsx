"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, ...props }, ref) => {
    if (leftIcon || rightIcon) {
      return (
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 text-[hsl(var(--text-subtle))]">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              "h-9 w-full rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-sm text-[hsl(var(--text))] placeholder:text-[hsl(var(--text-subtle))] transition-colors focus:border-[hsl(var(--accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.2)] disabled:opacity-50",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              !leftIcon && "pl-3",
              !rightIcon && "pr-3",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="pointer-events-none absolute right-3 text-[hsl(var(--text-subtle))]">
              {rightIcon}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] px-3 text-sm text-[hsl(var(--text))] placeholder:text-[hsl(var(--text-subtle))] transition-colors focus:border-[hsl(var(--accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.2)] disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
