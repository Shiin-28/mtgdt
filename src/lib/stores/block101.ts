import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { frontFace } from "@/lib/cards/normalize";
import { StoreError, storeText } from "./http";
import { parseFoil, slugKey, slugMatchesCard, titleMatchesCard } from "./matching";
import type { Listing, StoreAdapter } from "./types";

const ID = "block101";
const BASE = "https://blk101.com";
const INDEX_TTL_MS = 24 * 60 * 60 * 1000;
/** Product pages fetched per card. */
const MAX_PAGES = 5;

/**
 * Block 101's robots.txt keeps bots off its search, so we read its published
 * product sitemaps instead and fetch only product pages for missing cards.
 * MTG product slugs look like "starfleet-academy-foil-trk-mtg-trk-297-m-f":
 * name (+ variant words), set, "mtg", set, collector number, rarity, finish.
 */
export function parseProductSlug(url: string) {
  const m = url.match(/\/shop\/magic-the-gathering\/[^/]+\/([^/]+)\/?$/);
  if (!m) return null;
  const slug = m[1];
  const parts = slug.match(/^(.+?)-([a-z0-9]+)-mtg-\2-(.+)-[a-z]-([nfe])$/);
  if (!parts) {
    // Most products: "eviscerators-insight-foil-mh3" (name, variant words, set code).
    const simple = slug.match(/^(.+)-([a-z0-9]{2,6})$/);
    const name = simple ? simple[1] : slug;
    return {
      nameKey: name.replace(/-/g, " "),
      setCode: simple?.[2],
      foil: /(^|-)foil(-|$)/.test(name),
    };
  }
  return {
    nameKey: parts[1].replace(/-/g, " "),
    setCode: parts[2],
    collectorNumber: parts[3],
    foil: parts[4] !== "n",
  };
}

const g = globalThis as unknown as { __blk101Index?: Promise<void> | null };

async function buildIndex() {
  const root = await storeText(ID, `${BASE}/wp-sitemap.xml`);
  const sitemaps = [...root.matchAll(/<loc>([^<]*wp-sitemap-posts-product-\d+\.xml)<\/loc>/g)].map((m) => m[1]);
  const entries: { url: string; nameKey: string; setCode?: string; collectorNumber?: string; foil: boolean }[] = [];
  for (const sm of sitemaps) {
    const xml = await storeText(ID, sm);
    for (const [, url] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const parsed = parseProductSlug(url);
      if (parsed) entries.push({ url, ...parsed });
    }
  }
  await db.$transaction([
    db.storeIndexEntry.deleteMany({ where: { store: ID } }),
    db.storeIndexEntry.createMany({ data: entries.map((e) => ({ ...e, store: ID })) }),
    db.storeIndexState.upsert({
      where: { store: ID },
      create: { store: ID, builtAt: new Date(), entries: entries.length },
      update: { builtAt: new Date(), entries: entries.length },
    }),
  ]);
}

/** Start (or join) a background index rebuild. */
function rebuild() {
  g.__blk101Index ??= buildIndex()
    .catch((e) => console.error("[block101] index build failed:", e))
    .finally(() => {
      g.__blk101Index = null;
    });
  return g.__blk101Index;
}

export function parseBlockProductPage(html: string, url: string, fetchedAt = new Date()): Listing | null {
  const $ = cheerio.load(html);
  const title = $("h1.product_title").first().text().replace(/\s+/g, " ").trim();
  const stockText = $("p.stock").first().text().trim();
  const inStock = $("p.stock").first().hasClass("in-stock") || /in stock/i.test(stockText) && !/out of stock/i.test(stockText);
  const priceEl = $(".summary p.price, p.price").first();
  const amount = (priceEl.find("ins .amount").first().text() || priceEl.find(".amount").last().text())
    .replace(/[^\d.]/g, "");
  const slug = parseProductSlug(url);
  if (!title || !inStock || !amount) return null;
  return {
    store: ID,
    cardName: title,
    setCode: slug?.setCode,
    collectorNumber: slug?.collectorNumber,
    condition: "UNKNOWN",
    foil: slug?.foil ?? parseFoil(title),
    pricePhp: Number(amount),
    quantity: Number(stockText.match(/(\d+)\s+in stock/i)?.[1]) || null,
    inStock,
    url,
    fetchedAt,
  };
}

export const block101: StoreAdapter = {
  id: ID,
  name: "Block 101 Hobbies",
  homepage: BASE,
  support: "supported",
  note: "Searched via the store's product sitemap; condition isn't listed",
  checkUrl: (name) => `${BASE}/?s=${encodeURIComponent(frontFace(name))}&post_type=product`,

  async searchCard(cardName) {
    const state = await db.storeIndexState.findUnique({ where: { store: ID } });
    if (!state) {
      void rebuild();
      throw new StoreError("Building this store's product index (a few minutes); try again shortly", "indexing");
    }
    if (Date.now() - state.builtAt.getTime() > INDEX_TTL_MS) void rebuild();

    const prefixes = [...new Set([slugKey(cardName), slugKey(frontFace(cardName))])];
    const entries = await db.storeIndexEntry.findMany({
      where: { store: ID, OR: prefixes.map((p) => ({ nameKey: { startsWith: p } })) },
    });
    const matches = entries
      .filter((e) => slugMatchesCard(e.nameKey, cardName))
      .sort((a, b) => Number(a.foil) - Number(b.foil)) // nonfoil pages first
      .slice(0, MAX_PAGES);

    const listings: Listing[] = [];
    for (const e of matches) {
      const listing = parseBlockProductPage(await storeText(ID, e.url), e.url);
      // The slug only suggests a match; confirm against the page's own title.
      if (listing && titleMatchesCard(listing.cardName, cardName)) listings.push(listing);
    }
    return listings;
  },
};
