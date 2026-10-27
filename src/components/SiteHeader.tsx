"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SunMark } from "./SunMark";
import { AccountMenu } from "./auth/AccountMenu";

const MORE_LINKS = [
  { href: "/stores", label: "Stores we check" },
  { href: "/#how-it-works", label: "How prices work" },
  { href: "https://scryfall.com", label: "Card data: Scryfall ↗", external: true },
];

/** Site header. Each page passes which tab is active (no URL reading needed). */
export function SiteHeader({ active }: { active?: "home" | "decks" | "more" }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !moreRef.current?.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [moreOpen]);

  const navItem = (isActive: boolean) =>
    `relative whitespace-nowrap px-2 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? "text-foreground after:absolute after:inset-x-2 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-sun"
        : "text-muted hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:gap-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <SunMark size={22} className="text-sun" />
          <span className="font-display text-lg font-semibold leading-none tracking-wide" title="MTG Deck Tracker">
            MTGDT
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* On phones the logo is the way home. */}
          <Link href="/" className={`${navItem(active === "home")} hidden sm:inline`}>
            Home
          </Link>
          <Link href="/decks" className={navItem(active === "decks")}>
            Your Decks
          </Link>
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className={`${navItem(active === "more")} flex items-center gap-1`}
            >
              More
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className={moreOpen ? "rotate-180" : ""}>
                <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="absolute right-0 top-10 w-52 overflow-hidden rounded-lg border border-border bg-surface py-1 text-sm shadow-xl sm:left-0 sm:right-auto"
              >
                {MORE_LINKS.map((l) =>
                  l.external ? (
                    <a
                      key={l.href}
                      role="menuitem"
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2.5 hover:bg-surface-2"
                      onClick={() => setMoreOpen(false)}
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      key={l.href}
                      role="menuitem"
                      href={l.href}
                      className="block px-3 py-2.5 hover:bg-surface-2"
                      onClick={() => setMoreOpen(false)}
                    >
                      {l.label}
                    </Link>
                  ),
                )}
              </div>
            )}
          </div>
        </nav>
        <AccountMenu />
      </div>
    </header>
  );
}
