import type { Asset } from "./assets";

export type GuideKind = "receive" | "send" | "swap";

/** Plain-language how-tos shown on each currency page. */
export function guideSteps(a: Asset, g: GuideKind): string[] {
  const crypto = a.kind === "crypto";
  if (g === "receive")
    return crypto
      ? [`Tap Receive and pick a network (${a.networks?.map((n) => n.name.split(" ")[0]).join(", ")}).`, `Copy your ${a.code} address or show the QR code.`, "Only send on the network you picked. Funds land after network confirmations."]
      : [`Tap Receive to see your ${a.name} account details.`, "Share them with whoever is paying you, or use them for payouts.", `Money lands in your ${a.code} balance, usually within minutes.`];
  if (g === "send")
    return crypto
      ? ["Tap Send and paste a wallet address, or pick a Tribe @tag for free, instant transfers.", "Choose the network and amount. You see the fee before you confirm.", "Approve with your PIN or Face ID."]
      : [a.code === "NGN" ? "Tap Send and enter a bank account or a Tribe @tag." : `Tap Send and enter the recipient's ${a.code} account or @tag.`, "Enter the amount and check the fee.", "Approve with your PIN. @tag transfers are instant and free."];
  return [`Tap Swap. ${a.code} is set as what you pay with.`, "Pick what you want and enter an amount. The rate is locked for 30 seconds.", "Approve with your PIN. Both balances update instantly (0.5% fee)."];
}
