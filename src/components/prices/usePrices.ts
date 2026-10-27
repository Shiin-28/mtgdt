"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FetchStatus, ListingView, PriceEvent } from "@/lib/prices/types";
import type { StoreInfo } from "@/lib/stores/types";

export type PriceState = {
  stores: StoreInfo[];
  /** listings by cardKey */
  listings: Record<string, ListingView[]>;
  /** fetch status by `${store}|${cardKey}` */
  fetches: Record<string, FetchStatus>;
  loaded: boolean;
  running: boolean;
  /** The user stopped the last check before it finished. */
  stopped: boolean;
  progress: { done: number; total: number };
  error: string | null;
};

const initial: PriceState = {
  stores: [],
  listings: {},
  fetches: {},
  loaded: false,
  running: false,
  stopped: false,
  progress: { done: 0, total: 0 },
  error: null,
};

function groupByCard(listings: ListingView[]) {
  const out: Record<string, ListingView[]> = {};
  for (const l of listings) (out[l.cardKey] ??= []).push(l);
  return out;
}

/** Cached prices for a deck's missing cards, plus streamed refreshes. */
export function usePrices(deckId: string) {
  const [state, setState] = useState<PriceState>(initial);
  const abortRef = useRef<AbortController | null>(null);

  const applyResult = useCallback((e: Extract<PriceEvent, { type: "result" }>) => {
    setState((s) => {
      const key = e.fetch.cardKey;
      const others = (s.listings[key] ?? []).filter((l) => l.store !== e.fetch.store);
      return {
        ...s,
        listings: { ...s.listings, [key]: [...others, ...e.listings] },
        fetches: { ...s.fetches, [`${e.fetch.store}|${key}`]: e.fetch },
        progress: { ...s.progress, done: s.progress.done + 1 },
      };
    });
  }, []);

  const refresh = useCallback(
    async (force: boolean) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setState((s) => ({ ...s, running: true, stopped: false, error: null, progress: { done: 0, total: 0 } }));
      try {
        const res = await fetch(`/api/decks/${deckId}/prices${force ? "?force=1" : ""}`, {
          method: "POST",
          signal: ac.signal,
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as PriceEvent;
            if (event.type === "start") {
              setState((s) => ({ ...s, progress: { done: 0, total: event.jobs } }));
            } else if (event.type === "result") {
              applyResult(event);
            }
          }
        }
      } catch (e) {
        if (ac.signal.aborted) return;
        setState((s) => ({ ...s, error: e instanceof Error ? e.message : "Price check failed" }));
      } finally {
        if (abortRef.current === ac) setState((s) => ({ ...s, running: false }));
      }
    },
    [deckId, applyResult],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/decks/${deckId}/prices`);
        const body = await res.json();
        if (cancelled) return;
        const fetches: Record<string, FetchStatus> = {};
        for (const f of body.fetches as FetchStatus[]) fetches[`${f.store}|${f.cardKey}`] = f;
        setState((s) => ({
          ...s,
          stores: body.stores,
          listings: groupByCard(body.listings),
          fetches,
          loaded: true,
        }));
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loaded: true, error: "Couldn't load cached prices" }));
      }
      // Fill in anything older than 12 hours; cached results stream back instantly.
      if (!cancelled) void refresh(false);
    })();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [deckId, refresh]);

  /** Stop the running check. Each store finishes its current request, then stops. */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((s) => ({ ...s, running: false, stopped: true }));
  }, []);

  return { ...state, refresh, stop };
}
