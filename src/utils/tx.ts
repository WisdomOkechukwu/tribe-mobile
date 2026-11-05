import { assetByCode } from "@/data/assets";
import { billerById, giftBrandById } from "@/data/catalog";
import { countryByIso } from "@/data/countries";
import type { Transaction, TxType } from "@/data/seed";
import { useCardsStore } from "@/stores/use-cards-store";
import { feeLine } from "./fees";
import { formatAsset, fullDate, rateLine } from "./format";

/** History tabs (Transaction.png): Naira at home, crypto, or any other currency. */
export type TxScope = "local" | "crypto" | "global";

export function txScope(tx: Transaction): TxScope {
  const kinds = [tx.asset, tx.toAsset].filter(Boolean).map((c) => assetByCode(c!).kind);
  if (kinds.includes("crypto")) return "crypto";
  if (tx.meta?.scope === "global" || tx.type === "card") return "global";
  const codes = [tx.asset, tx.toAsset].filter(Boolean);
  return codes.every((c) => c === "NGN") ? "local" : "global";
}

export const TYPE_LABEL: Record<TxType, string> = {
  receive: "Deposit",
  send: "Send",
  swap: "Swap",
  bill: "Bill payment",
  giftcard: "Gift card",
  card: "Card",
  cashpoint: "Cashpoint",
  referral: "Referral payout",
};

/**
 * What a transaction is called in lists and receipts. Swaps read "USD to USDT" (the amounts
 * beside them say how much) instead of the stored "Swapped USD → USDT", which truncated.
 */
export function txTitle(tx: Transaction) {
  if (tx.type === "swap" && tx.toAsset) return `${tx.asset} to ${tx.toAsset}`;
  return tx.title;
}

/** The line under the title: swaps show the rate they actually got ("1 USDT = ₦1,532.30"). */
export function txSubtitle(tx: Transaction) {
  if (tx.type === "swap" && tx.toAsset && tx.toAmount && tx.amount) return rateLine(tx.asset, tx.toAsset, tx.amount, tx.toAmount);
  return tx.subtitle;
}

/** What kind of card movement a card transaction is. */
export function cardOp(tx: Transaction) {
  if (tx.meta?.cardOp) return tx.meta.cardOp;
  if (tx.title === "Card top-up") return "funding";
  if (tx.title === "Card withdrawal") return "withdrawal";
  if (tx.title === "New virtual card") return "created";
  if (tx.title.startsWith("Card deleted")) return "refund";
  return "expense";
}

const CARD_OP_LABEL = { funding: "Card funding", withdrawal: "Card withdrawal", expense: "Card expense", refund: "Card refund", chargeback: "Chargeback", created: "Card creation" } as const;

/** One receipt row; `copy` puts a copy button on it. */
export type ReceiptRow = { label: string; value: string; copy?: string; tone?: "success" };

const cardLabel = (id?: string) => {
  const k = useCardsStore.getState().cards.find((c) => c.id === id);
  return k ? `${k.label} •• ${k.last4}` : "Virtual card";
};

/**
 * "{Type} transaction details" (Transaction.png): the rows each kind of transaction needs —
 * shared by the receipt screen and the shareable receipt image.
 */
