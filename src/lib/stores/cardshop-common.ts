import * as cheerio from "cheerio";
import { frontFace } from "@/lib/cards/normalize";
import { storeText } from "./http";
import { isNonSingle, parseCondition, titleBaseName, titleMatchesCard } from "./matching";
import type { Listing, StoreAdapter } from "./types";

/**
 * Jace Collection and Vault Card Shop run the same storefront. Search results
 * at /mtg/?cardname= list type, condition and stock in the HTML, but most
 * prices are filled in by the browser; only "manualprice" inputs carry a peso
 * price server-side. Listings without one get pricePhp: null.
 */
export function parseCardshopSearch(
  html: string,
  storeId: string,
  cardName: string,
  fetchedAt = new Date(),
): Listing[] {
  const $ = cheerio.load(html);
  const listings: Listing[] = [];

  $("[id='divider']").each((_, el) => {
    const block = $(el);
    const title = block.find("h2").first().text().trim();
    const url = block.find("a[href*='/mtg/']").first().attr("href");
    if (!title || !url) return;
    if (!titleMatchesCard(title, cardName) || isNonSingle(titleBaseName(title), cardName)) return;

    const text = block.text().replace(/\s+/g, " ");
    const stock = Number(text.match(/Stock:\s*(\d+)/i)?.[1] ?? 0);
    const priceKey = block.find("[id^='cardprice-']").attr("id")?.slice("cardprice-".length);
    const manual = priceKey ? $(`[id='manualprice-${priceKey}']`).attr("value") : undefined;
    // Price key looks like "697418nonfoil2606758NM": finish and condition are in it too.
    const finish = priceKey?.match(/(nonfoil|foil)/i)?.[1] ?? text.match(/\b(NONFOIL|FOIL)\b/)?.[1] ?? "";
    const condition = priceKey?.match(/(NM|LP|MP|HP|DMG|SP)$/)?.[1] ?? text.match(/Condition:\s*(\w+)/i)?.[1];

    listings.push({
      store: storeId,
      cardName: title.replace(/\s*\[\]\s*$/, ""),
      condition: parseCondition(condition),
      foil: finish.toLowerCase() === "foil",
      pricePhp: manual && Number(manual) > 0 ? Number(manual) : null,
      quantity: stock,
      inStock: stock > 0,
      url,
      fetchedAt,
    });
  });
  return listings.filter((l) => l.inStock);
}

export function cardshopAdapter(opts: { id: string; name: string; base: string }): StoreAdapter {
  return {
    id: opts.id,
    name: opts.name,
    homepage: opts.base,
    support: "partial",
    note: "Most prices are only shown in the browser; those listings link to the store",
    checkUrl: (name) => `${opts.base}/mtg/?cardname=${encodeURIComponent(frontFace(name))}`,
    async searchCard(cardName) {
      const html = await storeText(opts.id, this.checkUrl(cardName));
      return parseCardshopSearch(html, opts.id, cardName);
    },
  };
}
