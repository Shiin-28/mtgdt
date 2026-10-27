import type { Condition } from "./matching";

export type { Condition };

export type Listing = {
  store: string;
  cardName: string; // as the store titles it
  setCode?: string;
  collectorNumber?: string;
  condition: Condition;
  foil: boolean;
  pricePhp: number | null; // null: the store only shows its price in the browser
  quantity: number | null; // null: in stock, count not shown
  inStock: boolean;
  url: string;
  fetchedAt: Date;
};

export type StoreSupport = "supported" | "partial" | "unsupported";

export interface StoreAdapter {
  id: string;
  name: string;
  homepage: string;
  support: StoreSupport;
  /** Why the store is partial/unsupported, shown in the UI. */
  note?: string;
  /** Link a person can open to look the card up themselves. */
  checkUrl(cardName: string): string;
  searchCard(cardName: string): Promise<Listing[]>;
}

export type StoreInfo = Pick<StoreAdapter, "id" | "name" | "homepage" | "support" | "note"> & {
  /** checkUrl with CHECK_URL_QUERY standing in for the URL-encoded card name. */
  checkUrlTemplate: string;
};

export const CHECK_URL_QUERY = "MTGDTQUERY";
