"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ownedBy, requireAccess } from "@/lib/auth";
import { addCard, getDeck, importDecklist, type DeckView, type ImportReport } from "@/lib/decks";
import { resolveCardByName } from "@/lib/scryfall/cards";
import { isFormat } from "@/lib/formats";

export type ActionResult<T = DeckView> = { ok: true; data: T } | { ok: false; error: string };

const NOT_FOUND = { ok: false, error: "Deck not found" } as const;

/** The deck id if the current user may change it, else null. Redirects to /login when signed out. */
async function ownDeck(deckId: string): Promise<string | null> {
  const { ownerId } = await requireAccess(`/decks/${deckId}`);
  const deck = await db.deck.findFirst({ where: { id: deckId, ...ownedBy(ownerId) }, select: { id: true } });
  return deck?.id ?? null;
}

/** The deck card if it's in one of the current user's decks, else null. */
async function ownDeckCard(deckCardId: string) {
  const { ownerId } = await requireAccess();
  return db.deckCard.findFirst({ where: { id: deckCardId, deck: ownedBy(ownerId) } });
}

async function deckOrError(deckId: string): Promise<ActionResult> {
  const { ownerId } = await requireAccess();
  const deck = await getDeck(deckId, ownerId);
  return deck ? { ok: true, data: deck } : NOT_FOUND;
}

function message(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}

export async function createDeck(formData: FormData) {
  const { ownerId } = await requireAccess("/decks?new=1");
  const name = String(formData.get("name") ?? "").trim() || "Untitled deck";
  const format = String(formData.get("format") ?? "commander");
  const decklist = String(formData.get("decklist") ?? "").trim();
  const deck = await db.deck.create({
    data: { name: name.slice(0, 100), format: isFormat(format) ? format : "commander", userId: ownerId },
  });
  if (decklist) {
    try {
      await importDecklist(deck.id, decklist, "add");
    } catch (e) {
      // The deck exists either way; the list can be imported again from the deck page.
      console.error("[createDeck] import failed", e);
    }
  }
  redirect(`/decks/${deck.id}`);
}

export async function renameDeck(deckId: string, name: string): Promise<ActionResult> {
  if (!(await ownDeck(deckId))) return NOT_FOUND;
  const trimmed = name.trim().slice(0, 100);
  if (!trimmed) return { ok: false, error: "Name can't be empty" };
  await db.deck.update({ where: { id: deckId }, data: { name: trimmed } });
  return deckOrError(deckId);
}

export async function deleteDeck(deckId: string) {
  if (await ownDeck(deckId)) await db.deck.delete({ where: { id: deckId } });
  redirect("/decks");
}

export async function addCardByName(
  deckId: string,
  name: string,
  opts: { isCommander?: boolean } = {},
): Promise<ActionResult> {
  if (!(await ownDeck(deckId))) return NOT_FOUND;
  try {
    const card = await resolveCardByName(name);
    if (!card) return { ok: false, error: `Couldn't find "${name}" on Scryfall` };
    await addCard(deckId, card, opts);
    return deckOrError(deckId);
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function importCards(
  deckId: string,
  text: string,
  mode: "add" | "replace",
): Promise<ActionResult<{ deck: DeckView; report: ImportReport }>> {
  if (!(await ownDeck(deckId))) return NOT_FOUND;
  try {
    const report = await importDecklist(deckId, text, mode);
    const result = await deckOrError(deckId);
    if (!result.ok) return result;
    return { ok: true, data: { deck: result.data, report } };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function updateDeckCard(
  deckCardId: string,
  patch: { ownedQty?: number; quantity?: number; isCommander?: boolean; proxy?: boolean },
): Promise<ActionResult> {
  const dc = await ownDeckCard(deckCardId);
  if (!dc) return { ok: false, error: "Card not in deck" };
  const quantity = Math.max(1, Math.min(99, patch.quantity ?? dc.quantity));
  const ownedQty = Math.max(0, Math.min(quantity, patch.ownedQty ?? dc.ownedQty));
  await db.$transaction([
    db.deckCard.update({
      where: { id: deckCardId },
      data: {
        quantity,
        ownedQty,
        isCommander: patch.isCommander ?? dc.isCommander,
        proxy: patch.proxy ?? dc.proxy,
      },
    }),
    db.deck.update({ where: { id: dc.deckId }, data: { updatedAt: new Date() } }),
  ]);
  return deckOrError(dc.deckId);
}

export async function removeDeckCard(deckCardId: string): Promise<ActionResult> {
  const dc = await ownDeckCard(deckCardId);
  if (!dc) return { ok: false, error: "Card not in deck" };
  await db.deckCard.delete({ where: { id: deckCardId } });
  return deckOrError(dc.deckId);
}

export async function setAllOwned(deckId: string, owned: boolean): Promise<ActionResult> {
  if (!(await ownDeck(deckId))) return NOT_FOUND;
  // One statement for the whole deck (ownedQty = quantity, or 0).
  if (owned) await db.$executeRaw`UPDATE "DeckCard" SET "ownedQty" = "quantity" WHERE "deckId" = ${deckId}`;
  else await db.deckCard.updateMany({ where: { deckId }, data: { ownedQty: 0 } });
  await db.deck.update({ where: { id: deckId }, data: { updatedAt: new Date() } });
  return deckOrError(deckId);
}
