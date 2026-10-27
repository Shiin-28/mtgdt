import { frontFace } from "@/lib/cards/normalize";
import { setCodesByName } from "@/lib/scryfall/client";
import { storeJson } from "./http";
import { isNonSingle, parseFoil, titleBaseName, titleMatchesCard } from "./matching";
import type { Listing, StoreAdapter } from "./types";

const ID = "staxx";
const BASE = "https://staxxph.com";
/** Variation requests per card (only needed for the stock count). */
const MAX_DETAILS = 4;

type StoreApiProduct = {
  id: number;
  name: string;
  permalink: string;
  is_in_stock: boolean;
  prices: { price: string; currency_minor_unit: number };
  categories: { name: string }[];
  variations: { id: number }[];
  stock_availability?: { text: string };
};

function stockCount(text: string | undefined): number | null {
  const m = text?.match(/(\d+)\s+in stock/i);
  return m ? Number(m[1]) : null;
}

export const staxx: StoreAdapter = {
  id: ID,
  name: "Staxx Cards & Hobbies",
  homepage: BASE,
  support: "supported",
  note: "Condition isn't listed on Staxx",
  checkUrl: (name) => `${BASE}/?s=${encodeURIComponent(frontFace(name))}&post_type=product`,

  async searchCard(cardName) {
    const q = encodeURIComponent(frontFace(cardName));
    const products = await storeJson<StoreApiProduct[]>(
      ID,
      `${BASE}/wp-json/wc/store/v1/products?search=${q}&per_page=50&orderby=price&order=asc`,
    );
    const matches = products.filter(
      (p) => p.is_in_stock && titleMatchesCard(p.name, cardName) && !isNonSingle(titleBaseName(p.name), cardName),
    );
    const sets = await setCodesByName().catch(() => new Map<string, string>());

    const listings: Listing[] = [];
    for (const [i, p] of matches.entries()) {
      let quantity = stockCount(p.stock_availability?.text);
      if (quantity === null && i < MAX_DETAILS && p.variations[0]) {
        const v = await storeJson<StoreApiProduct>(ID, `${BASE}/wp-json/wc/store/v1/products/${p.variations[0].id}`);
        quantity = stockCount(v.stock_availability?.text);
      }
      const setName = p.categories[0]?.name ?? "";
      const collector = p.name.match(/Collector No\.\s*([^<\s]+)/i)?.[1];
      listings.push({
        store: ID,
        cardName: [titleBaseName(p.name), setName].filter(Boolean).join(" – "),
        setCode: sets.get(setName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()),
        collectorNumber: collector,
        condition: "UNKNOWN",
        foil: parseFoil(p.name),
        pricePhp: Number(p.prices.price) / 10 ** p.prices.currency_minor_unit,
        quantity,
        inStock: true,
        url: p.permalink,
        fetchedAt: new Date(),
      });
    }
    return listings;
  },
};
