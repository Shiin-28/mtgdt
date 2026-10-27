"use client";

import type { DeckCardView } from "@/lib/decks";
import { cardStatus, nextStatusPatch, STATUS_LABEL, type CardPatch } from "@/lib/cards/status";
import type { CardPlan } from "@/lib/prices/compute";
import { formatPhp } from "@/lib/format";
import { ManaCost } from "./ManaCost";

const DOT = {
  owned: "bg-owned border-owned",
  proxy: "bg-proxy border-proxy",
  missing: "bg-transparent border-missing",
} as const;

/** One line in the compact list: status dot, qty, name, mana cost, and (optionally) price. */
export function CompactRow({
  dc,
  plan,
  checked,
  showPrice,
  showStatus = true,
  condensed = false,
  selected,
  onSelect,
  onHover,
  onPatch,
}: {
  dc: DeckCardView;
  plan: CardPlan | undefined;
  /** Prices have been looked up for this card at one or more stores. */
  checked: boolean;
  showPrice: boolean;
  /** Show the colored status dot (off: plain list; status changes from the inspector). */
  showStatus?: boolean;
  /** Tighter row without the mana cost, for the Condensed view. */
  condensed?: boolean;
  selected: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
  onPatch: (patch: CardPatch) => void;
}) {
  const status = cardStatus(dc);
  const best = plan?.allocations[0]?.listing;

  let price: React.ReactNode;
  if (status === "owned") price = <span className="text-owned">✓</span>;
  else if (status === "proxy") price = <span className="text-xs font-semibold uppercase text-proxy">proxy</span>;
  else if (best) price = <span className="font-medium">{formatPhp(plan!.cost)}</span>;
  else if (plan?.priceOnStoreOnly) price = <span className="text-xs text-muted">on store</span>;
  else if (checked) price = <span className="text-xs text-danger">sold out</span>;
  else price = <span className="text-muted">—</span>;

  return (
    <li
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`group flex items-center gap-2.5 px-2.5 ${condensed ? "min-h-8 text-sm" : "min-h-11 text-[15px]"} ${selected ? "bg-sun/15" : "hover:bg-surface-2"}`}
    >
      {showStatus && (
        <button
          onClick={() => onPatch(nextStatusPatch(dc))}
          title={`${STATUS_LABEL[status]}. Tap to change.`}
          aria-label={`${dc.card.name}: ${STATUS_LABEL[status]}. Tap to change.`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-surface"
        >
          <span className={`h-3.5 w-3.5 rounded-full border-2 ${DOT[status]}`} />
        </button>
      )}
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-pressed={selected}>
        <span className="w-5 shrink-0 text-right text-sm text-muted tabular">{dc.quantity}</span>
        <span className={`truncate ${showStatus && status === "owned" ? "text-muted" : ""}`}>{dc.card.name}</span>
        {dc.quantity > 1 && dc.ownedQty > 0 && dc.ownedQty < dc.quantity && (
          <span className="shrink-0 text-xs text-muted tabular">
            {dc.ownedQty}/{dc.quantity}
          </span>
        )}
        {!condensed && (
          <span className="ml-auto hidden shrink-0 sm:inline-flex">
            <ManaCost cost={dc.card.manaCost} size={18} />
          </span>
        )}
      </button>
      {showPrice && (
        <span className={`shrink-0 text-right tabular ${condensed ? "w-[76px] text-xs" : "w-[88px] text-sm"}`}>
          {price}
        </span>
      )}
    </li>
  );
}
