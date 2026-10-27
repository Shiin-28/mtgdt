import { getThrottle } from "@/lib/throttle";
import { isAllowed, parseRobots, type RobotsRules } from "./robots";

export const STORE_USER_AGENT = "MTGDeckTracker/0.1 (personal deck price tracker; respects robots.txt)";

/** At most one request every 1.5 s per store. */
const STORE_INTERVAL_MS = 1500;
const TIMEOUT_MS = 20_000;
const ROBOTS_TTL_MS = 24 * 60 * 60 * 1000;

export type StoreErrorKind = "robots" | "rate-limited" | "cooldown" | "http" | "network" | "indexing";

export class StoreError extends Error {
  constructor(
    message: string,
    readonly kind: StoreErrorKind,
  ) {
    super(message);
  }
}

type StoreState = { cooldownUntil: number; consecutiveErrors: number };
type RobotsEntry = { rules: RobotsRules | "deny-all"; expires: number };

const g = globalThis as unknown as {
  __storeState?: Map<string, StoreState>;
  __robots?: Map<string, RobotsEntry>;
};
const states = (g.__storeState ??= new Map());
const robotsCache = (g.__robots ??= new Map());

function state(storeId: string): StoreState {
  let s = states.get(storeId);
  if (!s) states.set(storeId, (s = { cooldownUntil: 0, consecutiveErrors: 0 }));
  return s;
}

function coolDown(storeId: string, ms: number) {
  const s = state(storeId);
  s.cooldownUntil = Math.max(s.cooldownUntil, Date.now() + ms);
  getThrottle(`store:${storeId}`, STORE_INTERVAL_MS).pause(ms);
}

async function rawFetch(storeId: string, url: string, accept: string) {
  return getThrottle(`store:${storeId}`, STORE_INTERVAL_MS).run(() =>
    fetch(url, {
      headers: { "User-Agent": STORE_USER_AGENT, Accept: accept },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    }),
  );
}

async function robotsFor(storeId: string, origin: string) {
  const hit = robotsCache.get(origin);
  if (hit && hit.expires > Date.now()) return hit.rules;
  let rules: RobotsEntry["rules"];
  try {
    const res = await rawFetch(storeId, `${origin}/robots.txt`, "text/plain,*/*");
    if (res.ok) rules = parseRobots(await res.text(), STORE_USER_AGENT);
    else if (res.status >= 400 && res.status < 500) rules = { allow: [], disallow: [] }; // no robots.txt
    else rules = "deny-all"; // server error: assume the worst for now
  } catch {
    rules = "deny-all";
  }
  // Retry an unreachable robots.txt after 10 minutes rather than a day.
  const ttl = rules === "deny-all" ? 10 * 60 * 1000 : ROBOTS_TTL_MS;
  robotsCache.set(origin, { rules, expires: Date.now() + ttl });
  return rules;
}

/**
 * Fetch a store URL politely: honours robots.txt, queues per store, sends our
 * User-Agent, and backs off on 429/503 or repeated errors.
 */
export async function storeFetch(
  storeId: string,
  url: string,
  accept = "text/html,application/json;q=0.9,*/*;q=0.8",
): Promise<Response> {
  const s = state(storeId);
  if (s.cooldownUntil > Date.now()) {
    const mins = Math.ceil((s.cooldownUntil - Date.now()) / 60000);
    throw new StoreError(`Paused after errors; retrying in ~${mins} min`, "cooldown");
  }

  const u = new URL(url);
  const rules = await robotsFor(storeId, u.origin);
  if (rules === "deny-all" || !isAllowed(rules, u.pathname + u.search)) {
    throw new StoreError("Blocked by the store's robots.txt", "robots");
  }

  let res: Response;
  try {
    res = await rawFetch(storeId, url, accept);
  } catch (e) {
    noteError(storeId);
    const timeout = e instanceof Error && e.name === "TimeoutError";
    throw new StoreError(timeout ? "Store took too long to respond" : "Couldn't reach the store", "network");
  }

  if (res.status === 429 || res.status === 503) {
    const retryAfter = Number(res.headers.get("retry-after"));
    coolDown(storeId, Math.max(Number.isFinite(retryAfter) ? retryAfter * 1000 : 0, 2 * 60 * 1000));
    throw new StoreError("Store asked us to slow down", "rate-limited");
  }
  if (!res.ok) {
    noteError(storeId);
    throw new StoreError(`Store returned HTTP ${res.status}`, "http");
  }
  s.consecutiveErrors = 0;
  return res;
}

function noteError(storeId: string) {
  const s = state(storeId);
  s.consecutiveErrors++;
  if (s.consecutiveErrors >= 3) {
    s.consecutiveErrors = 0;
    coolDown(storeId, 5 * 60 * 1000);
  }
}

export async function storeJson<T>(storeId: string, url: string): Promise<T> {
  const res = await storeFetch(storeId, url, "application/json");
  return (await res.json()) as T;
}

export async function storeText(storeId: string, url: string): Promise<string> {
  const res = await storeFetch(storeId, url);
  return res.text();
}
