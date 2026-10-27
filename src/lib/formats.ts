/** Deck formats this app knows about. All are singleton, commander-led formats except "other". */
export const FORMATS = [
  { id: "commander", label: "Commander" },
  { id: "pauper-commander", label: "Pauper Commander" },
  { id: "duel-commander", label: "Duel Commander" },
  { id: "brawl", label: "Brawl" },
  { id: "oathbreaker", label: "Oathbreaker" },
  { id: "other", label: "Other" },
] as const;

export type FormatId = (typeof FORMATS)[number]["id"];

export function formatLabel(id: string): string {
  return FORMATS.find((f) => f.id === id)?.label ?? "Other";
}

export function isFormat(id: string): id is FormatId {
  return FORMATS.some((f) => f.id === id);
}
