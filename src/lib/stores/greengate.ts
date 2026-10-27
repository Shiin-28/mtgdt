import { frontFace } from "@/lib/cards/normalize";
import { storeJson } from "./http";
import { isNonSingle, parseCondition, parseFoil, titleMatchesCard } from "./matching";
import type { Listing, StoreAdapter } from "./types";

const ID = "greengate";
const BASE = "https://shop.greengatehobbies.com";
/** Product detail requests per card; suggest.json prices include sold-out copies. */
const MAX_PRODUCTS = 4;

type SuggestProduct = { title: string; handle: string; price: string; available: boolean; type: string; url: string };
type ProductJs = {
  title: string;
  handle: string;
  options: { name: string; position: number }[];
  variants: { id: number; price: number; available: boolean; option1: string | null; title: string }[];
};

// "Sol Ring (MSC) #213 [EN/N]"
function parseTitle(title: string) {
  const m = title.match(/\(([A-Z0-9]+)\)\s*#(\S+)\s*\[([A-Z]{2})\s*\/\s*([A-Z])\]/i);
  return m
    ? { setCode: m[1].toLowerCase(), collectorNumber: m[2], language: m[3].toUpperCase() }
    : { language: undefined };
}

export const greengate: StoreAdapter = {
  id: ID,
  name: "Green Gate Hobbies",
  homepage: BASE,
  support: "supported",
  checkUrl: (name) => `${BASE}/search?q=${encodeURIComponent(frontFace(name))}&type=product`,

  async searchCard(cardName) {
    const q = encodeURIComponent(frontFace(cardName));
    const suggest = await storeJson<{ resources: { results: { products: SuggestProduct[] } } }>(
      ID,
      `${BASE}/search/suggest.json?q=${q}&resources[type]=product&resources[limit]=10`,
    );

    const candidates = suggest.resources.results.products
      .filter((p) => p.type === "MTG Singles" && p.available)
      .filter((p) => titleMatchesCard(p.title, cardName) && !isNonSingle(p.title, cardName))
      .filter((p) => (parseTitle(p.title).language ?? "EN") === "EN")
      .sort((a, b) => Number(a.price) - Number(b.price))
      .slice(0, MAX_PRODUCTS);

    const listings: Listing[] = [];
    for (const p of candidates) {
      const product = await storeJson<ProductJs>(ID, `${BASE}/products/${p.handle}.js`);
      const info = parseTitle(product.title);
      const conditionPos = product.options.find((o) => /condition/i.test(o.name))?.position ?? 1;

      // Each variant is one consigned copy; group identical condition + price.
      const groups = new Map<string, { variantId: number; condition: string; price: number; count: number }>();
      for (const v of product.variants) {
        if (!v.available) continue;
        const condition = (conditionPos === 1 ? v.option1 : v.title) ?? v.title;
        const key = `${condition}|${v.price}`;
        const grp = groups.get(key);
        if (grp) grp.count++;
        else groups.set(key, { variantId: v.id, condition, price: v.price, count: 1 });
      }
      for (const grp of groups.values()) {
        listings.push({
          store: ID,
          cardName: product.title,
          setCode: info.setCode,
          collectorNumber: info.collectorNumber,
          condition: parseCondition(grp.condition),
          foil: parseFoil(product.title),
          pricePhp: grp.price / 100,
          quantity: grp.count,
          inStock: true,
          url: `${BASE}/products/${product.handle}?variant=${grp.variantId}`,
          fetchedAt: new Date(),
        });
      }
    }
    return listings;
  },
};
