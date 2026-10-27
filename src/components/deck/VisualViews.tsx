"use client";

import type { DeckCardView } from "@/lib/decks";
import { cardStatus, nextStatusPatch, STATUS_LABEL, type CardPatch, type CardStatus } from "@/lib/cards/status";
import type { CardPlan } from "@/lib/prices/compute";
import { formatPhp } from "@/lib/format";

export type VisualGroup = { key: string; title: string; copies: number; toBuy: number; cards: DeckCardView[] };

type Shared = {
  groups: VisualGroup[];
  planFor: (c: DeckCardView) => CardPlan | undefined;
  showPrices: boolean;
  showStatus: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onPatch: (c: DeckCardView, patch: CardPatch) => void;
};

const RING: Record<CardStatus, string> = {
  owned: "",
  proxy: "ring-2 ring-proxy",
  missing: "",
};

const DOT: Record<CardStatus, string> = {
  owned: "bg-owned border-owned",
  proxy: "bg-proxy border-proxy",
  missing: "bg-black/40 border-missing",
};

function priceLabel(c: DeckCardView, plan: CardPlan | undefined): string | null {
  const status = cardStatus(c);
  if (status !== "missing") return null;
  if (plan?.allocations.length) return formatPhp(plan.cost);
  if (plan?.priceOnStoreOnly) return "on store";
  return plan ? "sold out" : null;
}

function GroupHeader({ g, showPrices }: { g: VisualGroup; showPrices: boolean }) {
  return (
    <h2 className="mb-2 flex items-baseline justify-between gap-2 px-1 text-base">
      <span className="font-semibold">
        {g.title} <span className="font-normal text-muted tabular">({g.copies})</span>
      </span>
      {showPrices && g.toBuy > 0 && <span className="text-sm text-muted tabular">{formatPhp(g.toBuy)} to buy</span>}
    </h2>
  );
}

/**
 * One card image with its status, quantity and price on top. Missing cards are
 * dimmed until hovered; proxies get a violet outline.
 */
