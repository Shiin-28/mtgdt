import { frontFace } from "@/lib/cards/normalize";
import type { StoreAdapter } from "./types";

function unsupported(
  id: string,
  name: string,
  homepage: string,
  note: string,
  checkUrl: (cardName: string) => string = () => homepage,
): StoreAdapter {
  return {
    id,
    name,
    homepage,
    support: "unsupported",
    note,
    checkUrl,
    async searchCard() {
      return []; // never fetched; see STORES.md
    },
  };
}

export const highmarket = unsupported(
  "highmarket",
  "High Market Online",
  "https://www.highmarketonline.shop",
  "Site is behind a bot check",
);

export const cardpro = unsupported(
  "cardpro",
  "Cardpro",
  "https://www.cardpro.ph",
  "Site is behind a bot check",
);

export const infinity = unsupported(
  "infinity",
  "Infinity Hobbies",
  "https://infinity-hobbies.com",
  "robots.txt keeps bots off search",
  (name) => `https://infinity-hobbies.com/products/singles?search=${encodeURIComponent(frontFace(name))}`,
);

export const trics = unsupported(
  "trics",
  "TriCS Circle of Hobbies",
  "https://trics.shopmatezero.com",
  "robots.txt blocks all bots",
);
