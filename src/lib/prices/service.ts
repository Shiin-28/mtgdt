import { db } from "@/lib/db";
import { normalizeName } from "@/lib/cards/normalize";
import { StoreError } from "@/lib/stores/http";
import type { Listing, StoreAdapter } from "@/lib/stores/types";
import type { FetchStatus, ListingView } from "./types";

export const PRICE_TTL_MS = 12 * 60 * 60 * 1000;

export const cardKey = (name: string) => normalizeName(name);

type DbListing = Awaited<ReturnType<typeof db.storeListing.findMany>>[number];

function toView(l: DbListing): ListingView {
  return {
    store: l.store,
    cardKey: l.cardKey,
    cardName: l.cardName,
    setCode: l.setCode,
    collectorNumber: l.collectorNumber,
    condition: l.condition as ListingView["condition"],
    foil: l.foil,
    pricePhp: l.pricePhp,
    quantity: l.quantity,
    inStock: l.inStock,
    url: l.url,
    fetchedAt: l.fetchedAt.toISOString(),
  };
}

/** Everything cached for these cards, fresh or not. */
export async function cachedPrices(cardKeys: string[]) {
  const [listings, fetches] = await Promise.all([
    db.storeListing.findMany({ where: { cardKey: { in: cardKeys } } }),
    db.storeFetch.findMany({ where: { cardKey: { in: cardKeys } } }),
  ]);
  return {
    listings: listings.map(toView),
    fetches: fetches.map(
      (f): FetchStatus => ({
        store: f.store,
        cardKey: f.cardKey,
        status: f.status as FetchStatus["status"],
        error: f.error,
        fetchedAt: f.fetchedAt.toISOString(),
      }),
    ),
  };
}

const g = globalThis as unknown as { __priceInflight?: Map<string, Promise<PriceResult>> };
const inflight = (g.__priceInflight ??= new Map());

export type PriceResult = { fetch: FetchStatus; listings: ListingView[]; fromCache: boolean };

/**
 * Listings for one card at one store: from the cache when it's younger than
 * 12 hours (unless `force`), otherwise fetched from the store. Never throws;
 * failures come back as status "error".
 */
export function pricesFor(store: StoreAdapter, cardName: string, force: boolean): Promise<PriceResult> {
  const key = cardKey(cardName);
  const id = `${store.id}|${key}`;
  const running = inflight.get(id);
  if (running) return running;
  const p = load(store, cardName, key, force).finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

async function load(store: StoreAdapter, cardName: string, key: string, force: boolean): Promise<PriceResult> {
  if (!force) {
    const prev = await db.storeFetch.findUnique({ where: { store_cardKey: { store: store.id, cardKey: key } } });
    if (prev && prev.status === "ok" && Date.now() - prev.fetchedAt.getTime() < PRICE_TTL_MS) {
      const listings = await db.storeListing.findMany({ where: { store: store.id, cardKey: key } });
      return {
        fetch: { store: store.id, cardKey: key, status: "ok", error: null, fetchedAt: prev.fetchedAt.toISOString() },
        listings: listings.map(toView),
        fromCache: true,
      };
    }
  }

  const fetchedAt = new Date();
  let found: Listing[];
  try {
    found = await store.searchCard(cardName);
  } catch (e) {
    const error = e instanceof StoreError ? e.message : "Unexpected error reading this store";
    if (!(e instanceof StoreError)) console.error(`[prices] ${store.id} "${cardName}"`, e);
    await db.storeFetch.upsert({
      where: { store_cardKey: { store: store.id, cardKey: key } },
      create: { store: store.id, cardKey: key, status: "error", error, fetchedAt },
      update: { status: "error", error, fetchedAt },
    });
    // Keep showing whatever we had before the failure.
    const old = await db.storeListing.findMany({ where: { store: store.id, cardKey: key } });
    return {
      fetch: { store: store.id, cardKey: key, status: "error", error, fetchedAt: fetchedAt.toISOString() },
      listings: old.map(toView),
      fromCache: false,
    };
  }

  // A ₱0 price is a placeholder product, not a real offer.
  const rows = found.filter((l) => l.pricePhp === null || l.pricePhp > 0).map((l) => ({
    store: store.id,
    cardKey: key,
    cardName: l.cardName,
    setCode: l.setCode ?? null,
    collectorNumber: l.collectorNumber ?? null,
    condition: l.condition,
    foil: l.foil,
    pricePhp: l.pricePhp,
    quantity: l.quantity,
    inStock: l.inStock,
    url: l.url,
    fetchedAt,
  }));
  await db.$transaction([
    db.storeListing.deleteMany({ where: { store: store.id, cardKey: key } }),
    db.storeListing.createMany({ data: rows }),
    db.storeFetch.upsert({
      where: { store_cardKey: { store: store.id, cardKey: key } },
      create: { store: store.id, cardKey: key, status: "ok", fetchedAt },
      update: { status: "ok", error: null, fetchedAt },
    }),
  ]);
  const saved = await db.storeListing.findMany({ where: { store: store.id, cardKey: key } });
  return {
    fetch: { store: store.id, cardKey: key, status: "ok", error: null, fetchedAt: fetchedAt.toISOString() },
    listings: saved.map(toView),
    fromCache: false,
  };
}
