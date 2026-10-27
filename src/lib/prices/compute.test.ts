import { describe, expect, it } from "vitest";
import { planCard, shoppingList } from "./compute";
import type { ListingView } from "./types";

function listing(p: Partial<ListingView>): ListingView {
  return {
    store: "a",
    cardKey: "sol ring",
    cardName: "Sol Ring",
    setCode: null,
    collectorNumber: null,
    condition: "NM",
    foil: false,
    pricePhp: 100,
    quantity: 1,
    inStock: true,
    url: "https://example.test",
    fetchedAt: "2026-10-27T00:00:00Z",
    ...p,
  };
}

const prefs = { preferNonfoil: false, ignoreDamaged: false };

describe("planCard", () => {
  it("picks the cheapest in-stock listing", () => {
    const plan = planCard("sol ring", "Sol Ring", 1, [
      listing({ store: "a", pricePhp: 200 }),
      listing({ store: "b", pricePhp: 120 }),
      listing({ store: "c", pricePhp: 50, inStock: false }),
    ], prefs);
    expect(plan.allocations.map((a) => a.listing.store)).toEqual(["b"]);
    expect(plan.cost).toBe(120);
  });

  it("spreads a multi-copy need across listings by quantity", () => {
    const plan = planCard("island", "Island", 5, [
      listing({ store: "a", pricePhp: 10, quantity: 2 }),
      listing({ store: "b", pricePhp: 15, quantity: 10 }),
    ], prefs);
    expect(plan.allocations.map((a) => [a.listing.store, a.qty])).toEqual([["a", 2], ["b", 3]]);
    expect(plan.cost).toBe(65);
    expect(plan.unfilled).toBe(0);
  });

  it("reports copies nobody has", () => {
    const plan = planCard("x", "X", 3, [listing({ quantity: 1 })], prefs);
    expect(plan.unfilled).toBe(2);
    expect(planCard("x", "X", 1, [], prefs).unfilled).toBe(1);
  });

  it("prefers nonfoil when asked, falling back to foil", () => {
    const ls = [listing({ store: "foil", foil: true, pricePhp: 80 }), listing({ store: "nonfoil", pricePhp: 150 })];
    expect(planCard("x", "X", 1, ls, prefs).allocations[0].listing.store).toBe("foil");
    expect(planCard("x", "X", 1, ls, { ...prefs, preferNonfoil: true }).allocations[0].listing.store).toBe("nonfoil");
    expect(planCard("x", "X", 1, [ls[0]], { ...prefs, preferNonfoil: true }).allocations[0].listing.store).toBe("foil");
  });

  it("ignores HP and damaged copies when asked", () => {
    const ls = [listing({ store: "hp", condition: "HP", pricePhp: 30 }), listing({ store: "nm", pricePhp: 90 })];
    expect(planCard("x", "X", 1, ls, { ...prefs, ignoreDamaged: true }).allocations[0].listing.store).toBe("nm");
  });

  it("flags cards only available with a price shown on the store", () => {
    const plan = planCard("x", "X", 1, [listing({ pricePhp: null })], prefs);
    expect(plan.allocations).toEqual([]);
    expect(plan.priceOnStoreOnly).toBe(true);
  });
});

describe("shoppingList", () => {
  it("groups allocations by store with subtotals", () => {
    const plans = [
      planCard("a", "A", 1, [listing({ store: "s1", pricePhp: 100 })], prefs),
      planCard("b", "B", 2, [listing({ store: "s1", pricePhp: 50, quantity: 5 })], prefs),
      planCard("c", "C", 1, [listing({ store: "s2", pricePhp: 30 })], prefs),
    ];
    const groups = shoppingList(plans);
    expect(groups.map((g) => [g.store, g.items.length, g.subtotal])).toEqual([
      ["s1", 2, 200],
      ["s2", 1, 30],
    ]);
  });
});
