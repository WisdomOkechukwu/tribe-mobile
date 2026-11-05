import { create } from "zustand";
import type { RatesEvent } from "@/api/types";

/** One asset's live price, as numbers for display (the raw strings stay alongside). */
export type Rate = { usd: number; ngn: number; change: number; usdRaw: string; ngnRaw: string };

type RatesState = {
  version: number;
  collectedAt: string | null;
  /** the collector hasn't refreshed in a while: show prices as approximate */
  stale: boolean;
  rates: Record<string, Rate>;
  /** when a newer version arrived while a rate screen was open (drives the "Rates updated" flash) */
  updatedAt: number;
  /** how rates are arriving right now */
  source: "stream" | "polling" | "idle";
  apply: (event: RatesEvent, opts?: { flash?: boolean }) => void;
  setSource: (source: RatesState["source"]) => void;
  reset: () => void;
};

const toNumber = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Live rates from `GET rates/stream` (SSE) or `GET rates`. Memory only: prices are never kept
 * on the device, so every launch waits for the server's (screens show skeletons meanwhile).
 * Read through `useLiveRates()` in screens, or `usdRate()` elsewhere.
 */
export const useRatesStore = create<RatesState>()((set, get) => ({
  version: 0,
  collectedAt: null,
  stale: false,
  rates: {},
  updatedAt: 0,
  source: "idle",
  apply: (event, opts = {}) => {
    // events can arrive out of order (stream + a poll in flight): never go backwards
    if (event.version && event.version < get().version) return;
    const changed = event.version !== get().version;
    const rates: Record<string, Rate> = {};
    for (const [code, r] of Object.entries(event.rates ?? {})) rates[code] = { usd: toNumber(r.usd), ngn: toNumber(r.ngn), change: toNumber(r.change_today_percent), usdRaw: r.usd, ngnRaw: r.ngn };
    set({ version: event.version, collectedAt: event.collected_at, stale: event.is_stale, rates, ...(changed && opts.flash && get().version > 0 ? { updatedAt: Date.now() } : {}) });
  },
  setSource: (source) => set({ source }),
  reset: () => set({ version: 0, collectedAt: null, stale: false, rates: {}, updatedAt: 0 }),
}));
