/**
 * Commander pairing rules: which second commander a card allows, and whether
 * two commanders are a legal pair.
 *
 * - Partner (plain): any two cards with plain Partner.
 * - Partner with X: only the named card.
 * - Partner—Group ("Friends forever", "Survivors", "Character select",
 *   "Father & son", …): only another card with the same group.
 * - Choose a Background: a creature with it plus a Background enchantment.
 * - Doctor's companion: a creature with it plus a Time Lord Doctor.
 */
export type PairingCard = {
  name: string;
  typeLine: string;
  keywords: string[];
  /** From "Partner with X" in the rules text. */
  partnerWith: string | null;
  /** From "Partner—X" in the rules text, e.g. "Friends forever". */
  partnerGroup: string | null;
};

export type Pairing =
  | { kind: "partner" }
  | { kind: "partner-with"; name: string }
  | { kind: "partner-group"; group: string }
  | { kind: "choose-background" }
  | { kind: "background" }
  | { kind: "doctors-companion" }
  | { kind: "doctor" };

const has = (c: PairingCard, kw: string) => c.keywords.some((k) => k.toLowerCase() === kw.toLowerCase());

/** The pairing ability a card has, if any. */
export function pairingOf(c: PairingCard): Pairing | null {
  if (c.partnerWith) return { kind: "partner-with", name: c.partnerWith };
  if (c.partnerGroup) return { kind: "partner-group", group: c.partnerGroup };
  if (has(c, "Partner")) return { kind: "partner" };
  if (has(c, "Choose a Background")) return { kind: "choose-background" };
  if (has(c, "Doctor's companion")) return { kind: "doctors-companion" };
  if (/\bBackground\b/.test(c.typeLine)) return { kind: "background" };
  if (/\bTime Lord Doctor\b/.test(c.typeLine)) return { kind: "doctor" };
  return null;
}

/** Short label for the commander panel ("Partner", "Choose a Background"…). */
export function pairingLabel(p: Pairing): string {
  switch (p.kind) {
    case "partner":
      return "Partner";
    case "partner-with":
      return `Partner with ${p.name}`;
    case "partner-group":
      return `Partner—${p.group}`;
    case "choose-background":
      return "Choose a Background";
    case "background":
      return "Background";
    case "doctors-companion":
      return "Doctor's companion";
    case "doctor":
      return "Time Lord Doctor";
  }
}

/** What to call the second commander this card is looking for. */
export function partnerNoun(p: Pairing): string {
  switch (p.kind) {
    case "choose-background":
      return "Background";
    case "background":
      return "commander that can choose a Background";
    case "doctors-companion":
      return "Doctor";
    case "doctor":
      return "Doctor's companion";
    default:
      return "partner";
  }
}

/** Scryfall search filter for valid second commanders (added to the user's text). */
export function partnerQuery(p: Pairing): string {
  const quoted = (s: string) => s.replace(/"/g, "");
  switch (p.kind) {
    case "partner":
      return 'is:commander keyword:partner -o:"partner with" -o:"partner—"';
    case "partner-with":
      return `!"${quoted(p.name)}"`;
    case "partner-group":
      return `is:commander o:"partner—${quoted(p.group)}"`;
    case "choose-background":
      return "t:background";
    case "background":
      return 'is:commander keyword:"choose a background"';
    case "doctors-companion":
      return 't:"time lord" t:doctor';
    case "doctor":
      return 'is:commander keyword:"doctor\'s companion"';
  }
}

const COMPATIBLE: Record<Pairing["kind"], Pairing["kind"][]> = {
  partner: ["partner"],
  "partner-with": ["partner-with"],
  "partner-group": ["partner-group"],
  "choose-background": ["background"],
  background: ["choose-background"],
  "doctors-companion": ["doctor"],
  doctor: ["doctors-companion"],
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Can these two be commanders together? */
export function canPair(a: PairingCard, b: PairingCard): boolean {
  const pa = pairingOf(a);
  const pb = pairingOf(b);
  if (!pa || !pb || !COMPATIBLE[pa.kind].includes(pb.kind)) return false;
  if (pa.kind === "partner-with" && pb.kind === "partner-with") return same(pa.name, b.name) && same(pb.name, a.name);
  if (pa.kind === "partner-group" && pb.kind === "partner-group") return same(pa.group, pb.group);
  return true;
}

/** "Partner with Proud Mentor (When this creature…)" -> "Proud Mentor". */
export function parsePartnerWith(oracleText: string | null | undefined): string | null {
  const m = oracleText?.match(/Partner with ([^(\n]+?)\s*(?:\(|\n|$)/);
  return m ? m[1].trim() : null;
}

/** "Partner—Friends forever (You can have…)" -> "Friends forever". */
export function parsePartnerGroup(oracleText: string | null | undefined): string | null {
  const m = oracleText?.match(/Partner\s*[—–-]\s*([^(\n]+?)\s*(?:\(|\n|$)/);
  return m ? m[1].trim() : null;
}
