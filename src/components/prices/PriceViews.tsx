"use client";

import type { CardPlan, PricePrefs, StoreGroup } from "@/lib/prices/compute";
import type { FetchStatus, ListingView } from "@/lib/prices/types";
import type { StoreInfo } from "@/lib/stores/types";
import { formatPhp, timeAgo } from "@/lib/format";
import { tcgphSearchUrl } from "@/lib/tcgph";

export type CardPriceStatus = {
  checkedStores: number;
  totalStores: number;
  lastChecked: string | null;
  errors: FetchStatus[];
};

export function storeName(stores: StoreInfo[], id: string) {
  return stores.find((s) => s.id === id)?.name ?? id;
}

function finishLabel(l: ListingView) {
  return l.foil ? "Foil" : "Nonfoil";
}

function conditionLabel(l: ListingView) {
  return l.condition === "UNKNOWN" ? "Cond. not listed" : l.condition;
}

/** One-line summary under a missing card: cheapest copy or status. */
export function CardPriceLine({
  plan,
  status,
  stores,
  running,
}: {
  plan: CardPlan | undefined;
  status: CardPriceStatus;
  stores: StoreInfo[];
  running: boolean;
}) {
  if (status.checkedStores === 0) {
    return <div className="text-xs text-muted">{running ? "Checking stores…" : "Prices not checked yet"}</div>;
  }
  const best = plan?.allocations[0]?.listing;
  const stillChecking = running && status.checkedStores < status.totalStores;
  if (!best) {
    return (
      <div className="text-xs">
        <span className={plan?.priceOnStoreOnly ? "text-muted" : "font-medium text-danger"}>
          {plan?.priceOnStoreOnly ? "In stock — price shown on store" : "Out of stock everywhere"}
        </span>
        {stillChecking && <span className="text-muted"> · checking…</span>}
      </div>
    );
  }
  return (
    <div className="truncate text-xs">
      <span className="tabular font-semibold text-foreground">{formatPhp(best.pricePhp!)}</span>
      <span className="text-muted">
        {" "}
        · {storeName(stores, best.store)} · {conditionLabel(best)} · {finishLabel(best)}
        {best.quantity !== null && ` · ${best.quantity} left`}
        {stillChecking ? " · checking…" : status.lastChecked && ` · ${timeAgo(status.lastChecked)}`}
      </span>
    </div>
  );
}

