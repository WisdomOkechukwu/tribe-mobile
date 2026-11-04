import { useEffect, useState } from "react";
import type { AssetCode } from "@/data/assets";
import { useRatesStore } from "@/stores/use-rates-store";

/**
 * Live prices for display. They come only from the API's rate collector (`GET rates` /
 * `GET rates/stream`, kept in memory in `use-rates-store`). There is no on-device price: until
 * the server's rates arrive these return NaN, and screens show a skeleton or "—" and keep money
 * buttons disabled (`rateReady` / `hasRates`). Binding prices for money movements come from
 * `POST quotes` (see use-flow-store), so the review shows an estimate that the quote then locks.
 */

/** USD value of one unit of `code`; NaN until the server's rate for it has arrived. */
export function usdRate(code: AssetCode, version?: number) {
  void version;
  const live = useRatesStore.getState().rates[code]?.usd;
  return live && live > 0 ? live : NaN;
}

/** Naira per US dollar; NaN until the server's rates have arrived. */
export function ngnPerUsd(version?: number) {
  void version;
  const live = useRatesStore.getState().rates.USD?.ngn;
  return live && live > 0 ? live : NaN;
}

/** Today's move in percent; undefined until the server's rate for it has arrived (hide it). */
export function changeToday(code: AssetCode, version?: number): number | undefined {
  void version;
  return useRatesStore.getState().rates[code]?.change;
}

/** True once the server's rate for every one of `codes` has arrived. */
export function rateReady(codes: AssetCode | AssetCode[], version?: number) {
  return (Array.isArray(codes) ? codes : [codes]).every((c) => Number.isFinite(usdRate(c, version)));
}

/** True once a server rates snapshot is loaded (Naira per dollar included). */
export function hasRates(version?: number) {
  return Number.isFinite(ngnPerUsd(version));
}

/** How long the API honours a quote (POST quotes → expires_at). */
export const QUOTE_SECONDS = 30;

/**
 * Re-renders every second with the seconds left until `expiresAt` (a quote's expiry), or in the
 * current 30-second window when there's no quote yet. Keep it in small leaf components.
 */
export function useQuoteClock(expiresAt?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (expiresAt) {
    const left = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
    return { left: Math.min(QUOTE_SECONDS, left) };
  }
  return { left: QUOTE_SECONDS - Math.floor((now / 1000) % QUOTE_SECONDS) };
}
