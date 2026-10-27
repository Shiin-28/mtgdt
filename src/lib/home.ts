import { db } from "@/lib/db";
import { listDecks, type DeckSummary } from "@/lib/decks";
import { getHeroCard } from "@/lib/hero";

export type HomeData = {
  decks: DeckSummary[];
  latest: (DeckSummary & { missingCards: number }) | null;
  cardsToFind: number;
  /** Up to five card images for the hero fan, commander first. */
  fan: { imageUrl: string; name: string }[];
};

/** Home page data for an owner (null: local mode, all decks). */
export async function homeData(ownerId: string | null, signedOut = false): Promise<HomeData> {
  const decks = signedOut ? [] : await listDecks(ownerId); // most recently edited first
  const latestSummary = decks[0] ?? null;

  const fan: HomeData["fan"] = [];
  let missingCards = 0;
  if (latestSummary) {
    const cards = await db.deckCard.findMany({
      where: { deckId: latestSummary.id },
      select: { isCommander: true, quantity: true, ownedQty: true, proxy: true, card: { select: { name: true, imageUrl: true } } },
    });
    missingCards = cards.filter((c) => c.ownedQty < c.quantity && !c.proxy).length;
    // Commander first, then cards still missing, then the rest.
    const rank = (c: (typeof cards)[number]) => (c.isCommander ? 0 : c.ownedQty < c.quantity && !c.proxy ? 1 : 2);
    for (const c of cards.sort((a, b) => rank(a) - rank(b))) {
      if (c.card.imageUrl && fan.length < 5) fan.push({ imageUrl: c.card.imageUrl, name: c.card.name });
    }
  }
  if (fan.length < 5) {
    const daily = await getHeroCard();
    if (daily && !fan.some((f) => f.imageUrl === daily.imageUrl)) fan.push({ imageUrl: daily.imageUrl, name: daily.cardName });
  }

  return {
    decks,
    latest: latestSummary ? { ...latestSummary, missingCards } : null,
    cardsToFind: decks.reduce((n, d) => n + (d.total - d.owned - d.proxied), 0),
    fan,
  };
}
