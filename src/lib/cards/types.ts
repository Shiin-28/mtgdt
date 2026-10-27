export const TYPE_GROUPS = [
  "Creature",
  "Planeswalker",
  "Battle",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Land",
  "Other",
] as const;

export type TypeGroup = (typeof TYPE_GROUPS)[number];

/** Deck-list section for a card, from its front face's type line. */
export function typeGroup(typeLine: string): TypeGroup {
  const front = typeLine.split("//")[0];
  if (/\bCreature\b/.test(front)) return "Creature";
  if (/\bLand\b/.test(front)) return "Land";
  for (const t of ["Planeswalker", "Battle", "Instant", "Sorcery", "Artifact", "Enchantment"] as const) {
    if (new RegExp(`\\b${t}\\b`).test(front)) return t;
  }
  return "Other";
}
