import { getThrottle, sleep } from "@/lib/throttle";

const BASE = "https://api.scryfall.com";

// Scryfall asks for a descriptive User-Agent and an Accept header on every request.
const HEADERS = {
  "User-Agent":
    process.env.SCRYFALL_USER_AGENT ?? "MTGDeckTracker/0.1 (personal Commander deck tracker)",
  Accept: "application/json;q=0.9,*/*;q=0.8",
};

// Scryfall allows ~10 requests/second; stay a little under that.
const throttle = getThrottle("scryfall", 110);

export type ScryfallCard = {
  object: "card";
  id: string;
  oracle_id?: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  layout: string;
  type_line?: string;
  mana_cost?: string;
  cmc?: number;
  color_identity: string[];
  keywords?: string[];
  oracle_text?: string;
  image_uris?: { small: string; normal: string };
  card_faces?: {
    name: string;
    mana_cost?: string;
    type_line?: string;
    oracle_text?: string;
    oracle_id?: string;
    image_uris?: { small: string; normal: string };
  }[];
};

export type CardIdentifier =
  | { id: string }
  | { name: string }
  | { name: string; set: string }
  | { set: string; collector_number: string };

export class ScryfallError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await throttle.run(() =>
      fetch(BASE + path, {
        ...init,
        headers: { ...HEADERS, ...(init?.body ? { "Content-Type": "application/json" } : {}) },
        cache: "no-store",
      }),
    );
    if (res.status === 429 && attempt < 2) {
      // Too fast: back off the whole queue, then retry.
      const retryAfter = Number(res.headers.get("retry-after")) || 2;
      throttle.pause(retryAfter * 1000);
      await sleep(retryAfter * 1000);
      continue;
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ScryfallError(body?.details ?? `Scryfall ${res.status}`, res.status);
    }
    return body as T;
  }
}

// Small in-memory TTL cache for autocomplete/search responses.
type Entry<T> = { value: T; expires: number };
const memo = (globalThis as unknown as { __scryfallMemo?: Map<string, Entry<unknown>> })
  .__scryfallMemo ?? new Map<string, Entry<unknown>>();
(globalThis as unknown as { __scryfallMemo?: Map<string, Entry<unknown>> }).__scryfallMemo = memo;
const MEMO_TTL = 24 * 60 * 60 * 1000;
const MEMO_MAX = 1000;

async function memoized<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await load();
  if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value!);
  memo.set(key, { value, expires: Date.now() + MEMO_TTL });
  return value;
}

export function autocomplete(q: string): Promise<string[]> {
  const query = q.trim();
  if (query.length < 2) return Promise.resolve([]);
  return memoized(`ac:${query.toLowerCase()}`, async () => {
    const res = await request<{ data: string[] }>(
      `/cards/autocomplete?q=${encodeURIComponent(query)}`,
    );
    return res.data;
  });
}

/** Full-text Scryfall search; returns the first page (up to 175 cards). */
export function searchCards(q: string): Promise<ScryfallCard[]> {
  const query = q.trim();
  if (!query) return Promise.resolve([]);
  return memoized(`search:${query.toLowerCase()}`, async () => {
    try {
      const res = await request<{ data: ScryfallCard[] }>(
        `/cards/search?unique=cards&order=name&q=${encodeURIComponent(query)}`,
      );
      return res.data;
    } catch (e) {
      if (e instanceof ScryfallError && e.status === 404) return []; // no matches
      throw e;
    }
  });
}

/** Map of normalized set name -> set code, e.g. "foundations commander" -> "fdc". */
export function setCodesByName(): Promise<Map<string, string>> {
  return memoized("sets", async () => {
    const res = await request<{ data: { code: string; name: string }[] }>("/sets");
    const map = new Map<string, string>();
    for (const s of res.data) {
      map.set(s.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), s.code);
    }
    return map;
  });
}

export const COLLECTION_BATCH = 75;

/** POST /cards/collection. Callers must pass at most 75 identifiers. */
export async function getCollection(identifiers: CardIdentifier[]) {
  if (identifiers.length > COLLECTION_BATCH) throw new Error("Max 75 identifiers per request");
  return request<{ data: ScryfallCard[]; not_found: CardIdentifier[] }>("/cards/collection", {
    method: "POST",
    body: JSON.stringify({ identifiers }),
  });
}
