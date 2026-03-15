"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopBar() {
  const pathname = usePathname();

  return (
    <nav className="topbar">
      <Link href="/prompts" className="brand">
        <span className="brand-mark" />
        <span>Prompt Memory</span>
      </Link>

      <div className="topbar-links">
        <Link
          href="/prompts"
          className={pathname === "/prompts" ? "is-active" : ""}
        >
          Explore
        </Link>
        <Link
          href="/prompts/new"
          className={pathname === "/prompts/new" ? "is-active" : ""}
        >
          New Prompt
        </Link>
      </div>
    </nav>
  );
}
