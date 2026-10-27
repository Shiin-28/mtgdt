"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteDeck } from "@/app/actions";
import type { DeckSummary } from "@/lib/decks";
import { formatLabel } from "@/lib/formats";
import { timeAgo } from "@/lib/format";
import { COLOR_INFO, ColorPip, ColorPips, type ColorKey } from "./ColorPips";
import { NewDeckDialog } from "./NewDeckDialog";

type Sort = "recent" | "name" | "complete" | "missing";

const SORTS: { id: Sort; label: string }[] = [
  { id: "recent", label: "Recently edited" },
  { id: "name", label: "Name" },
  { id: "complete", label: "Most complete" },
  { id: "missing", label: "Most to find" },
];

const pct = (d: DeckSummary) => (d.total ? d.owned / d.total : 0);
/** Copies still to buy (proxied copies don't count). */
const toFind = (d: DeckSummary) => d.total - d.owned - d.proxied;

export function DecksBrowser({
  decks,
  initialQuery,
  openNew,
}: {
  decks: DeckSummary[];
  initialQuery: string;
  openNew: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<Sort>("recent");
  const [colors, setColors] = useState<Set<ColorKey>>(new Set());
  const [creating, setCreating] = useState(openNew);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = decks.filter((d) => {
      if (q && ![d.name, ...d.commanders].some((s) => s.toLowerCase().includes(q))) return false;
      // Colour filter: deck must include every selected colour (C = colourless deck).
      for (const c of colors) {
        if (c === "C" ? d.colors !== "" : !d.colors.includes(c)) return false;
      }
      return true;
    });
    const by: Record<Sort, (a: DeckSummary, b: DeckSummary) => number> = {
      recent: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
      name: (a, b) => a.name.localeCompare(b.name),
      complete: (a, b) => pct(b) - pct(a),
      missing: (a, b) => toFind(b) - toFind(a),
    };
    return [...list].sort(by[sort]);
  }, [decks, query, sort, colors]);

  const totals = useMemo(
    () => ({
      owned: decks.reduce((n, d) => n + d.owned, 0),
      proxied: decks.reduce((n, d) => n + d.proxied, 0),
      toFind: decks.reduce((n, d) => n + toFind(d), 0),
    }),
    [decks],
  );
  const recent = decks[0];
  const almost = [...decks].filter((d) => d.total > 0 && toFind(d) > 0).sort((a, b) => pct(b) - pct(a))[0];

  function toggleColor(c: ColorKey) {
    setColors((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  return (
    <>
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Your Decks</h1>
          <p className="mt-2 text-sm text-muted tabular">
            {decks.length} {decks.length === 1 ? "deck" : "decks"} · {totals.owned} cards owned · {totals.toFind} still
            to find
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 font-medium text-background hover:opacity-90"
        >
          <span className="text-lg leading-none">+</span> New deck
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-11 w-full shrink-0 items-center gap-2 rounded-full sm:w-auto sm:flex-1 border border-border bg-surface px-4 focus-within:border-foreground/40">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="shrink-0 text-muted">
                <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search decks or commanders"
                aria-label="Search decks"
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </div>
            <label className="flex h-11 items-center gap-2 rounded-full border border-border bg-surface pl-4 pr-2 text-sm">
              <span className="text-muted">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-full bg-transparent pr-1 font-medium outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by color">
            <span className="mr-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted">Colors</span>
            {(Object.keys(COLOR_INFO) as ColorKey[]).map((c) => (
              <button
                key={c}
                onClick={() => toggleColor(c)}
                aria-pressed={colors.has(c)}
                className={`rounded-full p-0.5 transition ${colors.has(c) ? "ring-2 ring-sun" : "opacity-55 hover:opacity-100"}`}
              >
                <ColorPip color={c} size={24} />
              </button>
            ))}
            {colors.size > 0 && (
              <button onClick={() => setColors(new Set())} className="ml-1 text-xs text-muted underline">
                Clear
              </button>
            )}
          </div>

          {/* List */}
          <p className="mt-5 text-xs text-muted">
            Showing {visible.length} of {decks.length}
            {query.trim() && <> matching &ldquo;{query.trim()}&rdquo;</>}
          </p>
          {decks.length === 0 ? (
            <EmptyState onNew={() => setCreating(true)} />
          ) : visible.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-dashed border-border p-8 text-center text-muted">
              No decks match. Try another search or clear the color filter.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {visible.map((d) => (
                <DeckRow key={d.id} deck={d} />
              ))}
            </ul>
          )}
        </div>

        {/* Side column */}
        <aside className="space-y-4">
          {recent && <SideCard title="Jump back in" sub={timeAgo(recent.updatedAt)} deck={recent} />}
          {almost && almost.id !== recent?.id && (
            <SideCard title="Almost there" sub={`${Math.round(pct(almost) * 100)}% owned`} deck={almost} />
          )}
          <div className="rounded-3xl border border-border bg-surface p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">Collection snapshot</div>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="Decks" value={decks.length} />
              <Stat label="Ready to play" value={decks.filter((d) => d.total > 0 && toFind(d) === 0).length} />
              <Stat label="Owned" value={totals.owned} />
              <Stat label="Proxied" value={totals.proxied} />
              <Stat label="To find" value={totals.toFind} />
            </dl>
            <Link href="/stores" className="mt-4 block text-sm text-muted underline">
              Which stores we check
            </Link>
          </div>
        </aside>
      </div>

      {creating && <NewDeckDialog onClose={() => setCreating(false)} />}
    </>
  );
}

function DeckRow({ deck }: { deck: DeckSummary }) {
  const [menu, setMenu] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const p = Math.round(pct(deck) * 100);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <li
      className={`group relative rounded-2xl border border-border bg-surface transition hover:border-foreground/30 ${pending ? "opacity-50" : ""}`}
    >
      <Link href={`/decks/${deck.id}`} className="flex items-center gap-4 p-3 pr-14">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:w-24">
          {deck.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={deck.imageUrl.replace("/normal/", "/art_crop/")} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{deck.name}</span>
            <span className="hidden shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted sm:inline">
              {formatLabel(deck.format)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-sm text-muted">
            <ColorPips colors={deck.colors} size={16} />
            <span className="truncate">{deck.commanders.join(" + ") || "No commander set"}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div className={`h-full ${p === 100 ? "bg-owned" : "bg-sun"}`} style={{ width: `${p}%` }} />
              <div
                className="h-full bg-proxy"
                style={{ width: `${deck.total ? (deck.proxied / deck.total) * 100 : 0}%` }}
                title={`${deck.proxied} proxied`}
              />
            </div>
            <span className="shrink-0 text-xs text-muted tabular">
              {deck.owned}/{deck.total}
              <span className="hidden sm:inline">
                {" "}
                {deck.proxied > 0 && <>· {deck.proxied} proxy </>}· {toFind(deck)} to find · {timeAgo(deck.updatedAt)}
              </span>
            </span>
          </div>
        </div>
      </Link>

      <div ref={menuRef} className="absolute right-3 top-3">
        <button
          onClick={() => setMenu((m) => !m)}
          aria-label={`Options for ${deck.name}`}
          aria-expanded={menu}
          className="h-9 w-9 rounded-full text-lg leading-none text-muted hover:bg-surface-2"
        >
          ⋯
        </button>
        {menu && (
          <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-xl border border-border bg-surface py-1 text-sm shadow-xl">
            <Link href={`/decks/${deck.id}`} className="block px-3 py-2 hover:bg-surface-2">
              Open
            </Link>
            <button
              onClick={() => {
                setMenu(false);
                if (confirm(`Delete "${deck.name}"? This can't be undone.`)) startTransition(() => deleteDeck(deck.id));
              }}
              className="block w-full px-3 py-2 text-left text-danger hover:bg-surface-2"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function SideCard({ title, sub, deck }: { title: string; sub: string; deck: DeckSummary }) {
  return (
    <Link
      href={`/decks/${deck.id}`}
      className="group block overflow-hidden rounded-3xl border border-border bg-surface hover:border-foreground/30"
    >
      <div className="relative h-24 bg-surface-2">
        {deck.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={deck.imageUrl.replace("/normal/", "/art_crop/")}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
          {title}
        </span>
      </div>
      <div className="p-4">
        <div className="truncate font-medium">{deck.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          <ColorPips colors={deck.colors} size={14} />
          <span>{sub}</span>
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-display text-2xl font-semibold tabular">{value}</dd>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="mt-2 rounded-3xl border-2 border-dashed border-border p-10 text-center">
      <div className="font-display text-2xl font-semibold">No decks yet</div>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        Create a deck and paste your list from Moxfield, ManaBox or Arena. We&rsquo;ll track what you own and price the
        rest.
      </p>
      <button onClick={onNew} className="mt-5 h-11 rounded-full bg-foreground px-5 font-medium text-background">
        + New deck
      </button>
    </div>
  );
}
