import { SWAP_FEE } from "@/data/assets";
import { giftBrandById } from "@/data/catalog";
import type { Transaction } from "@/data/seed";
import { formatAsset } from "./format";

/** The fee line every receipt and result shows: the amount charged, "Included (1.5%)", or "Free". */
export function feeLine(tx: Transaction): { value: string; free: boolean } {
  if (tx.fee) return { value: `${formatAsset(tx.fee, tx.asset)}${tx.type === "swap" ? ` (${SWAP_FEE * 100}%)` : ""}`, free: false };
  if (tx.type === "giftcard" && tx.direction === "out") {
    const markup = tx.meta?.giftBrand ? giftBrandById(tx.meta.giftBrand).markup : 0;
    return { value: markup ? `Included (${+(markup * 100).toFixed(2)}%)` : "Included", free: false };
  }
  return { value: "Free", free: true };
}
