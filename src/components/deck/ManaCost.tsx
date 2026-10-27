import { manaSymbolUrl } from "@/lib/manaSymbols";

/** Render a Scryfall mana cost like "{2}{U}{R}" with the official symbols (front face only for double-faced cards). */
export function ManaCost({ cost, size = 16 }: { cost: string | null; size?: number }) {
  if (!cost) return null;
  const front = cost.split("//")[0];
  const symbols = [...front.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  if (!symbols.length) return null;
  return (
    <span className="inline-flex items-center gap-[2px]" aria-label={front.trim()}>
      {symbols.map((s, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={manaSymbolUrl(s)}
          alt={`{${s}}`}
          title={`{${s}}`}
          width={size}
          height={size}
          loading="lazy"
          className="shrink-0 rounded-full shadow-[0_1px_0_rgba(0,0,0,0.35)]"
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}
