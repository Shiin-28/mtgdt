import type { DeckCardView } from "@/lib/decks";

export type CardStatus = "owned" | "proxy" | "missing";

export type CardPatch = Partial<Pick<DeckCardView, "ownedQty" | "quantity" | "isCommander" | "proxy">>;

type Counts = Pick<DeckCardView, "ownedQty" | "quantity" | "proxy">;

/** Still to buy: not fully owned and not marked as a proxy. */
export const isMissing = (c: Counts) => c.ownedQty < c.quantity && !c.proxy;

/** Not fully owned, and the rest will be proxied instead of bought. */
export const isProxied = (c: Counts) => c.ownedQty < c.quantity && c.proxy;

export function cardStatus(c: Counts): CardStatus {
  return c.ownedQty >= c.quantity ? "owned" : c.proxy ? "proxy" : "missing";
}

/** What a tap on a single card's status does: Missing → Owned → Proxy → Missing. */
export function nextStatusPatch(c: Counts): CardPatch {
  const status = cardStatus(c);
  if (c.quantity > 1) {
    // Multi-copy cards: toggle between all owned and none owned.
    return status === "owned" ? { ownedQty: 0 } : { ownedQty: c.quantity, proxy: false };
  }
  return status === "missing"
    ? { ownedQty: 1, proxy: false }
    : status === "owned"
      ? { ownedQty: 0, proxy: true }
      : { ownedQty: 0, proxy: false };
}

export const STATUS_LABEL: Record<CardStatus, string> = { owned: "Owned", proxy: "Proxy", missing: "Missing" };
