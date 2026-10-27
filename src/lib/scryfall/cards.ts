import { db } from "@/lib/db";
import type { Card } from "@/generated/prisma/client";
import { frontFace, normalizeName } from "@/lib/cards/normalize";
import { parsePartnerGroup, parsePartnerWith } from "@/lib/cards/pairing";
import { COLLECTION_BATCH, getCollection, type CardIdentifier, type ScryfallCard } from "./client";

/** What a decklist line asks for. */
export type CardRequest = { name: string; setCode?: string; collectorNumber?: string };

function toRow(c: ScryfallCard) {
  const front = c.card_faces?.[0];
  const rulesText = c.oracle_text ?? c.card_faces?.map((f) => f.oracle_text ?? "").join("\n") ?? "";
  const frontName = front?.name ?? frontFace(c.name);
  return {
    id: c.id,
    oracleId: c.oracle_id ?? front?.oracle_id ?? c.id,
    name: c.name,
    frontName,
    nameKey: normalizeName(c.name),
    frontKey: normalizeName(frontName),
    setCode: c.set.toLowerCase(),
    setName: c.set_name,
    collectorNumber: c.collector_number,
    imageUrl: c.image_uris?.normal ?? front?.image_uris?.normal ?? null,
    typeLine: c.type_line ?? front?.type_line ?? "",
    manaCost: c.mana_cost ?? front?.mana_cost ?? null,
    cmc: c.cmc ?? 0,
    colorIdentity: c.color_identity.join(""),
    layout: c.layout,
    keywords: JSON.stringify(c.keywords ?? []),
    partnerWith: parsePartnerWith(rulesText),
    partnerGroup: parsePartnerGroup(rulesText),
    fetchedAt: new Date(),
  };
}

/**
 * Insert or refresh cards. New cards go in with one statement and known ones
 * are refreshed a few at a time; one row at a time inside a transaction is too
 * slow against a hosted database (it hit the 5 s transaction limit).
 */
