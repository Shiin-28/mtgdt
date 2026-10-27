"use client";

import { useEffect, useId, useRef, useState } from "react";

type Suggestion = { name: string; typeLine?: string; imageUrl?: string | null };

/**
 * Card-name input with Scryfall suggestions. `commanderOnly` searches legal
 * commanders and `filter` adds a Scryfall filter (both via /cards/search);
 * otherwise it uses /cards/autocomplete.
 */
export function CardSearch({
  onPick,
  placeholder,
  commanderOnly = false,
  filter,
  disabled = false,
  autoFocus = false,
}: {
  onPick: (name: string) => void;
  placeholder: string;
  commanderOnly?: boolean;
  /** Extra Scryfall filter, e.g. "t:background". */
  filter?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listId = useId();
  const requestSeq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const seq = ++requestSeq.current;
    const t = setTimeout(async () => {
      try {
        const useSearch = commanderOnly || Boolean(filter);
        const url = useSearch
          ? `/api/cards/search?${commanderOnly ? "commander=1&" : ""}${filter ? `filter=${encodeURIComponent(filter)}&` : ""}q=${encodeURIComponent(q)}`
          : `/api/cards/autocomplete?q=${encodeURIComponent(q)}`;
        const res = await fetch(url);
        const body = await res.json();
        if (seq !== requestSeq.current) return; // a newer query is in flight
        const list: Suggestion[] = useSearch ? body.cards : (body.names as string[]).map((name) => ({ name }));
        setResults(list);
        setActive(0);
        setOpen(true);
        setError(body.error ?? null);
      } catch {
        if (seq === requestSeq.current) setError("Card search is unavailable right now");
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, commanderOnly, filter]);

  function pick(name: string) {
    onPick(name);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim().length < 2) setResults([]);
        }}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            pick(results[active].name);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className="h-11 w-full rounded-lg border border-border bg-surface px-3 outline-none focus:border-accent disabled:opacity-60"
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      {open && query.trim().length >= 2 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg"
        >
          {results.length === 0 && <li className="px-3 py-2 text-sm text-muted">No matching cards</li>}
          {results.map((r, i) => (
            <li
              key={r.name}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r.name)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 ${i === active ? "bg-surface-2" : ""}`}
            >
              {r.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.imageUrl} alt="" className="h-10 w-7 shrink-0 rounded-sm object-cover" />
              )}
              <div className="min-w-0">
                <div className="truncate">{r.name}</div>
                {r.typeLine && <div className="truncate text-xs text-muted">{r.typeLine}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
