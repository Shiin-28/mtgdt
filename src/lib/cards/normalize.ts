/**
 * Normalize a card name for comparison: lowercase, strip accents, unify
 * apostrophes/quotes/dashes, drop other punctuation, collapse whitespace.
 * The " // " face separator is kept so double-faced names stay distinct
 * from their front face; use frontFace() to compare by front name.
 *
 *   normalizeName("Æther Vial")            -> "aether vial"
 *   normalizeName("Jötun Grunt")           -> "jotun grunt"
 *   normalizeName("Urza’s Saga")           -> "urzas saga"
 *   normalizeName("Fire // Ice")           -> "fire // ice"
 */
export function normalizeName(name: string): string {
  return name
    .replace(/[Ææ]/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s*\/\/?\s*/g, " // ") // "A/B", "A //B", "A//B" -> "A // B"
    .replace(/[‘’ʼ`´']/g, "")
    .replace(/[‐‑‒–—―-]/g, " ")
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Front face of a (possibly) multi-face name: "Fire // Ice" -> "Fire". */
export function frontFace(name: string): string {
  const i = name.indexOf("/");
  return (i === -1 ? name : name.slice(0, i)).trim();
}
