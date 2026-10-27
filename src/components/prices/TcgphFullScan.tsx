"use client";

import { TCGPH_MULTISEARCH_URL } from "@/lib/tcgph";

/**
 * "Full scan" hand-off to TCGph's Multisearch, which checks every PH store at
 * once. Opens the page and copies the missing list so the user only has to paste.
 */
export function TcgphFullScan({
  list,
  count,
  onCopy,
  variant = "card",
}: {
  list: string;
  count: number;
  /** Copies `list`; the caller shows the toast. */
  onCopy: (text: string, message: string) => void;
  variant?: "card" | "inline";
}) {
  if (!count) return null;

  function copyAndOpen() {
    // Open first, while still inside the click, so pop-up blockers allow it.
    window.open(TCGPH_MULTISEARCH_URL, "_blank", "noopener,noreferrer");
    onCopy(list, `Copied ${count} ${count === 1 ? "card" : "cards"}. Paste it into TCGph Multisearch (Ctrl+V).`);
  }

  const buttons = (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={copyAndOpen}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3 text-sm font-medium text-background hover:opacity-90"
      >
        Copy list &amp; open TCGph ↗
      </button>
      <button
        onClick={() => onCopy(list, `Copied ${count} missing ${count === 1 ? "card" : "cards"}`)}
        className="h-9 rounded-lg border border-border px-3 text-sm font-medium hover:border-foreground/40"
      >
        Copy list only
      </button>
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sun/40 bg-sun/10 p-3">
        <div className="min-w-0 text-sm">
          <div className="font-medium">Want a full scan of every PH store?</div>
          <div className="text-muted">
            Paste your {count} missing {count === 1 ? "card" : "cards"} into{" "}
            <a href={TCGPH_MULTISEARCH_URL} target="_blank" rel="noopener noreferrer" className="underline">
              TCGph Multisearch
            </a>
            .
          </div>
        </div>
        {buttons}
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="text-sm">
        <span className="font-medium">Full scan:</span>{" "}
        <span className="text-muted">
          check all PH stores at once on{" "}
          <a href={TCGPH_MULTISEARCH_URL} target="_blank" rel="noopener noreferrer" className="underline">
            TCGph
          </a>
          . We copy your list, you paste it.
        </span>
      </div>
      {buttons}
    </div>
  );
}
