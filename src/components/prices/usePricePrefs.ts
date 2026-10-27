"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { PricePrefs } from "@/lib/prices/compute";

const KEY = "ph-deck-tracker:price-prefs";
const DEFAULTS: PricePrefs = { preferNonfoil: false, ignoreDamaged: false };
const listeners = new Set<() => void>();
let cached: { raw: string | null; value: PricePrefs } = { raw: null, value: DEFAULTS };

function read(): PricePrefs {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // storage unavailable (private mode etc.): use defaults
  }
  if (raw !== cached.raw) {
    try {
      cached = { raw, value: raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS };
    } catch {
      cached = { raw, value: DEFAULTS };
    }
  }
  return cached.value;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Price preferences, remembered in this browser. */
export function usePricePrefs() {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULTS);
  const setPrefs = useCallback((patch: Partial<PricePrefs>) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
    } catch {
      // ignore; the choice just won't persist
    }
    listeners.forEach((l) => l());
  }, []);
  return [prefs, setPrefs] as const;
}
