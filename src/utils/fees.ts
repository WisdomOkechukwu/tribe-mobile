import { SWAP_FEE } from "@/data/assets";
import { GIFT_CARD_BUY_MARKUP } from "@/data/catalog";
import type { Transaction } from "@/data/seed";
import { formatAsset } from "./format";

/** The fee line every receipt and result shows: the amount charged, "Included (1.5%)", or "Free". */
export function feeLine(tx: Transaction): { value: string; free: boolean } {
  if (tx.fee) return { value: `${formatAsset(tx.fee, tx.asset)}${tx.type === "swap" ? ` (${SWAP_FEE * 100}%)` : ""}`, free: false };
  if (tx.type === "giftcard" && tx.direction === "out") return { value: `Included (${GIFT_CARD_BUY_MARKUP * 100}%)`, free: false };
  return { value: "Free", free: true };
}