export async function saveCards(cards: ScryfallCard[]): Promise<Card[]> {
  const rows = [...new Map(cards.map((c) => [c.id, toRow(c)])).values()];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const known = new Set(
    (await db.card.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((c) => c.id),
  );

  const fresh = rows.filter((r) => !known.has(r.id));
  if (fresh.length) await db.card.createMany({ data: fresh, skipDuplicates: true });
  const stale = rows.filter((r) => known.has(r.id));
  for (let i = 0; i < stale.length; i += 10) {
    await Promise.all(stale.slice(i, i + 10).map((r) => db.card.update({ where: { id: r.id }, data: r })));
  }
  return db.card.findMany({ where: { id: { in: ids } } });
}

function requestKey(r: CardRequest) {
  return [normalizeName(r.name), r.setCode?.toLowerCase() ?? "", r.collectorNumber ?? ""].join("|");
}

function matchesName(card: Card, name: string) {
  const key = normalizeName(name);
  return card.nameKey === key || card.frontKey === key || card.frontKey === normalizeName(frontFace(name));
}

/** Every cached card any of these requests could match, in one query (oldest first). */
async function loadCached(requests: CardRequest[]): Promise<Card[]> {
  const keys = new Set<string>();
  const printings: { setCode: string; collectorNumber: string }[] = [];
  for (const r of requests) {
    keys.add(normalizeName(r.name));
    keys.add(normalizeName(frontFace(r.name)));
    if (r.setCode && r.collectorNumber) {
      printings.push({ setCode: r.setCode.toLowerCase(), collectorNumber: r.collectorNumber });
    }
  }
  if (!keys.size) return [];
  return db.card.findMany({
    where: { OR: [{ nameKey: { in: [...keys] } }, { frontKey: { in: [...keys] } }, ...printings] },
    orderBy: { fetchedAt: "asc" }, // the first printing we cached for a name wins
  });
}

/** The cached card for a request, picked from `cached` (see loadCached). */
function findCached(r: CardRequest, cached: Card[]): Card | null {
  const set = r.setCode?.toLowerCase();
  if (set && r.collectorNumber) {
    const exact = cached.find((c) => c.setCode === set && c.collectorNumber === r.collectorNumber);
    if (exact && matchesName(exact, r.name)) return exact;
    if (exact) return null; // set/number points at a different card; ask Scryfall by name
  }
  const key = normalizeName(r.name);
  const frontKey = normalizeName(frontFace(r.name));
  return (
    cached.find(
      (c) => (c.nameKey === key || c.frontKey === key || c.frontKey === frontKey) && (!set || c.setCode === set),
    ) ?? null
  );
}

function identifierFor(r: CardRequest, round: number): CardIdentifier {
  const set = r.setCode?.toLowerCase();
  if (round === 0 && set && r.collectorNumber) return { set, collector_number: r.collectorNumber };
  // /cards/collection doesn't match full "Front // Back" names, only a face name.
  const name = frontFace(r.name);
  if (round <= 1 && set) return { name, set };
  return { name };
}

function pickMatch(cards: Card[], r: CardRequest, id: CardIdentifier): Card | undefined {
  if ("collector_number" in id) {
    return cards.find(
      (c) => c.setCode === id.set && c.collectorNumber === id.collector_number && matchesName(c, r.name),
    );
  }
  const set = "set" in id ? id.set : undefined;
  return cards.find((c) => matchesName(c, r.name) && (!set || c.setCode === set));
}

/**
 * Resolve decklist requests to cached Card rows. Checks the local cache first,
 * then asks Scryfall's /cards/collection in batches of 75. A request with a
 * set/collector number that Scryfall can't find falls back to name+set, then
 * name only. Returns a map keyed by the request, plus the requests not found.
 */
export async function resolveCards(requests: CardRequest[]) {
  const resolved = new Map<string, Card>();
  let pending: CardRequest[] = [];

  const cachedCards = await loadCached(requests);
  for (const r of requests) {
    const k = requestKey(r);
    if (resolved.has(k)) continue;
    const cached = findCached(r, cachedCards);
    if (cached) resolved.set(k, cached);
    else pending.push(r);
  }

  for (let round = 0; round < 3 && pending.length; round++) {
    const still: CardRequest[] = [];
    // Only retry requests whose identifier is looser this round than last.
    const toAsk =
      round === 0
        ? pending
        : pending.filter(
            (r) => JSON.stringify(identifierFor(r, round)) !== JSON.stringify(identifierFor(r, round - 1)),
          );

    for (let i = 0; i < toAsk.length; i += COLLECTION_BATCH) {
      const batch = toAsk.slice(i, i + COLLECTION_BATCH);
      const ids = batch.map((r) => identifierFor(r, round));
      const res = await getCollection(ids);
      const saved = await saveCards(res.data);
      batch.forEach((r, j) => {
        const card = pickMatch(saved, r, ids[j]);
        if (card) resolved.set(requestKey(r), card);
        else still.push(r);
      });
    }
    pending = still;
  }

  const notFound = requests.filter((r) => !resolved.has(requestKey(r)));
  return {
    get: (r: CardRequest) => resolved.get(requestKey(r)),
    notFound,
  };
}

/** Resolve a single exact card name (from autocomplete) to a Card row. */
export async function resolveCardByName(name: string): Promise<Card | null> {
  const { get } = await resolveCards([{ name }]);
  return get({ name }) ?? null;
}

/**
 * Cards cached before keywords were stored have keywords = null. Fetch those
 * again (by Scryfall id, 75 per request) so commander pairing works.
 */
export async function fillMissingKeywords(cardIds: string[]) {
  const stale = await db.card.findMany({ where: { id: { in: cardIds }, keywords: null }, select: { id: true } });
  for (let i = 0; i < stale.length; i += COLLECTION_BATCH) {
    const res = await getCollection(stale.slice(i, i + COLLECTION_BATCH).map((c) => ({ id: c.id })));
    await saveCards(res.data);
  }
}