function VisualCard({
  c,
  plan,
  showPrices,
  showStatus,
  selected,
  onSelect,
  onHover,
  onPatch,
  compactBadges = false,
}: {
  c: DeckCardView;
  plan: CardPlan | undefined;
  showPrices: boolean;
  showStatus: boolean;
  selected: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
  onPatch: (patch: CardPatch) => void;
  compactBadges?: boolean;
}) {
  const status = cardStatus(c);
  const price = showPrices ? priceLabel(c, plan) : null;
  return (
    <div
      className={`group relative aspect-[488/680] w-full rounded-[4.75%/3.5%] ${showStatus ? RING[status] : ""} ${selected ? "outline outline-3 outline-offset-2 outline-sun" : ""}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <button
        onClick={onSelect}
        className="absolute inset-0 overflow-hidden rounded-[4.75%/3.5%]"
        aria-label={`Edit ${c.card.name}`}
      >
        {c.card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.card.imageUrl}
            alt={c.card.name}
            loading="lazy"
            className={`h-full w-full object-cover transition ${showStatus && status === "missing" ? "opacity-75 grayscale-[60%] group-hover:opacity-100 group-hover:grayscale-0" : ""}`}
          />
        ) : (
          <span className="flex h-full items-center justify-center bg-surface-2 p-2 text-center text-sm">
            {c.card.name}
          </span>
        )}
      </button>

      {/* Status dot: tap to change */}
      {showStatus && (
        <button
          onClick={() => onPatch(nextStatusPatch(c))}
          title={`${STATUS_LABEL[status]}. Tap to change.`}
          aria-label={`${c.card.name}: ${STATUS_LABEL[status]}. Tap to change.`}
          className={`absolute flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm ${compactBadges ? "right-[3%] top-[2.5%] h-6 w-6" : "right-[6%] top-[11%] h-7 w-7"}`}
        >
          <span className={`h-3 w-3 rounded-full border-2 ${DOT[status]}`} />
        </button>
      )}

      {c.quantity > 1 && (
        <span
          className={`absolute rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold text-white tabular ${compactBadges ? "left-[3%] top-[2.5%]" : "left-[6%] top-[11%]"}`}
        >
          {c.ownedQty > 0 && c.ownedQty < c.quantity ? `${c.ownedQty}/${c.quantity}` : `${c.quantity}×`}
        </span>
      )}

      {(price || (showStatus && status === "proxy")) && (
        <span
          className={`absolute bottom-[5%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold shadow ${
            showStatus && status === "proxy" ? "bg-proxy text-white" : "bg-black/75 text-white"
          }`}
        >
          {showStatus && status === "proxy" ? "PROXY" : price}
        </span>
      )}
    </div>
  );
}

/** Card images in a responsive grid; "spoiler" is bigger and adds a caption under each card. */
export function GalleryView({ size, ...p }: Shared & { size: "grid" | "spoiler" }) {
  const cols =
    size === "spoiler"
      ? "grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]"
      : "grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]";
  return (
    <div className="space-y-6">
      {p.groups.map((g) => (
        <section key={g.key}>
          <GroupHeader g={g} showPrices={p.showPrices} />
          <div className={`grid gap-3 ${cols}`}>
            {g.cards.map((c) => (
              <div key={c.id}>
                <VisualCard
                  c={c}
                  plan={p.planFor(c)}
                  showPrices={p.showPrices}
                  showStatus={p.showStatus}
                  selected={p.selectedId === c.id}
                  onSelect={() => p.onSelect(c.id)}
                  onHover={(on) => p.onHover(on ? c.id : null)}
                  onPatch={(patch) => p.onPatch(c, patch)}
                  compactBadges={size === "grid"}
                />
                {size === "spoiler" && (
                  <div className="mt-1.5 flex items-baseline justify-between gap-2 px-0.5 text-sm">
                    <span className="truncate">{c.card.name}</span>
                    <span
                      className={`shrink-0 text-xs ${cardStatus(c) === "owned" ? "text-owned" : cardStatus(c) === "proxy" ? "text-proxy" : "text-missing"}`}
                    >
                      {STATUS_LABEL[cardStatus(c)]}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Each card in a stack shows only its top strip (the name bar) until hovered.
const CARD_RATIO = 680 / 488;
/** Visible part of each stacked card, as a fraction of card width (about the name bar). */
const STRIP = 0.19;

function Stack({ cards, ...p }: Omit<Shared, "groups"> & { cards: DeckCardView[] }) {
  return (
    <div className="w-[var(--cw)]">
      {cards.map((c, i) => (
        <div
          key={c.id}
          className="relative transition-transform hover:z-20 hover:-translate-y-1"
          style={{ marginTop: i === 0 ? 0 : `calc(var(--cw) * ${STRIP - CARD_RATIO})`, zIndex: i }}
        >
          <VisualCard
            c={c}
            plan={p.planFor(c)}
            showPrices={p.showPrices}
            showStatus={p.showStatus}
            selected={p.selectedId === c.id}
            onSelect={() => p.onSelect(c.id)}
            onHover={(on) => p.onHover(on ? c.id : null)}
            onPatch={(patch) => p.onPatch(c, patch)}
            compactBadges
          />
        </div>
      ))}
    </div>
  );
}

/** Each group is a pile of overlapping cards; "split" breaks tall piles into side-by-side piles. */
export function StacksView({ split, ...p }: Shared & { split: boolean }) {
  const PER_PILE = 8;
  return (
    <div className="flex flex-wrap items-start gap-x-5 gap-y-8 [--cw:165px] sm:[--cw:230px]">
      {p.groups.map((g) => {
        const piles = split
          ? Array.from({ length: Math.ceil(g.cards.length / PER_PILE) }, (_, i) =>
              g.cards.slice(i * PER_PILE, (i + 1) * PER_PILE),
            )
          : [g.cards];
        return (
          <section key={g.key} className="min-w-[var(--cw)]">
            <GroupHeader g={g} showPrices={p.showPrices} />
            <div className="flex items-start gap-3">
              {piles.map((pile, i) => (
                <Stack key={i} cards={pile} {...p} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
