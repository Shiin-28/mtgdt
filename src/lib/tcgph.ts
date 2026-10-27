import { frontFace } from "@/lib/cards/normalize";

/**
 * TCGph (tcgph.com) compares prices across Philippine stores. Its Multisearch
 * page takes a pasted list ("1 Sol Ring" per line, Manabox style); it doesn't
 * accept a list in the URL, so we copy the list and open the page.
 */
export const TCGPH_MULTISEARCH_URL = "https://tcgph.com/multisearch";

export function tcgphSearchUrl(cardName: string): string {
  return `https://tcgph.com/search?q=${encodeURIComponent(frontFace(cardName))}`;
}

/** "1 Sol Ring" lines; front face only for double-faced cards, which list sites match best. */
export function tcgphList(cards: { name: string; qty: number }[]): string {
  return cards.map((c) => `${c.qty} ${frontFace(c.name)}`).join("\n");
}
