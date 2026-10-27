import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cachedPrices, cardKey, pricesFor } from "@/lib/prices/service";
import type { PriceEvent } from "@/lib/prices/types";
import { STORES, storeInfo } from "@/lib/stores";
import { accessOrNull, ownedBy } from "@/lib/auth";

async function deckExists(deckId: string, ownerId: string | null) {
  return (await db.deck.count({ where: { id: deckId, ...ownedBy(ownerId) } })) > 0;
}

/** Names of cards the user still needs to buy (owned and proxied cards are never priced). */
async function missingCards(deckId: string, ownerId: string | null) {
  const cards = await db.deckCard.findMany({
    where: { deckId, deck: ownedBy(ownerId) },
    select: { quantity: true, ownedQty: true, proxy: true, card: { select: { name: true } } },
  });
  const names = cards.filter((c) => c.ownedQty < c.quantity && !c.proxy).map((c) => c.card.name);
  return [...new Set(names)];
}

/** Cached listings for the deck's missing cards. No store requests. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/decks/[id]/prices">) {
  const { id } = await ctx.params;
  const access = await accessOrNull();
  if (!access) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (!(await deckExists(id, access.ownerId))) return Response.json({ error: "Deck not found" }, { status: 404 });
  const names = await missingCards(id, access.ownerId);
  const cached = await cachedPrices(names.map(cardKey));
  return Response.json({ stores: STORES.map(storeInfo), ...cached });
}

/**
 * Fetch prices for missing cards, streaming NDJSON events as each store
 * answers. `?force=1` ignores the 12-hour cache. Each store works through the
 * cards on its own rate-limited queue, so a slow or failing store doesn't hold
 * up the others. Closing the request stops further store lookups.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/decks/[id]/prices">) {
  const { id } = await ctx.params;
  const force = req.nextUrl.searchParams.get("force") === "1";
  const access = await accessOrNull();
  if (!access) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (!(await deckExists(id, access.ownerId))) return Response.json({ error: "Deck not found" }, { status: 404 });
  const names = await missingCards(id, access.ownerId);
  const stores = STORES.filter((s) => s.support !== "unsupported");
  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: PriceEvent) => {
        if (!cancelled) controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      };
      send({ type: "start", jobs: names.length * stores.length });

      await Promise.all(
        stores.map(async (store) => {
          for (const name of names) {
            if (cancelled) return;
            const result = await pricesFor(store, name, force);
            send({ type: "result", ...result });
          }
          send({ type: "store-done", store: store.id });
        }),
      );
      send({ type: "done" });
      if (!cancelled) controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
