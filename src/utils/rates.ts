import { useEffect, useState } from "react";
import { assetByCode, type AssetCode } from "@/data/assets";

/** How long a swap quote is honoured before it refreshes (Swap.png's countdown). */
export const QUOTE_SECONDS = 30;

/** Quote window number: rates change only when this does. */
export const quoteTick = (now = Date.now()) => Math.floor(now / (QUOTE_SECONDS * 1000));

const seed = (code: string) => [...code].reduce((n, ch) => n + ch.charCodeAt(0), 0);

/**
 * Demo "live" price: each 30-second window nudges it a little (crypto ±0.4%, fiat ±0.05%,
 * dollar stablecoins pinned), so the quote countdown means something. Deterministic per window,
 * so review, PIN and execution agree. A real build fetches quotes from Tribe's pricing service.
 */
export function liveUsd(code: AssetCode, tick = quoteTick()) {
  const a = assetByCode(code);
  if (code === "USD" || code === "USDT" || code === "USDC") return a.usd;
  const swing = a.kind === "crypto" ? 0.004 : 0.0005;
  return a.usd * (1 + swing * Math.sin(tick * 1.7 + seed(code)));
}

/**
 * Re-renders once per quote window (every 30 s), when rates change — not every second.
 * Screens that price things use this; only `QuoteTimer` ticks each second.
 */
export function useQuoteTick() {
  const [tick, setTick] = useState(() => quoteTick());
  useEffect(() => {
    const msLeft = QUOTE_SECONDS * 1000 - (Date.now() % (QUOTE_SECONDS * 1000));
    const t = setTimeout(() => setTick(quoteTick()), msLeft + 20);
    return () => clearTimeout(t);
  }, [tick]);
  return tick;
}

/** Re-renders every second with the seconds left in the current quote window. Keep it in small leaf components. */
export function useQuoteClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = QUOTE_SECONDS - Math.floor((now / 1000) % QUOTE_SECONDS);
  return { left, tick: quoteTick(now) };
}
