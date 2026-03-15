import { type ReactNode, Suspense } from "react";
import { TopBar } from "./TopBar";
import { SearchDock } from "./SearchDock";
import { Sidebar } from "./Sidebar";
import { FabNewPrompt } from "./FabNewPrompt";

interface AppShellProps {
  children: ReactNode;
  /** "home" = hero + search + sidebar layout. "detail" = compact topbar only. */
  variant?: "home" | "detail";
  /** Shown in compact hero (detail pages) */
  backHref?: string;
  heroTitle?: string;
  heroEyebrow?: string;
}

export function AppShell({
  children,
  variant = "home",
  backHref,
  heroTitle,
  heroEyebrow,
}: AppShellProps) {
  return (
    <div className="app-shell">
      {/* Ambient glow blobs */}
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {variant === "home" ? (
        <>
          {/* Hero + Topbar */}
          <header className="hero">
            <Suspense><TopBar /></Suspense>
            <div className="hero-copy">
              <p className="eyebrow">Personal AI Prompt Collections</p>
              <h1>Prompt Memory</h1>
              <p className="hero-text" style={{ marginTop: 12, maxWidth: 600 }}>
                Organize your prompt library, browse by tags, favorite the prompts you reuse,
                and copy them instantly.
              </p>
            </div>
          </header>

          {/* Search dock */}
          <section className="search-dock">
            <Suspense><SearchDock /></Suspense>
          </section>

          {/* Sidebar + main */}
          <main className="page-content page-content-home">
            <aside className="home-sidebar">
              <Suspense><Sidebar /></Suspense>
            </aside>
            <div className="home-main-content">
              {children}
            </div>
          </main>
        </>
      ) : (
        <>
          {/* Compact hero */}
          <header className="hero hero-compact">
            <Suspense><TopBar /></Suspense>
            <div className="hero-copy hero-copy-compact">
              {backHref && (
                <a className="back-link" href={backHref}>
                  ← Back
                </a>
              )}
              {heroEyebrow && <p className="eyebrow">{heroEyebrow}</p>}
              {heroTitle && <h1 style={{ fontSize: "clamp(1.8rem, 3vw, 3rem)" }}>{heroTitle}</h1>}
            </div>
          </header>

          <main style={{ position: "relative", zIndex: 1 }}>
            {children}
          </main>
        </>
      )}

      <FabNewPrompt />
    </div>
  );
}
