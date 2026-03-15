import { type ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      {icon && (
        <div className="text-[hsl(var(--text-subtle))] opacity-50">{icon}</div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-[hsl(var(--text-muted))]">{title}</p>
        {description && (
          <p className="text-sm text-[hsl(var(--text-subtle))]">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