export function receiptRows(tx: Transaction): { title: string; rows: ReceiptRow[] } {
  const a = assetByCode(tx.asset);
  const fee = feeLine(tx);
  const feeRow: ReceiptRow = { label: tx.type === "swap" ? "Swap fee" : tx.type === "send" ? "Send fee" : "Fee", value: fee.value, tone: fee.free ? "success" : undefined };
  const ref: ReceiptRow = { label: "Reference", value: tx.reference, copy: tx.reference };
  const date: ReceiptRow = { label: "Date & time", value: fullDate(tx.date) };
  const target = tx.subtitle.split(" · ").slice(1).join(" · ");
  const m = tx.meta ?? {};

  switch (tx.type) {
    case "send": {
      const crypto = a.kind === "crypto" || (tx.toAsset && assetByCode(tx.toAsset).kind === "crypto");
      const rows: ReceiptRow[] = [{ label: "Account debited", value: a.kind === "crypto" ? `${a.code} wallet` : `${a.code} account` }];
      rows.push({ label: "Recipient", value: m.recipient ?? tx.title.replace(/^To /, "") });
      rows.push({ label: crypto ? "Recipient wallet" : m.recipientKind === "tribe" ? "Tribe username" : "Recipient account", value: m.handle || target || tx.subtitle, copy: m.handle });
      if (m.country) rows.push({ label: "Recipient country", value: countryByIso(m.country).name });
      if (tx.toAsset && tx.toAmount !== undefined) {
        rows.push({ label: "Rate", value: rateLine(tx.asset, tx.toAsset, tx.amount, tx.toAmount) }, { label: "Recipient gets", value: formatAsset(tx.toAmount, tx.toAsset) });
      }
      rows.push(feeRow);
      if (m.network) rows.push({ label: "Recipient network", value: m.network });
      else if (m.channel) rows.push({ label: "Channel", value: m.channel });
      rows.push({ label: "Transaction type", value: crypto ? "Crypto send" : m.scope === "global" ? "Global transfer" : "Send transaction" }, ref, date);
      return { title: "Send transaction details", rows };
    }
    case "receive":
      return {
        title: "Deposit details",
        rows: [{ label: "Account credited", value: a.kind === "crypto" ? `${a.code} wallet` : `${a.code} account` }, { label: "From", value: m.sender ? `${m.sender.name}${m.sender.detail ? ` · ${m.sender.detail}` : ""}` : tx.title }, { label: m.network ? "Network" : "Channel", value: m.network ?? tx.subtitle }, feeRow, { label: "Transaction type", value: a.kind === "crypto" ? "Crypto deposit" : "Deposit" }, ref, date],
      };
    case "swap":
      return {
        title: "Swap details",
        rows: [
          { label: "Swapped from", value: formatAsset(tx.amount, tx.asset) },
          ...(tx.toAsset && tx.toAmount !== undefined ? [{ label: "Received", value: formatAsset(tx.toAmount, tx.toAsset) }, { label: "Rate", value: rateLine(tx.asset, tx.toAsset, tx.amount - (tx.fee ?? 0), tx.toAmount) }] : []),
          feeRow,
          { label: "Transaction type", value: "Swap" },
          ref,
          date,
        ],
      };
    case "bill": {
      const b = m.billerId ? billerById(m.billerId) : undefined;
      const kind = b?.category === "electricity" ? "Electricity purchase" : b?.category === "tv" ? "Cable subscription" : b?.category === "data" ? "Data purchase" : "Airtime purchase";
      const field = b?.field === "meter" ? "Meter number" : b?.field === "smartcard" ? "Smartcard number" : "Phone number";
      const rows: ReceiptRow[] = [{ label: "Provider", value: b ? (b.id === "phed" ? "Port Harcourt Electricity (PHED)" : b.name) : "Biller" }];
      if (m.units) rows.push({ label: "Units", value: m.units });
      else if (target) rows.push({ label: field, value: target });
      if (m.face) rows.push({ label: "Amount", value: m.face });
      rows.push({ label: "Paid with", value: `${a.name} (${a.code})` });
      if (tx.asset !== "NGN") rows.push({ label: "Rate", value: `1 ${tx.asset} = ₦${(a.usd / assetByCode("NGN").usd).toLocaleString("en-US", { maximumFractionDigits: 2 })}` });
      if (m.token) rows.push({ label: "Token", value: m.token, copy: m.token.replace(/\s/g, "") });
      rows.push(feeRow, { label: "Transaction type", value: kind }, ref, date);
      return { title: "Utility transaction details", rows };
    }
    case "giftcard": {
      const g = m.giftBrand ? giftBrandById(m.giftBrand) : undefined;
      return {
        title: "Gift card details",
        rows: [
          { label: "Gift card", value: m.face ?? g?.name ?? "Gift card" },
          { label: tx.direction === "in" ? "Paid out in" : "Paid with", value: `${a.name} (${a.code})` },
          ...(tx.direction === "in" && g ? [{ label: "Rate", value: `₦${g.sellRate.toLocaleString()}/$` }] : []),
          ...(m.code ? [{ label: "Redeem code", value: m.code, copy: m.code }] : []),
          feeRow,
          { label: "Transaction type", value: tx.direction === "in" ? "Gift card sale" : "Gift card purchase" },
          ref,
          date,
        ],
      };
    }
    case "card": {
      const op = cardOp(tx);
      const usd = m.face?.split(" ")[0].replace(/^[+−-]/, "") ?? formatAsset(tx.amount, tx.asset);
      const rows: ReceiptRow[] = [{ label: "Card", value: cardLabel(m.cardId) }];
      if (m.merchant || op === "expense") rows.push({ label: "Merchant", value: m.merchant ?? tx.title });
      rows.push({ label: op === "funding" ? "Net funding" : op === "withdrawal" ? "Net withdrawal" : op === "refund" ? "Refund" : op === "chargeback" ? "Chargeback" : op === "created" ? "First top-up" : "Net expense", value: usd });
      if (op === "funding" || op === "created") rows.push({ label: "Account debited", value: `${a.code} ${a.kind === "crypto" ? "wallet" : "account"}` }, { label: "Amount debited", value: formatAsset(tx.amount, tx.asset) });
      if (op === "withdrawal" || op === "refund") rows.push({ label: "Account credited", value: `${a.code} ${a.kind === "crypto" ? "wallet" : "account"}` });
      if ((op === "funding" || op === "withdrawal") && tx.asset !== "USD") rows.push({ label: "Rate", value: `$1 = ${formatAsset(assetByCode("USD").usd / a.usd, tx.asset)}` });
      rows.push(feeRow, { label: "Transaction type", value: CARD_OP_LABEL[op] }, ref, date);
      return { title: `${CARD_OP_LABEL[op]} details`, rows };
    }
    case "cashpoint":
      return {
        title: "Cashpoint details",
        rows: [
          { label: "Amount", value: formatAsset(tx.amount, "NGN") },
          { label: "Status", value: tx.direction === "in" ? "Redeemed into your wallet" : tx.status === "pending" ? "Waiting to be redeemed" : tx.status === "cancelled" ? "Cancelled · refunded" : tx.subtitle },
          ...(m.code ? [{ label: "12-digit code", value: m.code.replace(/\s/g, "").replace(/(.{4})(?=.)/g, "$1 "), copy: m.code.replace(/\s/g, "") }] : []),
          feeRow,
          { label: "Transaction type", value: tx.direction === "in" ? "Cashpoint redeemed" : "Cashpoint generated" },
          ref,
          date,
        ],
      };
    case "referral":
      return {
        title: "Referral payout details",
        rows: [{ label: "From", value: "Referral earnings" }, { label: "Paid into", value: `${a.name} (${a.code})` }, ...(m.face ? [{ label: "Amount withdrawn", value: m.face }] : []), ...(tx.asset !== "NGN" && m.face ? [{ label: "Rate", value: `1 ${tx.asset} = ${formatAsset(a.usd / assetByCode("NGN").usd, "NGN")}` }] : []), feeRow, { label: "Transaction type", value: "Referral withdrawal" }, ref, date],
      };
  }
}

/** The headline number for a transaction: what arrived for swaps, signed amount otherwise. */
export function headline(tx: Transaction) {
  if (tx.type === "swap" && tx.toAsset && tx.toAmount !== undefined) return `+${formatAsset(tx.toAmount, tx.toAsset)}`;
  return `${tx.direction === "in" ? "+" : "−"}${formatAsset(tx.amount, tx.asset)}`;
}

/** Who sent an incoming deposit, with a stable key to group every payment from them. */
export function senderOf(tx: Transaction) {
  if (tx.type !== "receive" || tx.direction !== "in") return null;
  return tx.meta?.sender ?? { key: `title:${tx.title}`, name: tx.title, kind: "bank" as const };
}
