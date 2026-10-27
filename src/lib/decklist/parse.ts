import { normalizeName } from "@/lib/cards/normalize";

export type DecklistEntry = {
  name: string;
  quantity: number;
  setCode?: string;
  collectorNumber?: string;
  isCommander: boolean;
};

export type ParsedDecklist = {
  entries: DecklistEntry[];
  /** Lines recognised as section headers ("Sideboard", "Creatures (30)") and skipped. */
  headers: string[];
  /** Number of input lines that were folded into an earlier entry. */
  mergedLines: number;
};

const SECTION_HEADERS = new Set([
  "commander", "commanders", "companion", "deck", "main", "mainboard", "main deck",
  "sideboard", "side", "maybeboard", "maybe", "considering", "tokens", "token",
  "creatures", "creature", "lands", "land", "instants", "instant", "sorceries", "sorcery",
  "artifacts", "artifact", "enchantments", "enchantment", "planeswalkers", "planeswalker",
  "battles", "battle", "spells", "other", "about",
]);

const COMMANDER_HEADERS = new Set(["commander", "commanders"]);

function headerName(line: string): string | null {
  // "Sideboard", "SIDEBOARD:", "Creatures (30)", "// Lands", "## Commander"
  const bare = line
    .replace(/^(\/\/|#+)\s*/, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/:\s*$/, "")
    .trim()
    .toLowerCase();
  return SECTION_HEADERS.has(bare) ? bare : null;
}

/**
 * Parse a pasted decklist. Accepts plain names ("Sol Ring"), counted lines
 * ("1 Sol Ring", "1x Sol Ring"), and Moxfield/ManaBox/Arena exports with set
 * code and collector number ("1 Sol Ring (C21) 263", "1 Sol Ring (C21) 263 *F*").
 * Section headers are skipped; cards under a "Commander" header, or tagged
 * *CMDR*, are flagged as commanders. Duplicate cards are merged.
 */
export function parseDecklist(text: string): ParsedDecklist {
  const headers: string[] = [];
  const byKey = new Map<string, DecklistEntry>();
  let section: string | null = null;
  let mergedLines = 0;

  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line) continue;

    const header = headerName(line);
    if (header) {
      headers.push(line);
      section = header;
      continue;
    }
    if (line.startsWith("//") || line.startsWith("#")) continue; // comment

    line = line.replace(/^SB:\s*/i, "");

    let quantity = 1;
    const qty = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (qty) {
      quantity = Number(qty[1]);
      line = qty[2];
    }
    if (quantity <= 0) continue;

    let isCommander = section !== null && COMMANDER_HEADERS.has(section);
    if (/\*CMDR\*/i.test(line)) isCommander = true;

    line = line
      .replace(/\*[A-Z]+\*/gi, " ") // *F*, *E*, *CMDR*
      .replace(/\s\^[^^]*\^/g, " ") // Archidekt ^colour tags^
      .replace(/\s\[[^\]]*\]/g, " ") // Archidekt [Category]
      .replace(/\s#\S.*$/, " ") // Moxfield #tags
      .trim();

    let setCode: string | undefined;
    let collectorNumber: string | undefined;
    const printing = line.match(/^(.+?)\s+\(([A-Za-z0-9]{2,6})\)(?:\s+(\S+))?$/);
    if (printing) {
      line = printing[1];
      setCode = printing[2].toLowerCase();
      collectorNumber = printing[3];
    }

    const name = line.replace(/\s+/g, " ").trim();
    if (!name) continue;

    const key = normalizeName(name);
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += quantity;
      existing.isCommander ||= isCommander;
      mergedLines++;
    } else {
      byKey.set(key, { name, quantity, setCode, collectorNumber, isCommander });
    }
  }

  return { entries: [...byKey.values()], headers, mergedLines };
}
