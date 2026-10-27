import { frontFace, normalizeName } from "@/lib/cards/normalize";

export type Condition = "NM" | "LP" | "MP" | "HP" | "DMG" | "UNKNOWN";

const CONDITIONS: [Condition, RegExp][] = [
  ["DMG", /\b(damaged|dmg|poor)\b/i],
  ["HP", /\b(heavily[\s-]*played|heavy[\s-]*play|hp)\b/i],
  ["MP", /\b(moderately[\s-]*played|mp|(?<!(lightly|slightly|heavily|light|heavy)[\s-]*)played|vg)\b/i],
  ["LP", /\b(lightly[\s-]*played|light[\s-]*play|lp|sp|slightly[\s-]*played|excellent|ex)\b/i],
  ["NM", /\b(near[\s-]*mint|nm|mint|m)\b/i],
];

/** "Near Mint" -> NM, "Lightly Played" -> LP, "HP" -> HP, anything else -> UNKNOWN. */
export function parseCondition(text: string | null | undefined): Condition {
  if (!text) return "UNKNOWN";
  for (const [cond, re] of CONDITIONS) {
    if (re.test(text)) return cond;
  }
  return "UNKNOWN";
}

/**
 * True when a product/variant title says the card is foil ("Foil", "Surge Foil",
 * "Etched", "[EN/F]"), false for "Non-Foil", "Nonfoil", "[EN/N]" or no marker.
 */
export function parseFoil(text: string | null | undefined): boolean {
  if (!text) return false;
  if (/\[\s*[a-z]{2}\s*\/\s*f\s*\]/i.test(text)) return true;
  if (/\[\s*[a-z]{2}\s*\/\s*n\s*\]/i.test(text)) return false;
  const t = text.replace(/\bnon[\s-]?foil\b/gi, " ");
  return /\b(foil|etched|surgefoil|surge foil)\b/i.test(t);
}

// Words that mark a product as something other than a single card. A word is
// ignored when it is part of the searched card's own name ("Booster Tutor").
const NON_SINGLE = [
  "sleeve", "sleeves", "booster", "boosters", "bundle", "box", "pack", "packs", "playmat",
  "deck box", "deckbox", "binder", "token", "tokens", "art card", "art series", "emblem",
  "precon", "commander deck", "starter kit", "dice", "die", "proxy", "oversized",
  "life counter", "display", "case", "collector booster", "prerelease kit", "fat pack",
  "gift box", "portfolio", "toploader", "sealed",
];

export function isNonSingle(title: string, searchedName: string): boolean {
  const t = ` ${normalizeName(title)} `;
  const own = ` ${normalizeName(searchedName)} `;
  return NON_SINGLE.some((w) => t.includes(` ${w} `) && !own.includes(` ${w} `));
}

// Printing/variant words stores tack onto a card name.
const VARIANT_WORDS = new Set([
  "foil", "nonfoil", "non", "surge", "surgefoil", "etched", "borderless", "showcase", "extended",
  "art", "retro", "frame", "full", "promo", "prerelease", "promopack", "textured", "galaxy",
  "serialized", "gilded", "halo", "step", "and", "compleat", "double", "rainbow", "confetti",
  "japanese", "english", "jp", "en", "alt", "alternate", "variant", "version", "special",
  "guild", "kit", "the", "list", "anime", "manga", "ripple", "raised", "neon", "ink",
  "fracture", "oil", "slick", "concept", "bundle", "buy", "box", "prerelease", "stamped",
]);

/**
 * The card-name part of a store's product title: cuts set names, brackets and
 * collector numbers off ("Sol Ring – Commander 2018 [C18]" -> "Sol Ring").
 */
export function titleBaseName(title: string): string {
  return title
    .replace(/<br\s*\/?>/gi, " | ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&#8217;/g, "'")
    .split(/\s[–—|]\s|\s-\s|\s\(|\s\[|\s#\d|\s\{/)[0]
    .trim();
}

/** Strip trailing variant words: "sol ring surge" -> "sol ring". */
function withoutVariantWords(key: string): string {
  const words = key.split(" ");
  while (words.length > 1 && VARIANT_WORDS.has(words[words.length - 1])) words.pop();
  return words.join(" ");
}

/**
 * Does a store's product title refer to the searched card? Compares normalized
 * names, accepts the front face alone for double-faced cards, and tolerates
 * variant words ("Surge Foil", "Borderless") after the name.
 */
export function titleMatchesCard(title: string, cardName: string): boolean {
  const base = normalizeName(titleBaseName(title));
  if (!base) return false;
  const targets = new Set([normalizeName(cardName), normalizeName(frontFace(cardName))]);
  if (targets.has(base)) return true;
  // "Delver of Secrets // Insectile Aberration" listed as "Delver of Secrets / Insectile..."
  if (base.includes(" // ") && targets.has(normalizeName(frontFace(base)))) return true;
  return targets.has(withoutVariantWords(base));
}

/** Slug-style key: "Urza's Saga" -> "urzas saga", "Fire // Ice" -> "fire ice". */
export function slugKey(name: string): string {
  return normalizeName(name).replace(/\s*\/\/\s*/g, " ").replace(/\s+/g, " ").trim();
}

/** True when a slug-derived name is the card's name plus only variant words. */
export function slugMatchesCard(slugName: string, cardName: string): boolean {
  const candidates = [slugKey(cardName), slugKey(frontFace(cardName))];
  return candidates.some((key) => {
    if (slugName === key) return true;
    if (!slugName.startsWith(key + " ")) return false;
    return slugName
      .slice(key.length + 1)
      .split(" ")
      .every((w) => VARIANT_WORDS.has(w));
  });
}