/** Every store's listings for one card, cheapest first, plus store statuses. */
export function ListingsPanel({
  cardName,
  listings,
  status,
  stores,
  checkUrlFor,
}: {
  cardName: string;
  listings: ListingView[];
  status: CardPriceStatus;
  stores: StoreInfo[];
  checkUrlFor: (storeId: string) => string;
}) {
  const inStock = listings.filter((l) => l.inStock).sort((a, b) => (a.pricePhp ?? Infinity) - (b.pricePhp ?? Infinity));
  const unsupported = stores.filter((s) => s.support === "unsupported");

  return (
    <div className="space-y-2">
      {inStock.length === 0 ? (
        <p className="text-muted">
          {status.checkedStores ? "No store we check has this card in stock." : "Prices haven't been checked yet."}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {inStock.map((l, i) => (
            <li key={`${l.url}-${i}`}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{storeName(stores, l.store)}</div>
                  <div className="truncate text-xs text-muted">
                    {conditionLabel(l)} · {finishLabel(l)}
                    {l.quantity !== null && ` · ${l.quantity} in stock`}
                    {l.setCode && ` · ${l.setCode.toUpperCase()}${l.collectorNumber ? ` #${l.collectorNumber}` : ""}`}
                  </div>
                  <div className="truncate text-xs text-muted">{l.cardName}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="tabular font-semibold">
                    {l.pricePhp !== null ? formatPhp(l.pricePhp) : "See store"}
                  </div>
                  <div className="text-xs text-muted">{timeAgo(l.fetchedAt)}</div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
      {status.errors.length > 0 && (
        <ul className="text-xs text-danger">
          {status.errors.map((e) => (
            <li key={e.store}>
              {storeName(stores, e.store)}: {e.error} —{" "}
              <a className="underline" href={checkUrlFor(e.store)} target="_blank" rel="noopener noreferrer">
                check on store
              </a>
            </li>
          ))}
        </ul>
      )}
      {unsupported.length > 0 && (
        <p className="text-xs text-muted">
          Not checked automatically:{" "}
          {unsupported.map((s, i) => (
            <span key={s.id}>
              {i > 0 && " · "}
              <a
                className="underline"
                href={checkUrlFor(s.id)}
                target="_blank"
                rel="noopener noreferrer"
                title={s.note}
              >
                {s.name}
              </a>
            </span>
          ))}
          <span className="sr-only"> for {cardName}</span>
        </p>
      )}
      <p className="text-xs">
        <a
          className="font-medium text-accent underline"
          href={tcgphSearchUrl(cardName)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Search every PH store on TCGph ↗
        </a>
      </p>
    </div>
  );
}

/** Deck-level price summary, preferences and refresh controls. */
export function PriceSummary({
  plans,
  missingCount,
  uncheckedCount,
  prefs,
  onPrefs,
  running,
  stopped,
  progress,
  error,
  stores,
  storeErrors,
  onRefresh,
  onStop,
  footer,
}: {
  plans: CardPlan[];
  missingCount: number;
  uncheckedCount: number;
  prefs: PricePrefs;
  onPrefs: (p: Partial<PricePrefs>) => void;
  running: boolean;
  stopped: boolean;
  progress: { done: number; total: number };
  error: string | null;
  stores: StoreInfo[];
  storeErrors: Record<string, string>;
  onRefresh: (force: boolean) => void;
  onStop: () => void;
  /** Extra content at the bottom of the card (the TCGph full scan). */
  footer?: React.ReactNode;
}) {
  const total = plans.reduce((n, p) => n + p.cost, 0);
  const outOfStock = plans.filter((p) => p.allocations.length === 0 && !p.priceOnStoreOnly).length;
  const storeOnly = plans.filter((p) => p.priceOnStoreOnly).length;
  const partial = plans.filter((p) => p.allocations.length > 0 && p.unfilled > 0).length;
  const priced = plans.filter((p) => p.allocations.length > 0).length;

  if (missingCount === 0) return null;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Cost to complete</div>
          <div className="tabular text-2xl font-semibold">{formatPhp(total)}</div>
          <div className="text-xs text-muted">
            {priced} of {missingCount} missing cards priced
            {outOfStock > 0 && (
              <>
                {" "}
                · <span className="text-danger">{outOfStock} out of stock everywhere</span>
              </>
            )}
            {storeOnly > 0 && <> · {storeOnly} price on store only</>}
            {partial > 0 && <> · {partial} not enough copies</>}
          </div>
        </div>
        {running ? (
          <button
            onClick={onStop}
            className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-danger/50 px-3 text-sm font-medium text-danger hover:bg-danger/10"
          >
            <span className="h-2.5 w-2.5 rounded-[2px] bg-current" aria-hidden />
            Stop checking
          </button>
        ) : (
          <button
            onClick={() => onRefresh(true)}
            className="h-9 shrink-0 rounded-lg border border-border px-3 text-sm font-medium hover:border-foreground/40"
          >
            Refresh prices
          </button>
        )}
      </div>

      {running && progress.total > 0 && (
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-muted tabular">
            Checked {progress.done} of {progress.total} store lookups — results appear as each store answers
          </div>
        </div>
      )}
      {!running && stopped && progress.total > 0 && (
        <p className="text-xs text-muted tabular">
          Stopped after {progress.done} of {progress.total} store lookups. Prices found so far are saved.
        </p>
      )}
      {!running && (stopped || uncheckedCount > 0) && (
        // Skips anything checked in the last 12 hours, so this resumes where a stop left off.
        <button onClick={() => onRefresh(false)} className="text-sm font-medium text-accent">
          {stopped
            ? "Resume checking"
            : `Check prices for ${uncheckedCount} new missing ${uncheckedCount === 1 ? "card" : "cards"}`}
        </button>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={prefs.preferNonfoil}
            onChange={(e) => onPrefs({ preferNonfoil: e.target.checked })}
          />
          Prefer nonfoil
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={prefs.ignoreDamaged}
            onChange={(e) => onPrefs({ ignoreDamaged: e.target.checked })}
          />
          Ignore HP / damaged
        </label>
      </div>

      <details className="text-xs text-muted">
        <summary className="cursor-pointer">
          Stores ({stores.filter((s) => s.support !== "unsupported").length} checked automatically)
        </summary>
        <ul className="mt-2 space-y-1">
          {stores.map((s) => (
            <li key={s.id} className="flex gap-2">
              <span className={s.support === "unsupported" ? "" : storeErrors[s.id] ? "text-danger" : "text-owned"}>
                {s.support === "unsupported" ? "—" : storeErrors[s.id] ? "!" : "✓"}
              </span>
              <span>
                <a href={s.homepage} target="_blank" rel="noopener noreferrer" className="underline">
                  {s.name}
                </a>
                {s.note && ` — ${s.note}`}
                {storeErrors[s.id] && <span className="text-danger"> — {storeErrors[s.id]}</span>}
              </span>
            </li>
          ))}
        </ul>
      </details>
      {footer}
    </section>
  );
}

/** Missing cards grouped by the store with the cheapest copy. */
export function ShoppingList({
  groups,
  plans,
  stores,
  uncheckedNames,
  checkUrlFor,
  banner,
}: {
  groups: StoreGroup[];
  plans: CardPlan[];
  stores: StoreInfo[];
  uncheckedNames: string[];
  checkUrlFor: (storeId: string, cardName: string) => string;
  /** Shown above the store groups (the TCGph full scan). */
  banner?: React.ReactNode;
}) {
  const outOfStock = plans.filter((p) => p.allocations.length === 0 && !p.priceOnStoreOnly);
  const storeOnly = plans.filter((p) => p.priceOnStoreOnly);
  const short = plans.filter((p) => p.allocations.length > 0 && p.unfilled > 0);
  const unsupported = stores.filter((s) => s.support === "unsupported");

  if (!plans.length && !uncheckedNames.length) {
    return <p className="p-6 text-center text-muted">Nothing to buy — you own every card in this deck.</p>;
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      {banner && <div className="xl:col-span-2">{banner}</div>}
      {groups.map((g) => (
        <section key={g.store} className="overflow-hidden rounded-xl border border-border bg-surface">
          <h2 className="flex items-baseline justify-between border-b border-border bg-surface-2/60 px-3 py-2">
            <span className="font-semibold">{storeName(stores, g.store)}</span>
            <span className="tabular text-sm">
              {g.items.length} {g.items.length === 1 ? "card" : "cards"} · <b>{formatPhp(g.subtotal)}</b>
            </span>
          </h2>
          <ul className="divide-y divide-border">
            {g.items.map(({ plan, allocation: a }, i) => (
              <li key={`${plan.cardKey}-${i}`}>
                <a
                  href={a.listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                      {a.qty > 1 && <span className="tabular text-muted">{a.qty}× </span>}
                      {plan.name}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {conditionLabel(a.listing)} · {finishLabel(a.listing)} · {a.listing.cardName}
                    </div>
                  </div>
                  <div className="tabular shrink-0 font-medium">{formatPhp(a.qty * a.listing.pricePhp!)}</div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {storeOnly.length > 0 && (
        <NamedList title="In stock — price shown on store" tone="muted">
          {storeOnly.map((p) => (
            <li key={p.cardKey}>{p.name}</li>
          ))}
        </NamedList>
      )}
      {short.length > 0 && (
        <NamedList title="Not enough copies in stock" tone="muted">
          {short.map((p) => (
            <li key={p.cardKey}>
              {p.name} — still need {p.unfilled}
            </li>
          ))}
        </NamedList>
      )}
      {outOfStock.length > 0 && (
        <NamedList title="Out of stock everywhere" tone="danger">
          {outOfStock.map((p) => (
            <li key={p.cardKey}>
              {p.name}
              <span className="text-muted">
                {" "}
                — try{" "}
                <a className="underline" href={tcgphSearchUrl(p.name)} target="_blank" rel="noopener noreferrer">
                  TCGph
                </a>
              </span>
              {unsupported.length > 0 && (
                <span className="text-muted">
                  {", "}
                  {unsupported.map((s, i) => (
                    <span key={s.id}>
                      {i > 0 && ", "}
                      <a
                        className="underline"
                        href={checkUrlFor(s.id, p.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {s.name}
                      </a>
                    </span>
                  ))}
                </span>
              )}
            </li>
          ))}
        </NamedList>
      )}
      {uncheckedNames.length > 0 && (
        <NamedList title="Prices not checked yet" tone="muted">
          {uncheckedNames.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </NamedList>
      )}
    </div>
  );
}

function NamedList({ title, tone, children }: { title: string; tone: "muted" | "danger"; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-3">
      <h2 className={`mb-1 text-sm font-semibold ${tone === "danger" ? "text-danger" : "text-muted"}`}>{title}</h2>
      <ul className="space-y-1 text-sm">{children}</ul>
    </section>
  );
}
