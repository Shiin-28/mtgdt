import type { Condition } from "@/lib/stores/matching";

/** A cached store listing as sent to the browser. */
export type ListingView = {
  store: string;
  cardKey: string;
  cardName: string;
  setCode: string | null;
  collectorNumber: string | null;
  condition: Condition;
  foil: boolean;
  pricePhp: number | null;
  quantity: number | null;
  inStock: boolean;
  url: string;
  fetchedAt: string;
};

export type FetchStatus = {
  store: string;
  cardKey: string;
  status: "ok" | "error";
  error: string | null;
  fetchedAt: string;
};

/** One line of the streamed refresh response (NDJSON). */
export type PriceEvent =
  | { type: "start"; jobs: number }
  | { type: "result"; fetch: FetchStatus; listings: ListingView[]; fromCache: boolean }
  | { type: "store-done"; store: string }
  | { type: "done" };
