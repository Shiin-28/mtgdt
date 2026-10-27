"use client";

import type { DeckCardView } from "@/lib/decks";
import { canPair, pairingLabel, pairingOf, partnerNoun, partnerQuery } from "@/lib/cards/pairing";
import { CardSearch } from "@/components/CardSearch";

/**
 * Under the commander art: offers a second commander when the first has
 * Partner / Choose a Background / Doctor's companion, and checks that two
 * commanders are a legal pair.
 */
export function CommanderPairing({
  commanders,
  disabled,
  onAdd,
}: {
  commanders: DeckCardView[];
  disabled: boolean;
  onAdd: (name: string) => void;
}) {
  if (commanders.length === 0) return null;

  if (commanders.length > 2) {
    return <Note tone="warn">A Commander deck can have at most two commanders. Unset one in its card editor.</Note>;
  }

  if (commanders.length === 2) {
    const [a, b] = commanders;
    if (canPair(a.card, b.card)) {
      const p = pairingOf(a.card)!;
      return <Note tone="ok">✓ Legal pair ({pairingLabel(p)})</Note>;
    }
    const why = [a, b]
      .map((c) => {
        const p = pairingOf(c.card);
        return `${c.card.name}: ${p ? pairingLabel(p) : "can't have a partner"}`;
      })
      .join(" · ");
    return (
      <Note tone="warn">
        These two can&rsquo;t be commanders together. <span className="text-muted">{why}</span>
      </Note>
    );
  }

  const [only] = commanders;
  const p = pairingOf(only.card);
  if (!p) return null;

  if (p.kind === "partner-with") {
    return (
      <div className="mb-4 rounded-xl border border-sun/40 bg-sun/10 p-3 text-sm">
        <div className="font-medium">{pairingLabel(p)}</div>
        <button
          onClick={() => onAdd(p.name)}
          disabled={disabled}
          className="mt-2 h-9 rounded-lg bg-foreground px-3 font-medium text-background hover:opacity-90 disabled:opacity-60"
        >
          + Add {p.name} as commander
        </button>
      </div>
    );
  }

  const noun = partnerNoun(p);
  return (
    <div className="mb-4 rounded-xl border border-sun/40 bg-sun/10 p-3 text-sm">
      <div className="mb-2">
        <span className="font-medium">{pairingLabel(p)}</span>
        <span className="text-muted"> · you can add a {noun} as a second commander.</span>
      </div>
      <CardSearch filter={partnerQuery(p)} disabled={disabled} placeholder={`Search for a ${noun}…`} onPick={onAdd} />
    </div>
  );
}

function Note({ tone, children }: { tone: "ok" | "warn"; children: React.ReactNode }) {
  return (
    <p
      className={`mb-4 rounded-xl px-3 py-2 text-sm ${tone === "ok" ? "bg-owned/10 text-owned" : "bg-danger/10 text-danger"}`}
    >
      {children}
    </p>
  );
}
