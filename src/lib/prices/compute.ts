import type { ListingView } from "./types";

export type PricePrefs = { preferNonfoil: boolean; ignoreDamaged: boolean };

export type Allocation = { listing: ListingView; qty: number };

export type CardPlan = {
  cardKey: string;
  name: string;
  need: number;
  allocations: Allocation[]; // cheapest copies we can buy, possibly from several stores
  unfilled: number; // copies nobody has (with a price)
  cost: number;
  /** In stock somewhere, but only with a price shown on the store's site. */
  priceOnStoreOnly: boolean;
};

/** In-stock listings that pass the user's filters, cheapest first. */
export function usableListings(listings: ListingView[], prefs: PricePrefs): ListingView[] {
  return listings
    .filter((l) => l.inStock && l.pricePhp !== null)
    .filter((l) => !prefs.ignoreDamaged || (l.condition !== "HP" && l.condition !== "DMG"))
    .sort((a, b) => a.pricePhp! - b.pricePhp! || Number(a.foil) - Number(b.foil));
}

/**
 * Pick the cheapest copies to cover `need`. With preferNonfoil, nonfoil copies
 * are used first and foils only fill what's left.
 */
export function planCard(
  cardKey: string,
  name: string,
  need: number,
  listings: ListingView[],
  prefs: PricePrefs,
): CardPlan {
  const usable = usableListings(listings, prefs);
  const ordered = prefs.preferNonfoil
    ? [...usable.filter((l) => !l.foil), ...usable.filter((l) => l.foil)]
    : usable;

  const allocations: Allocation[] = [];
  let left = need;
  for (const listing of ordered) {
    if (left <= 0) break;
    const qty = Math.min(left, listing.quantity ?? left); // unknown count: assume enough
    allocations.push({ listing, qty });
    left -= qty;
  }
  const priceOnStoreOnly =
    allocations.length === 0 && listings.some((l) => l.inStock && l.pricePhp === null);
  return {
    cardKey,
    name,
    need,
    allocations,
    unfilled: left,
    cost: allocations.reduce((sum, a) => sum + a.qty * a.listing.pricePhp!, 0),
    priceOnStoreOnly,
  };
}

export type StoreGroup = {
  store: string;
  items: { plan: CardPlan; allocation: Allocation }[];
  subtotal: number;
};

/** Group every allocation by store, cheapest store total first. */
export function shoppingList(plans: CardPlan[]): StoreGroup[] {
  const groups = new Map<string, StoreGroup>();
  for (const plan of plans) {
    for (const allocation of plan.allocations) {
      const store = allocation.listing.store;
      let grp = groups.get(store);
      if (!grp) groups.set(store, (grp = { store, items: [], subtotal: 0 }));
      grp.items.push({ plan, allocation });
      grp.subtotal += allocation.qty * allocation.listing.pricePhp!;
    }
  }
  return [...groups.values()].sort((a, b) => b.items.length - a.items.length || a.subtotal - b.subtotal);
}
