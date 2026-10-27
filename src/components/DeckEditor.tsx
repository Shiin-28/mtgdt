"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addCardByName,
  deleteDeck,
  removeDeckCard,
  renameDeck,
  setAllOwned,
  updateDeckCard,
  type ActionResult,
} from "@/app/actions";
import type { DeckCardView, DeckView } from "@/lib/decks";
import { groupCards, type GroupBy, type SortBy } from "@/lib/cards/grouping";
import { frontFace, normalizeName } from "@/lib/cards/normalize";
import { cardStatus, isMissing, isProxied, nextStatusPatch, type CardPatch } from "@/lib/cards/status";
import { formatPhp } from "@/lib/format";
import { planCard, shoppingList, type CardPlan } from "@/lib/prices/compute";
import type { ListingView } from "@/lib/prices/types";
import { CHECK_URL_QUERY, type StoreInfo } from "@/lib/stores/types";
import { tcgphList } from "@/lib/tcgph";
import { CardSearch } from "./CardSearch";
import { CardInspector } from "./deck/CardInspector";
import { CommanderPairing } from "./deck/CommanderPairing";
import { CompactRow } from "./deck/CompactRow";
import { ManaCost } from "./deck/ManaCost";
import { GalleryView, StacksView } from "./deck/VisualViews";
import { ImportDialog } from "./ImportDialog";
import { ProgressBar } from "./ProgressBar";
import { CardPriceLine, ListingsPanel, PriceSummary, ShoppingList, type CardPriceStatus } from "./prices/PriceViews";
import { usePricePrefs } from "./prices/usePricePrefs";
import { TcgphFullScan } from "./prices/TcgphFullScan";
import { usePrices } from "./prices/usePrices";
import { useStoredState } from "./useStoredState";

type Filter = "all" | "owned" | "proxy" | "missing";
type Layout = "compact" | "condensed" | "detailed" | "grid" | "stacks" | "stacks-split" | "spoiler";
const LIST_LAYOUTS: Layout[] = ["compact", "condensed", "detailed"];

type CardPrice = { plan?: CardPlan; status: CardPriceStatus; listings: ListingView[] };

function checkUrl(stores: StoreInfo[], storeId: string, cardName: string) {
  const s = stores.find((x) => x.id === storeId);
  return s ? s.checkUrlTemplate.replace(CHECK_URL_QUERY, encodeURIComponent(frontFace(cardName))) : "#";
}

