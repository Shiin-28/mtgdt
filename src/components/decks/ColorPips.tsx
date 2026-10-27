import { manaSymbolUrl } from "@/lib/manaSymbols";

export const COLOR_INFO = {
  W: { name: "White" },
  U: { name: "Blue" },
  B: { name: "Black" },
  R: { name: "Red" },
  G: { name: "Green" },
  C: { name: "Colorless" },
} as const;

export type ColorKey = keyof typeof COLOR_INFO;

/** One color as its official mana symbol. */
export function ColorPip({ color, size = 18 }: { color: ColorKey; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={manaSymbolUrl(color)}
      alt={COLOR_INFO[color].name}
      title={COLOR_INFO[color].name}
      width={size}
      height={size}
      className="inline-block shrink-0 rounded-full shadow-[0_1px_0_rgba(0,0,0,0.35)]"
      style={{ width: size, height: size }}
    />
  );
}

/** A deck's color identity as overlapping symbols; colorless decks show C. */
export function ColorPips({ colors, size = 18 }: { colors: string; size?: number }) {
  const list = (colors ? [...colors] : ["C"]) as ColorKey[];
  return (
    <span className="inline-flex -space-x-1" aria-label={list.map((c) => COLOR_INFO[c].name).join(", ")}>
      {list.map((c) => (
        <ColorPip key={c} color={c} size={size} />
      ))}
    </span>
  );
}
