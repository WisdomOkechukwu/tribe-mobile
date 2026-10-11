import { liveUsd } from "@/utils/rates";
import { assetByCode, NGN_PER_USD, SWAP_FEE, type AssetCode } from "@/data/assets";

export type DisplayCurrency = "USD" | "NGN";

/** Value of `amount` units of `code` in the display currency. */
export function toDisplay(amount: number, code: AssetCode, display: DisplayCurrency) {
  const usd = amount * assetByCode(code).usd;
  return display === "USD" ? usd : usd * NGN_PER_USD;
}

/**
 * Display-currency money. Dollars always show cents; Naira shows kobo below ₦1,000 and whole
 * naira above (₦1,909,600 — never the ragged ₦308,654.5). `exact` keeps 2 decimals (balances).
 */
export function formatMoney(value: number, display: DisplayCurrency, opts: { compact?: boolean; sign?: boolean; exact?: boolean } = {}) {
  const symbol = display === "USD" ? "$" : "₦";
  const abs = Math.abs(value);
  const decimals = display === "USD" || abs < 1000 || opts.exact ? 2 : 0;
  const body =
    opts.compact && abs >= 1_000_000
      ? `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}m`
      : abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const sign = opts.sign ? (value < 0 ? "−" : "+") : value < 0 ? "−" : "";
  return `${sign}${symbol}${body}`;
}

/** Native units, e.g. "0.0142 BTC", "₦308,654.50". */
export function formatAsset(amount: number, code: AssetCode, opts: { sign?: "+" | "−" } = {}) {
  const a = assetByCode(code);
  const d = amount >= 1000 ? Math.min(a.decimals, 2) : a.decimals;
  const num = amount.toLocaleString("en-US", { minimumFractionDigits: a.kind === "fiat" ? 2 : 0, maximumFractionDigits: d });
  const sign = opts.sign ?? "";
  return a.kind === "fiat" ? `${sign}${a.symbol}${num}` : `${sign}${num} ${a.code}`;
}

/** "£1 = ₦2,017.40" for a completed swap, flipped so the left side is the unit worth more. */
export function rateLine(from: AssetCode, to: AssetCode, paid: number, received: number) {
  const r = received / paid;
  const unit = (code: AssetCode) => (assetByCode(code).kind === "fiat" ? `${assetByCode(code).symbol}1` : `1 ${code}`);
  return r >= 1 ? `${unit(from)} = ${formatAsset(r, to)}` : `${unit(to)} = ${formatAsset(1 / r, from)}`;
}

export function quote(amount: number, from: AssetCode, to: AssetCode) {
  const fee = amount * SWAP_FEE;
  // live (demo) prices — the swap screen's countdown refreshes them
  const rate = liveUsd(from) / liveUsd(to);
  return { fee, rate, receive: Math.max(0, (amount - fee) * rate) };
}

export function relativeDate(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function fullDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** "482719305561" → "4827 1930 5561" */
export const groupDigits = (s: string, size = 4) => s.replace(/\D/g, "").replace(new RegExp(`(.{${size}})(?=.)`, "g"), "$1 ");

export const randomDigits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