export function DeckEditor({ initial }: { initial: DeckView }) {
  const [deck, setDeck] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /** Run a server action that returns the whole deck, and apply it. */
  function run(action: () => Promise<ActionResult>, success?: string) {
    startTransition(async () => {
      const res = await action().catch(() => null);
      if (!res) return setToast({ text: "Couldn't reach the server. Try again.", error: true });
      if (!res.ok) return setToast({ text: res.error, error: true });
      setDeck(res.data);
      if (success) setToast({ text: success });
    });
  }

  /** Update one card locally right away, then save; revert on failure. */
  function patchCard(card: DeckCardView, patch: CardPatch) {
    const replace = (next: DeckCardView) =>
      setDeck((d) => ({ ...d, cards: d.cards.map((c) => (c.id === card.id ? next : c)) }));
    replace({ ...card, ...patch });
    updateDeckCard(card.id, patch)
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
      })
      .catch((e) => {
        replace(card);
        setToast({ text: e instanceof Error ? e.message : "Couldn't save", error: true });
      });
  }

  const stats = useMemo(() => {
    let total = 0;
    let owned = 0;
    let proxied = 0;
    for (const c of deck.cards) {
      total += c.quantity;
      owned += Math.min(c.ownedQty, c.quantity);
      if (isProxied(c)) proxied += c.quantity - c.ownedQty;
    }
    return {
      total,
      owned,
      proxied,
      missingRows: deck.cards.filter(isMissing).length,
    };
  }, [deck.cards]);

  const commanders = deck.cards.filter((c) => c.isCommander);

  const [view, setView] = useState<"cards" | "shopping">("cards");
  const prices = usePrices(deck.id);
  const [prefs, setPrefs] = usePricePrefs();

  const priceData = useMemo(() => {
    const fetchingStores = prices.stores.filter((s) => s.support !== "unsupported");
    const byCard: Record<string, CardPrice> = {};
    const plans: CardPlan[] = [];
    const unchecked: string[] = [];
    const storeErrors: Record<string, string> = {};
    for (const f of Object.values(prices.fetches)) {
      if (f.status === "error" && f.error) storeErrors[f.store] = f.error;
    }
    for (const c of deck.cards.filter(isMissing)) {
      const key = normalizeName(c.card.name);
      const fetches = fetchingStores.map((s) => prices.fetches[`${s.id}|${key}`]).filter((f) => f !== undefined);
      const status: CardPriceStatus = {
        checkedStores: fetches.length,
        totalStores: fetchingStores.length,
        lastChecked:
          fetches
            .map((f) => f.fetchedAt)
            .sort()
            .at(-1) ?? null,
        errors: fetches.filter((f) => f.status === "error"),
      };
      const listings = prices.listings[key] ?? [];
      const entry: CardPrice = { status, listings };
      if (fetches.length) {
        entry.plan = planCard(key, c.card.name, c.quantity - c.ownedQty, listings, prefs);
        plans.push(entry.plan);
      } else {
        unchecked.push(c.card.name);
      }
      byCard[c.id] = entry;
    }
    return { byCard, plans, unchecked, storeErrors, groups: shoppingList(plans) };
  }, [deck.cards, prices.fetches, prices.listings, prices.stores, prefs]);

  // List display choices, remembered in this browser.
  const [layout, setLayout] = useStoredState<Layout>("phdt:deck-layout", "compact");
  const [groupBy, setGroupBy] = useStoredState<GroupBy>("phdt:deck-group", "type");
  const [sortBy, setSortBy] = useStoredState<SortBy>("phdt:deck-sort", "name");
  const [showPrices, setShowPrices] = useStoredState("phdt:deck-show-prices", true);
  const [showStatus, setShowStatus] = useStoredState("phdt:deck-show-status", true);
  // The inspector shows the pinned card, else the hovered one, else the commander.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const selected = deck.cards.find((c) => c.id === selectedId) ?? null;
  const inspected = selected ?? deck.cards.find((c) => c.id === hoverId) ?? commanders[0] ?? null;

  const groups = useMemo(() => {
    const visible = deck.cards.filter((c) =>
      // A partly owned card (3 of 8 Mountain) shows under both Owned and Missing.
      filter === "all" ? true : filter === "owned" ? c.ownedQty > 0 : filter === "proxy" ? isProxied(c) : isMissing(c),
    );
    const unitPrice = (c: DeckCardView) => priceData.byCard[c.id]?.plan?.allocations[0]?.listing.pricePhp ?? null;
    return groupCards(visible, groupBy, sortBy, unitPrice).map((g) => ({
      ...g,
      copies: g.cards.reduce((n, c) => n + c.quantity, 0),
      toBuy: g.cards.reduce((n, c) => n + (priceData.byCard[c.id]?.plan?.cost ?? 0), 0),
    }));
  }, [deck.cards, filter, groupBy, sortBy, priceData.byCard]);

  const select = (id: string) => setSelectedId((cur) => (cur === id ? null : id));
  const visualProps = {
    groups,
    planFor: (c: DeckCardView) => priceData.byCard[c.id]?.plan,
    showPrices,
    showStatus,
    selectedId,
    onSelect: select,
    onHover: setHoverId,
    onPatch: patchCard,
  };
  const removeCard = (c: DeckCardView) => {
    if (selectedId === c.id) setSelectedId(null);
    run(() => removeDeckCard(c.id), `Removed ${c.card.name}`);
  };

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API needs a secure context; fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  async function copyProxies() {
    const lines = deck.cards.filter(isProxied).map((c) => `${c.quantity - c.ownedQty} ${c.card.name}`);
    if (!lines.length) return setToast({ text: "No proxies marked in this deck" });
    await copyText(lines.join("\n"));
    setToast({ text: `Copied ${lines.length} ${lines.length === 1 ? "proxy" : "proxies"} to print` });
  }

  // Missing cards as a pasteable list for TCGph's Multisearch.
  const missingCards = deck.cards.filter(isMissing);
  const tcgph = {
    list: tcgphList(missingCards.map((c) => ({ name: c.card.name, qty: c.quantity - c.ownedQty }))),
    count: missingCards.length,
    onCopy: async (text: string, message: string) => {
      await copyText(text);
      setToast({ text: message });
    },
  };

  async function copyMissing() {
    const lines = deck.cards.filter(isMissing).map((c) => `${c.quantity - c.ownedQty} ${c.card.name}`);
    if (!lines.length) return setToast({ text: "Nothing left to buy for this deck!" });
    await copyText(lines.join("\n"));
    setToast({ text: `Copied ${lines.length} missing ${lines.length === 1 ? "card" : "cards"}` });
  }

  return (
    <div className="pb-16">
      <DeckHeader
        deck={deck}
        onRename={(name) => run(() => renameDeck(deck.id, name))}
        onMarkAll={(owned) => run(() => setAllOwned(deck.id, owned), owned ? "Marked all owned" : "Cleared owned")}
        onCopyProxies={copyProxies}
        onDelete={() => {
          if (confirm(`Delete "${deck.name}"? This can't be undone.`)) startTransition(() => deleteDeck(deck.id));
        }}
      />

      {/* Deck dashboard: commander and progress, tools, and cost, side by side on wide screens. */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-border bg-surface">
          {commanders.length ? (
            <div className={`grid gap-px ${commanders.length > 1 ? "grid-cols-2" : ""}`}>
              {commanders.map((c) => (
                <button
                  key={c.id}
                  onClick={() => select(c.id)}
                  className="relative h-28 bg-surface-2 text-left text-white"
                >
                  {c.card.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.card.imageUrl.replace("/normal/", "/art_crop/")}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                  <span className="absolute inset-x-3 bottom-2 block min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-sun">
                      Commander
                    </span>
                    <span className="block truncate font-display text-lg font-semibold leading-tight">
                      {c.card.name}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="p-4">
            {commanders.length ? null : (
              <div className="mb-4">
                <div className="mb-1 text-sm font-medium">Set a commander</div>
                <CardSearch
                  commanderOnly
                  disabled={pending}
                  placeholder="Search legendary creatures…"
                  onPick={(name) =>
                    run(() => addCardByName(deck.id, name, { isCommander: true }), `${name} set as commander`)
                  }
                />
              </div>
            )}
            <CommanderPairing
              commanders={commanders}
              disabled={pending}
              onAdd={(name) =>
                run(() => addCardByName(deck.id, name, { isCommander: true }), `${name} added as a commander`)
              }
            />
            <ProgressBar owned={stats.owned} proxied={stats.proxied} total={stats.total} />
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">Add cards</div>
          <CardSearch
            disabled={pending}
            placeholder="Search a card to add…"
            onPick={(name) => run(() => addCardByName(deck.id, name), `Added ${name}`)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setImporting(true)}
              className="h-10 flex-1 rounded-lg border border-border bg-surface text-sm font-medium hover:border-foreground/40"
            >
              Import list
            </button>
            <button
              onClick={copyMissing}
              className="h-10 flex-1 rounded-lg border border-border bg-surface text-sm font-medium hover:border-foreground/40"
            >
              Copy missing
            </button>
          </div>
          <p className="text-xs text-muted">
            Tap a card&rsquo;s dot to switch Missing → Owned → Proxy. Click its name to edit it in the inspector.
          </p>
        </section>

        <PriceSummary
          plans={priceData.plans}
          missingCount={stats.missingRows}
          uncheckedCount={priceData.unchecked.length}
          prefs={prefs}
          onPrefs={setPrefs}
          running={prices.running}
          stopped={prices.stopped}
          progress={prices.progress}
          error={prices.error}
          stores={prices.stores}
          storeErrors={priceData.storeErrors}
          onRefresh={prices.refresh}
          onStop={prices.stop}
          footer={<TcgphFullScan {...tcgph} />}
        />
      </div>

      {/* Inspector on the left (wide screens), card list on the right. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <CardInspector
              dc={inspected}
              pinned={selected !== null}
              price={inspected ? priceData.byCard[inspected.id] : undefined}
              stores={prices.stores}
              running={prices.running}
              checkUrlFor={(storeId, name) => checkUrl(prices.stores, storeId, name)}
              onPatch={(patch) => inspected && patchCard(inspected, patch)}
              onRemove={() => inspected && removeCard(inspected)}
              onClose={() => setSelectedId(null)}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          {stats.missingRows > 0 && (
            <div role="tablist" className="flex gap-4 border-b border-border text-sm">
              {(
                [
                  ["cards", "Cards"],
                  ["shopping", "Shopping list by store"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={view === key}
                  onClick={() => setView(key)}
                  className={`-mb-px border-b-2 pb-2 font-medium ${view === key ? "border-sun" : "border-transparent text-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {view === "shopping" && stats.missingRows > 0 ? (
            <ShoppingList
              groups={priceData.groups}
              plans={priceData.plans}
              stores={prices.stores}
              uncheckedNames={priceData.unchecked}
              checkUrlFor={(storeId, name) => checkUrl(prices.stores, storeId, name)}
              banner={<TcgphFullScan {...tcgph} variant="inline" />}
            />
          ) : (
            <>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div role="tablist" className="grid flex-1 grid-cols-4 gap-1 rounded-lg bg-surface-2 p-1 text-[15px]">
                  {(
                    [
                      // Counts are copies, matching the "X of Y cards owned" bar (8 Island = 8).
                      ["all", "All", stats.total],
                      ["owned", "Owned", stats.owned],
                      ["proxy", "Proxy", stats.proxied],
                      ["missing", "Missing", stats.total - stats.owned - stats.proxied],
                    ] as const
                  ).map(([key, label, n]) => (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={filter === key}
                      onClick={() => setFilter(key)}
                      className={`h-10 rounded-md font-medium ${filter === key ? "bg-surface shadow-sm" : "text-muted"}`}
                    >
                      {label} <span className="tabular text-muted">{n}</span>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Picker
                    label="View"
                    value={layout}
                    onChange={setLayout}
                    options={[
                      ["compact", "List"],
                      ["condensed", "Condensed"],
                      ["detailed", "Detailed"],
                      ["grid", "Grid"],
                      ["stacks", "Stacks"],
                      ["stacks-split", "Stacks (split)"],
                      ["spoiler", "Spoiler"],
                    ]}
                  />
                  <Picker
                    label="Group"
                    value={groupBy}
                    onChange={setGroupBy}
                    options={[
                      ["type", "Type"],
                      ["cmc", "Mana value"],
                      ["color", "Color"],
                      ["status", "Status"],
                    ]}
                  />
                  <Picker
                    label="Sort"
                    value={sortBy}
                    onChange={setSortBy}
                    options={[
                      ["name", "Name"],
                      ["cmc", "Mana value"],
                      ["price", "Price"],
                    ]}
                  />
                  <Toggle label="Prices" on={showPrices} onChange={setShowPrices} />
                  <Toggle label="Status colors" on={showStatus} onChange={setShowStatus} />
                </div>
              </div>

              {deck.cards.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-muted">
                  This deck is empty. Add cards above or import a decklist.
                </p>
              ) : groups.length === 0 ? (
                <p className="p-6 text-center text-muted">Nothing here with this filter.</p>
              ) : !LIST_LAYOUTS.includes(layout) ? (
                layout === "stacks" || layout === "stacks-split" ? (
                  <StacksView split={layout === "stacks-split"} {...visualProps} />
                ) : (
                  <GalleryView size={layout === "spoiler" ? "spoiler" : "grid"} {...visualProps} />
                )
              ) : (
                // Groups flow into side-by-side columns on wide screens.
                <div
                  className={`gap-4 md:columns-2 ${layout === "condensed" ? "xl:columns-3 2xl:columns-4" : "2xl:columns-3"}`}
                >
                  {groups.map((g) => (
                    <section key={g.key} className="mb-4 break-inside-avoid">
                      <h2 className="mb-1.5 flex items-baseline justify-between gap-2 px-1 text-base">
                        <span className="font-semibold">
                          {g.title} <span className="font-normal text-muted tabular">({g.copies})</span>
                        </span>
                        {showPrices && g.toBuy > 0 && (
                          <span className="text-sm text-muted tabular">{formatPhp(g.toBuy)} to buy</span>
                        )}
                      </h2>
                      {layout !== "detailed" ? (
                        <ul className="overflow-hidden rounded-xl border border-border bg-surface py-1">
                          {g.cards.map((c) => (
                            <CompactRow
                              key={c.id}
                              dc={c}
                              plan={priceData.byCard[c.id]?.plan}
                              checked={(priceData.byCard[c.id]?.status.checkedStores ?? 0) > 0}
                              showPrice={showPrices}
                              showStatus={showStatus}
                              condensed={layout === "condensed"}
                              selected={selectedId === c.id}
                              onSelect={() => select(c.id)}
                              onHover={(on) => setHoverId(on ? c.id : null)}
                              onPatch={(patch) => patchCard(c, patch)}
                            />
                          ))}
                        </ul>
                      ) : (
                        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                          {g.cards.map((c) => (
                            <CardRow
                              key={c.id}
                              dc={c}
                              price={priceData.byCard[c.id]}
                              stores={prices.stores}
                              running={prices.running}
                              showPrice={showPrices}
                              showStatus={showStatus}
                              onHover={(on) => setHoverId(on ? c.id : null)}
                              onPatch={(patch) => patchCard(c, patch)}
                              onRemove={() => removeCard(c)}
                            />
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Phones and tablets: the pinned card opens as a bottom sheet. */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSelectedId(null)}>
          <div
            role="dialog"
            aria-modal
            aria-label={selected.card.name}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-auto rounded-t-3xl bg-surface p-4"
          >
            <div className="mx-auto max-w-sm">
              <CardInspector
                dc={selected}
                pinned
                price={priceData.byCard[selected.id]}
                stores={prices.stores}
                running={prices.running}
                checkUrlFor={(storeId, name) => checkUrl(prices.stores, storeId, name)}
                onPatch={(patch) => patchCard(selected, patch)}
                onRemove={() => removeCard(selected)}
                onClose={() => setSelectedId(null)}
              />
            </div>
          </div>
        </div>
      )}

      {importing && <ImportDialog deckId={deck.id} onImported={setDeck} onClose={() => setImporting(false)} />}

      {toast && (
        <div
          role="status"
          className={`fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-lg px-4 py-3 text-sm shadow-lg ${
            toast.error ? "bg-danger text-white" : "bg-foreground text-background"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function DeckHeader({
  deck,
  onRename,
  onMarkAll,
  onCopyProxies,
  onDelete,
}: {
  deck: DeckView;
  onRename: (name: string) => void;
  onMarkAll: (owned: boolean) => void;
  onCopyProxies: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(deck.name);
  const [menu, setMenu] = useState(false);

  if (editing) {
    return (
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setEditing(false);
          if (name.trim() && name !== deck.name) onRename(name);
        }}
      >
        <input
          autoFocus
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-lg border border-accent bg-surface px-3 text-lg font-semibold outline-none"
        />
        <button className="h-11 rounded-lg bg-accent px-4 font-medium text-accent-fg">Save</button>
        <button
          type="button"
          onClick={() => {
            setName(deck.name);
            setEditing(false);
          }}
          className="h-11 px-2 text-muted"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="relative flex items-start gap-2">
      <h1 className="min-w-0 flex-1 break-words text-2xl font-semibold leading-tight">{deck.name}</h1>
      <button
        onClick={() => setMenu((m) => !m)}
        aria-label="Deck options"
        aria-expanded={menu}
        className="h-9 w-9 shrink-0 rounded-lg border border-border bg-surface text-lg leading-none"
      >
        ⋯
      </button>
      {menu && (
        <div
          className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-lg border border-border bg-surface text-sm shadow-lg"
          onClick={() => setMenu(false)}
        >
          <MenuItem onClick={() => setEditing(true)}>Rename deck</MenuItem>
          <MenuItem onClick={() => onMarkAll(true)}>Mark all owned</MenuItem>
          <MenuItem onClick={() => onMarkAll(false)}>Clear all owned</MenuItem>
          <MenuItem onClick={onCopyProxies}>Copy proxy list</MenuItem>
          <MenuItem onClick={onDelete} danger>
            Delete deck
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`block w-full px-3 py-2.5 text-left hover:bg-surface-2 ${danger ? "text-danger" : ""}`}
    >
      {children}
    </button>
  );
}

function CardRow({
  dc,
  price,
  stores,
  running,
  showPrice,
  showStatus,
  onHover,
  onPatch,
  onRemove,
}: {
  dc: DeckCardView;
  price: CardPrice | undefined;
  stores: StoreInfo[];
  running: boolean;
  showPrice: boolean;
  showStatus: boolean;
  onHover: (hovering: boolean) => void;
  onPatch: (patch: CardPatch) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const missing = isMissing(dc);
  const proxied = isProxied(dc);
  const fullyOwned = dc.ownedQty >= dc.quantity;
  const { card } = dc;
  const status = cardStatus(dc);

  return (
    <li onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}>
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          {card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.imageUrl.replace("/normal/", "/small/")}
              alt=""
              loading="lazy"
              className="h-12 w-[34px] shrink-0 rounded-sm object-cover"
            />
          ) : (
            <div className="h-12 w-[34px] shrink-0 rounded-sm bg-surface-2" />
          )}
          <div className="min-w-0">
            <div className="truncate font-medium">
              {dc.quantity > 1 && <span className="tabular text-muted">{dc.quantity}× </span>}
              {card.name}
              {proxied && dc.quantity > 1 && (
                <span className="ml-2 rounded bg-proxy/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-proxy">
                  Proxy {dc.quantity - dc.ownedQty}
                </span>
              )}
            </div>
            {missing && price && showPrice ? (
              <CardPriceLine plan={price.plan} status={price.status} stores={stores} running={running} />
            ) : (
              <div className="truncate text-xs text-muted">
                {card.setCode.toUpperCase()} #{card.collectorNumber}
                <span className="ml-2 inline-flex align-middle">
                  <ManaCost cost={card.manaCost} size={13} />
                </span>
              </div>
            )}
          </div>
        </button>

        {dc.quantity === 1 ? (
          <button
            onClick={() => onPatch(nextStatusPatch(dc))}
            title="Tap to switch: Missing → Owned → Proxy"
            aria-label={`${card.name}: ${status}. Tap to change.`}
            className={`h-9 w-[84px] shrink-0 rounded-full border text-sm font-medium ${
              !showStatus
                ? "border-border"
                : status === "missing"
                  ? "border-missing/50 text-missing"
                  : status === "owned"
                    ? "border-owned bg-owned/10 text-owned"
                    : "border-proxy bg-proxy/10 text-proxy"
            }`}
          >
            {status === "missing" ? "Missing" : status === "owned" ? "✓ Owned" : "Proxy"}
          </button>
        ) : (
          <div className="flex h-9 shrink-0 items-center rounded-full border border-border text-sm">
            <button
              onClick={() => onPatch({ ownedQty: Math.max(0, dc.ownedQty - 1) })}
              aria-label="One fewer owned"
              className="h-9 w-8 rounded-l-full"
            >
              −
            </button>
            <span
              className={`tabular w-10 text-center font-medium ${missing ? "text-missing" : proxied ? "text-proxy" : "text-owned"}`}
            >
              {dc.ownedQty}/{dc.quantity}
            </span>
            <button
              onClick={() => onPatch({ ownedQty: Math.min(dc.quantity, dc.ownedQty + 1) })}
              aria-label="One more owned"
              className="h-9 w-8 rounded-r-full"
            >
              +
            </button>
          </div>
        )}
      </div>

      {open && missing && price && (
        <div className="bg-surface-2/60 px-3 pt-2 text-sm">
          <ListingsPanel
            cardName={card.name}
            listings={price.listings}
            status={price.status}
            stores={stores}
            checkUrlFor={(storeId) => checkUrl(stores, storeId, card.name)}
          />
        </div>
      )}
      {open && (
        <div className="flex flex-wrap items-center gap-2 bg-surface-2/60 px-3 py-2 text-sm">
          <span className="text-muted">Copies needed</span>
          <div className="flex items-center rounded-lg border border-border bg-surface">
            <button
              onClick={() =>
                onPatch({
                  quantity: Math.max(1, dc.quantity - 1),
                  ownedQty: Math.min(dc.ownedQty, Math.max(1, dc.quantity - 1)),
                })
              }
              aria-label="Fewer copies"
              className="h-8 w-8"
            >
              −
            </button>
            <span className="tabular w-6 text-center">{dc.quantity}</span>
            <button
              onClick={() => onPatch({ quantity: Math.min(99, dc.quantity + 1) })}
              aria-label="More copies"
              className="h-8 w-8"
            >
              +
            </button>
          </div>
          {!fullyOwned && (
            <button
              onClick={() => onPatch({ proxy: !dc.proxy })}
              aria-pressed={dc.proxy}
              className={`h-8 rounded-lg border px-3 ${
                dc.proxy ? "border-proxy bg-proxy/10 text-proxy" : "border-border bg-surface"
              }`}
            >
              {dc.proxy ? "✓ Proxying" : dc.quantity > 1 ? "Proxy the rest" : "Proxy this card"}
            </button>
          )}
          <button
            onClick={() => onPatch({ isCommander: !dc.isCommander })}
            className="h-8 rounded-lg border border-border bg-surface px-3"
          >
            {dc.isCommander ? "Unset commander" : "Make commander"}
          </button>
          <button onClick={onRemove} className="ml-auto h-8 rounded-lg px-3 text-danger hover:bg-surface">
            Remove
          </button>
        </div>
      )}
    </li>
  );
}

function Picker<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <label className="flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface pl-3 pr-1">
      <span className="text-xs text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-full bg-transparent pr-1 font-medium outline-none"
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 hover:border-foreground/40"
    >
      <span className="text-xs text-muted">{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-sun" : "bg-surface-2 ring-1 ring-border"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left] ${on ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
      <span className="w-7 text-left font-medium">{on ? "On" : "Off"}</span>
    </button>
  );
}
