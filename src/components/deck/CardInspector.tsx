"use client";

import type { DeckCardView } from "@/lib/decks";
import { cardStatus, type CardPatch, type CardStatus } from "@/lib/cards/status";
import type { CardPlan } from "@/lib/prices/compute";
import type { ListingView } from "@/lib/prices/types";
import type { StoreInfo } from "@/lib/stores/types";
import { CardPriceLine, ListingsPanel, type CardPriceStatus } from "@/components/prices/PriceViews";
import { ManaCost } from "./ManaCost";

export type InspectorPrice = { plan?: CardPlan; status: CardPriceStatus; listings: ListingView[] };

/**
 * Big card preview plus editing controls. While nothing is pinned it previews
 * whatever card the pointer is over; clicking a card pins it here for editing.
 */
export function CardInspector({
  dc,
  pinned,
  price,
  stores,
  running,
  checkUrlFor,
  onPatch,
  onRemove,
  onClose,
}: {
  dc: DeckCardView | null;
  pinned: boolean;
  price: InspectorPrice | undefined;
  stores: StoreInfo[];
  running: boolean;
  checkUrlFor: (storeId: string, cardName: string) => string;
  onPatch: (patch: CardPatch) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  if (!dc) {
    return (
      <div className="flex aspect-[5/7] items-center justify-center rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted">
        Hover a card to preview it. Click one to edit it here.
      </div>
    );
  }
  const { card } = dc;
  const status = cardStatus(dc);

  return (
    <div className="space-y-3">
      <div className="relative">
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageUrl} alt={card.name} className="w-full rounded-[4.75%/3.5%] shadow-xl shadow-black/20" />
        ) : (
          <div className="flex aspect-[5/7] items-center justify-center rounded-2xl bg-surface-2 p-4 text-center font-medium">
            {card.name}
          </div>
        )}
        {pinned && (
          <button
            onClick={onClose}
            aria-label="Unpin card"
            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-black/60 text-lg leading-none text-white hover:bg-black/80"
          >
            ×
          </button>
        )}
      </div>

      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 font-medium leading-tight">{card.name}</div>
          <ManaCost cost={card.manaCost} size={16} />
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {card.typeLine} · {card.setCode.toUpperCase()} #{card.collectorNumber}
        </div>
      </div>

      {!pinned ? (
        <p className="text-xs text-muted">Click the card in the list to edit it.</p>
      ) : (
        <div className="space-y-3 text-sm">
          {dc.quantity === 1 ? (
            <StatusSwitch
              value={status}
              onChange={(s) =>
                onPatch(s === "owned" ? { ownedQty: 1, proxy: false } : { ownedQty: 0, proxy: s === "proxy" })
              }
            />
          ) : (
            <div className="space-y-2">
              <Stepper
                label="Owned"
                value={dc.ownedQty}
                min={0}
                max={dc.quantity}
                onChange={(ownedQty) => onPatch({ ownedQty })}
              />
              {dc.ownedQty < dc.quantity && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={dc.proxy} onChange={(e) => onPatch({ proxy: e.target.checked })} />
                  Proxy the other {dc.quantity - dc.ownedQty}
                </label>
              )}
            </div>
          )}

          <Stepper
            label="Copies in deck"
            value={dc.quantity}
            min={1}
            max={99}
            onChange={(quantity) => onPatch({ quantity, ownedQty: Math.min(dc.ownedQty, quantity) })}
          />

          {status === "missing" && price && (
            <div className="space-y-2 rounded-xl bg-surface-2/60 p-3">
              <CardPriceLine plan={price.plan} status={price.status} stores={stores} running={running} />
              <ListingsPanel
                cardName={card.name}
                listings={price.listings}
                status={price.status}
                stores={stores}
                checkUrlFor={(storeId) => checkUrlFor(storeId, card.name)}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onPatch({ isCommander: !dc.isCommander })}
              className="h-8 rounded-lg border border-border bg-surface px-3"
            >
              {dc.isCommander ? "Unset commander" : "Make commander"}
            </button>
            <button onClick={onRemove} className="ml-auto h-8 rounded-lg px-3 text-danger hover:bg-surface-2">
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusSwitch({ value, onChange }: { value: CardStatus; onChange: (s: CardStatus) => void }) {
  const opts: [CardStatus, string, string][] = [
    ["missing", "Missing", "bg-missing/15 text-missing"],
    ["owned", "Owned", "bg-owned/15 text-owned"],
    ["proxy", "Proxy", "bg-proxy/15 text-proxy"],
  ];
  return (
    <div role="radiogroup" aria-label="Card status" className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
      {opts.map(([s, label, active]) => (
        <button
          key={s}
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(s)}
          className={`h-8 rounded-lg font-medium ${value === s ? active : "text-muted hover:text-foreground"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <div className="flex items-center rounded-lg border border-border bg-surface">
        <button onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Less ${label}`} className="h-8 w-8">
          −
        </button>
        <span className="w-8 text-center tabular">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} aria-label={`More ${label}`} className="h-8 w-8">
          +
        </button>
      </div>
    </div>
  );
}
