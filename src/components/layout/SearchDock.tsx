"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export function SearchDock() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const push = useCallback(
    (v: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (v.trim()) { sp.set("search", v.trim()); sp.delete("page"); }
      else sp.delete("search");
      router.push(`${ROUTES.prompts}?${sp.toString()}`);
    },
    [router, searchParams]
  );

  const handleChange = (v: string) => {
    setValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push(v), 280);
  };

  const handleClear = () => { setValue(""); push(""); };

  useEffect(() => {
    setValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  return (
    <div className="search-inner">
      <div className="search-input-wrap">
        <input
          type="search"
          className="search-input"
          placeholder="Search AI Prompts..."
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          autoComplete="off"
        />
        <button
          className="search-clear-btn"
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          title="Clear"
        >
          ⌕
        </button>
      </div>
    </div>
  );
}
