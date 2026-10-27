import { db } from "@/lib/db";
import type { Card } from "@/generated/prisma/client";
import { parseDecklist } from "@/lib/decklist/parse";
import { fillMissingKeywords, resolveCards } from "@/lib/scryfall/cards";

export type DeckCardView = {
  id: string;
  quantity: number;
  ownedQty: number;
  proxy: boolean;
  isCommander: boolean;
  card: Pick<
    Card,
    | "id"
    | "name"
    | "frontName"
    | "setCode"
    | "collectorNumber"
    | "imageUrl"
    | "typeLine"
    | "manaCost"
    | "cmc"
    | "colorIdentity"
    | "partnerWith"
    | "partnerGroup"
  > & { keywords: string[] };
};

export type DeckView = {
  id: string;
  name: string;
  updatedAt: string;
  cards: DeckCardView[];
};

export type DeckSummary = {
  id: string;
  name: string;
  format: string;
  commanders: string[];
  imageUrl: string | null;
  /** Color identity in WUBRG order, from the commanders (or every card if none). */
  colors: string;
  total: number;
  owned: number;
  /** Copies the user will proxy instead of buying. */
  proxied: number;
  updatedAt: string;
};

const WUBRG = "WUBRG";

export type ImportReport = {
  added: number;
  updated: number;
  removed: number;
  mergedLines: number;
  headers: string[];
  notFound: string[];
};

const cardSelect = {
  id: true,
  name: true,
  frontName: true,
  setCode: true,
  collectorNumber: true,
  imageUrl: true,
  typeLine: true,
  manaCost: true,
  cmc: true,
  colorIdentity: true,
  keywords: true,
  partnerWith: true,
  partnerGroup: true,
} as const;

/** Decks owned by `ownerId` (all decks in local mode, when ownerId is null). */
export async function listDecks(ownerId: string | null): Promise<DeckSummary[]> {
  const decks = await db.deck.findMany({
    where: ownerId ? { userId: ownerId } : {},
    orderBy: { updatedAt: "desc" },
    include: {
      cards: { include: { card: { select: { name: true, imageUrl: true, colorIdentity: true } } } },
    },
  });
  return decks.map((d) => {
    const commanders = d.cards.filter((c) => c.isCommander);
    const identitySource = commanders.length ? commanders : d.cards;
    const identity = new Set(identitySource.flatMap((c) => [...c.card.colorIdentity]));
    return {
      id: d.id,
      name: d.name,
      format: d.format,
      commanders: commanders.map((c) => c.card.name),
      imageUrl: commanders[0]?.card.imageUrl ?? d.cards.find((c) => c.card.imageUrl)?.card.imageUrl ?? null,
      colors: [...WUBRG].filter((c) => identity.has(c)).join(""),
      total: d.cards.reduce((n, c) => n + c.quantity, 0),
      owned: d.cards.reduce((n, c) => n + Math.min(c.ownedQty, c.quantity), 0),
      proxied: d.cards.reduce((n, c) => n + (c.proxy ? Math.max(0, c.quantity - c.ownedQty) : 0), 0),
      updatedAt: d.updatedAt.toISOString(),
    };
  });
}

/** A deck, or null if it doesn't exist or belongs to someone else. */
export async function getDeck(id: string, ownerId: string | null): Promise<DeckView | null> {
  const load = () =>
    db.deck.findFirst({
      where: { id, ...(ownerId ? { userId: ownerId } : {}) },
      include: {
        cards: {
          select: {
            id: true,
            quantity: true,
            ownedQty: true,
            proxy: true,
            isCommander: true,
            card: { select: cardSelect },
          },
        },
      },
    });
  let deck = await load();
  if (!deck) return null;

  // Commanders cached before pairing data existed: fetch it so partner hints work.
  const stale = deck.cards.filter((c) => c.isCommander && c.card.keywords === null).map((c) => c.card.id);
  if (stale.length) {
    try {
      await fillMissingKeywords(stale);
      deck = (await load()) ?? deck;
    } catch (e) {
      console.error("[getDeck] couldn't fetch commander keywords", e);
    }
  }

  return {
    id: deck.id,
    name: deck.name,
    updatedAt: deck.updatedAt.toISOString(),
    cards: deck.cards
      .map((c) => ({ ...c, card: { ...c.card, keywords: parseKeywords(c.card.keywords) } }))
      .sort((a, b) => a.card.name.localeCompare(b.card.name)),
  };
}

