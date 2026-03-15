"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants";

export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Sync search input → URL with 300ms debounce
  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const sp = new URLSearchParams(searchParams.toString());
        if (value.trim()) {
          sp.set("search", value.trim());
          sp.delete("page");
        } else {
          sp.delete("search");
        }
        router.push(`${ROUTES.prompts}?${sp.toString()}`);
      }, 300);
    },
    [router, searchParams]
  );

  // Keep input in sync when URL changes externally
  useEffect(() => {
    setSearchValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  return (
    <header className="flex h-14 items-center gap-4 border-b border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface))] px-6">
      <div className="flex-1">
        <Input
          type="search"
          placeholder="Search prompts…"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          leftIcon={<Search size={15} />}
          className="max-w-sm bg-[hsl(var(--surface-raised))]"
        />
      </div>

      <Button
        onClick={() => router.push(ROUTES.newPrompt)}
        size="sm"
        className="gap-1.5 shrink-0"
      >
        <Plus size={15} />
        New Prompt
      </Button>
    </header>
  );
}
