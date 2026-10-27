import { TYPE_GROUPS, typeGroup } from "./types";
import { cardStatus } from "./status";

export type GroupBy = "type" | "cmc" | "color" | "status";
export type SortBy = "name" | "cmc" | "price";

/** The fields grouping and sorting look at. */
export type GroupableCard = {
  id: string;
  quantity: number;
  ownedQty: number;
  proxy: boolean;
  isCommander: boolean;
  card: { name: string; typeLine: string; cmc: number; colorIdentity: string };
};

export type CardGroup<T> = { key: string; title: string; cards: T[] };

const COLOR_NAMES: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };
const COLOR_ORDER = ["White", "Blue", "Black", "Red", "Green", "Multicolor", "Colorless"];
const TYPE_TITLES: Record<string, string> = { Sorcery: "Sorceries", Other: "Other" };

function bucket(c: GroupableCard, by: GroupBy): string {
  switch (by) {
    case "type":
      return typeGroup(c.card.typeLine);
    case "cmc": {
      if (typeGroup(c.card.typeLine) === "Land") return "Lands";
      const mv = Math.floor(c.card.cmc);
      return mv >= 7 ? "7+" : String(mv);
    }
    case "color": {
      const ci = c.card.colorIdentity;
      return ci.length === 0 ? "Colorless" : ci.length > 1 ? "Multicolor" : (COLOR_NAMES[ci] ?? "Colorless");
    }
    case "status":
      return cardStatus(c);
  }
}

function order(by: GroupBy): string[] {
  switch (by) {
    case "type":
      return [...TYPE_GROUPS];
    case "cmc":
      return ["0", "1", "2", "3", "4", "5", "6", "7+", "Lands"];
    case "color":
      return COLOR_ORDER;
    case "status":
      return ["missing", "proxy", "owned"];
  }
}

function title(by: GroupBy, key: string): string {
  if (by === "type") return TYPE_TITLES[key] ?? `${key}s`;
  if (by === "cmc") return key === "Lands" ? "Lands" : `Mana value ${key}`;
  if (by === "status") return { missing: "To buy", proxy: "Proxy", owned: "Owned" }[key] ?? key;
  return key;
}

/**
 * Group and sort deck cards for display. Commanders get their own first group
 * except when grouping by status. `priceOf` gives a card's cheapest unit price
 * (null when unknown); price sorting puts the most expensive first.
 */
export function groupCards<T extends GroupableCard>(
  cards: T[],
  groupBy: GroupBy,
  sortBy: SortBy,
  priceOf: (c: T) => number | null = () => null,
): CardGroup<T>[] {
  const byName = (a: T, b: T) => a.card.name.localeCompare(b.card.name);
  const compare: Record<SortBy, (a: T, b: T) => number> = {
    name: byName,
    cmc: (a, b) => a.card.cmc - b.card.cmc || byName(a, b),
    price: (a, b) => (priceOf(b) ?? -1) - (priceOf(a) ?? -1) || byName(a, b),
  };

  const groups: CardGroup<T>[] = [];
  const pinCommanders = groupBy !== "status";
  const commanders = pinCommanders ? cards.filter((c) => c.isCommander) : [];
  if (commanders.length)
    groups.push({ key: "commander", title: "Commander", cards: [...commanders].sort(compare[sortBy]) });

  const rest = pinCommanders ? cards.filter((c) => !c.isCommander) : cards;
  const buckets = new Map<string, T[]>();
  for (const c of rest) {
    const k = bucket(c, groupBy);
    buckets.set(k, [...(buckets.get(k) ?? []), c]);
  }
  for (const k of order(groupBy)) {
    const list = buckets.get(k);
    if (list?.length) groups.push({ key: k, title: title(groupBy, k), cards: list.sort(compare[sortBy]) });
  }
  return groups;
}
