import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function PromptCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface-raised))] p-4 flex flex-col gap-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex gap-1.5 mt-auto pt-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}
