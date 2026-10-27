import * as cheerio from "cheerio";
import { frontFace } from "@/lib/cards/normalize";
import { storeText } from "./http";
import { isNonSingle, parseCondition, titleMatchesCard } from "./matching";
import type { Listing, StoreAdapter } from "./types";

const ID = "dmcollectibles";
const BASE = "https://dmcollectibles.shop";

/** Parse a DM Collectibles search results page. Exported for tests. */
export function parseDmSearch(html: string, cardName: string, fetchedAt = new Date()): Listing[] {
  const $ = cheerio.load(html);
  const listings: Listing[] = [];

  $(".card").each((_, el) => {
    const card = $(el);
    const link = card.find("a.card-name-link").attr("href");
    const name = card.find(".card-name-text").text().trim();
    if (!link?.startsWith("/singles/") || !name) return;
    if (!titleMatchesCard(name, cardName) || isNonSingle(name, cardName)) return;

    // "REALITY FRACTURE COMMANDER [FRC] (21)"
    const header = card.find("a.card-name-link small").text();
    const printing = header.match(/\[([A-Z0-9]+)\]\s*\(([^)]+)\)/i);

    // One button per in-stock condition/finish; none means sold out.
    card.find("button[id^='nonfoilButton'], button[id^='foilButton']").each((_, b) => {
      const btn = $(b);
      const onclick = btn.attr("onclick") ?? "";
      const price = onclick.match(/indicateThePrice\('[^']*',\s*'([\d.,]+)'\)/)?.[1];
      const qty = onclick.match(/setQuantityOption\('(\d+)'/)?.[1];
      if (!price) return;
      listings.push({
        store: ID,
        cardName: `${name} – ${header.replace(/\s+/g, " ").trim()}`,
        setCode: printing?.[1].toLowerCase(),
        collectorNumber: printing?.[2],
        condition: parseCondition(btn.find("b").text()),
        foil: (btn.attr("id") ?? "").startsWith("foil"),
        pricePhp: Number(price.replace(/,/g, "")),
        quantity: qty ? Number(qty) : null,
        inStock: true,
        url: BASE + link,
        fetchedAt,
      });
    });
  });
  return listings;
}

export const dmcollectibles: StoreAdapter = {
  id: ID,
  name: "DM Collectibles",
  homepage: BASE,
  support: "supported",
  checkUrl: (name) => `${BASE}/input/search?searchTerm=${encodeURIComponent(frontFace(name))}`,

  async searchCard(cardName) {
    const html = await storeText(ID, this.checkUrl(cardName));
    return parseDmSearch(html, cardName);
  },
};