function parseKeywords(raw: string | null): string[] {
  try {
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

function touch(deckId: string) {
  return db.deck.update({ where: { id: deckId }, data: { updatedAt: new Date() } });
}

/** The deck's existing row for the same card (any printing), if any. */
async function findSameCard(deckId: string, card: Card) {
  return db.deckCard.findFirst({ where: { deckId, card: { oracleId: card.oracleId } } });
}

export async function addCard(deckId: string, card: Card, opts: { isCommander?: boolean } = {}) {
  const existing = await findSameCard(deckId, card);
  if (existing) {
    await db.deckCard.update({
      where: { id: existing.id },
      // Picking an existing card as commander shouldn't add a second copy.
      data: opts.isCommander ? { isCommander: true } : { quantity: { increment: 1 } },
    });
  } else {
    await db.deckCard.create({
      data: { deckId, cardId: card.id, quantity: 1, isCommander: opts.isCommander ?? false },
    });
  }
  await touch(deckId);
}

/**
 * Import a pasted decklist. In "add" mode cards are merged into the deck
 * (a card already in the deck keeps the larger of the two quantities). In
 * "replace" mode the deck becomes exactly the list, keeping owned counts
 * for cards that stay.
 */
export async function importDecklist(deckId: string, text: string, mode: "add" | "replace"): Promise<ImportReport> {
  const parsed = parseDecklist(text);
  const lookup = await resolveCards(parsed.entries);

  // Two lines can resolve to the same card ("Delver of Secrets" and the full DFC name).
  const wanted = new Map<string, { card: Card; quantity: number; isCommander: boolean }>();
  for (const entry of parsed.entries) {
    const card = lookup.get(entry);
    if (!card) continue;
    const prev = wanted.get(card.oracleId);
    if (prev) {
      prev.quantity += entry.quantity;
      prev.isCommander ||= entry.isCommander;
    } else {
      wanted.set(card.oracleId, { card, quantity: entry.quantity, isCommander: entry.isCommander });
    }
  }

  const current = await db.deckCard.findMany({
    where: { deckId },
    include: { card: { select: { oracleId: true } } },
  });
  const byOracle = new Map(current.map((dc) => [dc.card.oracleId, dc]));

  let added = 0;
  let updated = 0;
  const ops = [];
  for (const [oracleId, w] of wanted) {
    const dc = byOracle.get(oracleId);
    if (!dc) {
      added++;
      ops.push(
        db.deckCard.create({
          data: { deckId, cardId: w.card.id, quantity: w.quantity, isCommander: w.isCommander },
        }),
      );
      continue;
    }
    const quantity = mode === "replace" ? w.quantity : Math.max(dc.quantity, w.quantity);
    const isCommander = mode === "replace" ? w.isCommander : dc.isCommander || w.isCommander;
    if (quantity !== dc.quantity || isCommander !== dc.isCommander) {
      updated++;
      ops.push(
        db.deckCard.update({
          where: { id: dc.id },
          data: { quantity, isCommander, ownedQty: Math.min(dc.ownedQty, quantity) },
        }),
      );
    }
  }

  const toRemove = mode === "replace" ? current.filter((dc) => !wanted.has(dc.card.oracleId)) : [];
  if (toRemove.length) {
    ops.push(db.deckCard.deleteMany({ where: { id: { in: toRemove.map((dc) => dc.id) } } }));
  }
  ops.push(touch(deckId));
  await db.$transaction(ops);

  return {
    added,
    updated,
    removed: toRemove.length,
    mergedLines: parsed.mergedLines + (parsed.entries.length - lookup.notFound.length - wanted.size),
    headers: parsed.headers,
    notFound: lookup.notFound.map((r) => r.name),
  };
}
