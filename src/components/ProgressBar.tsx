/** Owned copies in green, proxied copies in violet, the rest is what's left to buy. */
export function ProgressBar({ owned, proxied = 0, total }: { owned: number; proxied?: number; total: number }) {
  const ownedPct = total ? (owned / total) * 100 : 0;
  const proxyPct = total ? (proxied / total) * 100 : 0;
  const toBuy = Math.max(0, total - owned - proxied);
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>
          <span className="font-semibold tabular">{owned}</span> of <span className="tabular">{total}</span> cards owned
        </span>
        <span className="text-muted tabular">{Math.round(ownedPct)}%</span>
      </div>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={owned}
        aria-label={`${owned} of ${total} cards owned`}
      >
        <div className="h-full bg-owned transition-[width]" style={{ width: `${ownedPct}%` }} />
        <div
          className="h-full bg-proxy transition-[width]"
          style={{
            width: `${proxyPct}%`,
            backgroundImage: "repeating-linear-gradient(45deg, transparent 0 4px, rgba(255,255,255,0.25) 4px 8px)",
          }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted tabular">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-owned" /> {owned} owned
        </span>
        {proxied > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-proxy" /> {proxied} proxy
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-surface-2 ring-1 ring-border" /> {toBuy} to buy
        </span>
      </div>
    </div>
  );
}
