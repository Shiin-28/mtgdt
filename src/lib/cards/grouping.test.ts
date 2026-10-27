import { describe, expect, it } from "vitest";
import { groupCards, type GroupableCard } from "./grouping";

let n = 0;
function card(name: string, typeLine: string, cmc: number, colorIdentity: string, extra: Partial<GroupableCard> = {}) {
  return {
    id: String(n++),
    quantity: 1,
    ownedQty: 0,
    proxy: false,
    isCommander: false,
    card: { name, typeLine, cmc, colorIdentity },
    ...extra,
  } satisfies GroupableCard;
}

const azula = card("Fire Lord Azula", "Legendary Creature — Human Noble", 4, "UBR", { isCommander: true });
const bolt = card("Lightning Bolt", "Instant", 1, "R", { ownedQty: 1 });
const rift = card("Cyclonic Rift", "Instant", 2, "U", { proxy: true });
const ring = card("Sol Ring", "Artifact", 1, "");
const reef = card("Shivan Reef", "Land", 0, "UR");
const gearhulk = card("Torrential Gearhulk", "Artifact Creature — Construct", 6, "U");
const big = card("Expensive Thing", "Sorcery", 8, "B");
const deck = [bolt, rift, ring, reef, gearhulk, azula, big];

const titles = (gs: { title: string }[]) => gs.map((g) => g.title);

describe("groupCards", () => {
  it("groups by type with commanders first", () => {
    const gs = groupCards(deck, "type", "name");
    expect(titles(gs)).toEqual(["Commander", "Creatures", "Instants", "Sorceries", "Artifacts", "Lands"]);
    expect(gs[2].cards.map((c) => c.card.name)).toEqual(["Cyclonic Rift", "Lightning Bolt"]);
  });

  it("groups by mana value, with lands apart and 7+ together", () => {
    const gs = groupCards(deck, "cmc", "name");
    expect(titles(gs)).toEqual(["Commander", "Mana value 1", "Mana value 2", "Mana value 6", "Mana value 7+", "Lands"]);
  });

  it("groups by color identity", () => {
    expect(titles(groupCards(deck, "color", "name"))).toEqual([
      "Commander",
      "Blue",
      "Black",
      "Red",
      "Multicolor",
      "Colorless",
    ]);
  });

  it("groups by status without pinning the commander", () => {
    const gs = groupCards(deck, "status", "name");
    expect(titles(gs)).toEqual(["To buy", "Proxy", "Owned"]);
    expect(gs[0].cards.map((c) => c.card.name)).toContain("Fire Lord Azula");
  });

  it("sorts by price, most expensive first, unknown prices last", () => {
    const prices: Record<string, number> = { "Sol Ring": 100, "Cyclonic Rift": 2000, "Lightning Bolt": 120 };
    const gs = groupCards(deck, "status", "price", (c) => prices[c.card.name] ?? null);
    expect(gs[0].cards.map((c) => c.card.name)).toEqual([
      "Sol Ring",
      "Expensive Thing",
      "Fire Lord Azula",
      "Shivan Reef",
      "Torrential Gearhulk",
    ]);
  });

  it("sorts by mana value then name", () => {
    const gs = groupCards(deck, "type", "cmc");
    expect(gs.find((g) => g.title === "Artifacts")!.cards.map((c) => c.card.name)).toEqual(["Sol Ring"]);
    expect(gs.find((g) => g.title === "Instants")!.cards.map((c) => c.card.name)).toEqual([
      "Lightning Bolt",
      "Cyclonic Rift",
    ]);
  });
});
