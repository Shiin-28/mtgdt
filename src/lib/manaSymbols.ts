/**
 * Official mana symbol images, served by Scryfall. "{W/U}" -> WU.svg,
 * "{U/P}" -> UP.svg, "{2}" -> 2.svg, "{X}" -> X.svg.
 */
export function manaSymbolUrl(symbol: string): string {
  return `https://svgs.scryfall.io/card-symbols/${symbol.replace(/\//g, "").toUpperCase()}.svg`;
}
