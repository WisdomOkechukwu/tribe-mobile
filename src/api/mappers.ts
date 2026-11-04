import { ASSETS, type AssetCode } from "@/data/assets";
import { billerById, giftBrandById } from "@/data/catalog";
import type { InboxItem, InboxKind } from "@/data/inbox";
import { CARD_ADDRESS, type CardFinish, type Transaction, type TxStatus, type TxType, type VaultToken, type VirtualCard } from "@/data/seed";
import type { Beneficiary } from "@/stores/use-beneficiaries-store";
import type { Schedule } from "@/stores/use-recurring-store";
import type { Earning, Withdrawal } from "@/stores/use-referral-store";
import { parseFinish } from "@/utils/card-finish";
import type { BeneficiaryResource, CardResource, DeviceResource, InboxResource, RecurringResource, ReferralsResource, TransactionResource, VaultTokenResource } from "./types";

/**
 * Backend resources → the app's own types. Money arrives as strings; the app's display types
 * hold numbers (formatAsset takes numbers), so `num()` converts at this one boundary. Anything
 * that does maths on money (fees, totals, balance checks) uses `utils/decimal.ts` instead.
 */
export const num = (value: string | number | null | undefined) => {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const CODES = new Set<string>(ASSETS.map((a) => a.code));
export const isAssetCode = (code: unknown): code is AssetCode => typeof code === "string" && CODES.has(code);
const asset = (code: unknown, fallback: AssetCode = "NGN"): AssetCode => (isAssetCode(code) ? code : fallback);

const TYPES: TxType[] = ["receive", "send", "swap", "bill", "giftcard", "card", "cashpoint", "referral"];
const STATUS: Record<string, TxStatus> = { completed: "completed", success: "completed", pending: "pending", processing: "pending", failed: "failed", reversed: "failed", refunded: "failed", cancelled: "cancelled", canceled: "cancelled" };
const CARD_OPS: Record<string, NonNullable<Transaction["meta"]>["cardOp"]> = {
  created: "created",
  card_create: "created",
  funding: "funding",
  fund: "funding",
  card_fund: "funding",
  withdrawal: "withdrawal",
  withdraw: "withdrawal",
  card_withdraw: "withdrawal",
  expense: "expense",
  refund: "refund",
  chargeback: "chargeback",
};

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
/** "4135-2806-2399-2747-2268" → "4135 2806 2399 2747 2268" (the Vault's TokenSlip groups by spaces) */
export const spacedToken = (token: string) => token.replace(/[^0-9]/g, "").replace(/(.{4})(?=.)/g, "$1 ");
const naira = (n: number) => `₦${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function toTransaction(resource: TransactionResource): Transaction {
  let r = resource;
  const m = r.meta ?? {};
  const type: TxType = TYPES.includes(r.type as TxType) ? (r.type as TxType) : r.direction === "in" ? "receive" : "send";
  const toAmount = r.to_amount != null ? num(r.to_amount) : undefined;
  const cardOp = CARD_OPS[str(m.card_op) ?? r.kind] ?? undefined;
  const token = str(m.token);
  const meta: NonNullable<Transaction["meta"]> = {
    billerId: str(m.biller_id),
    token: token ? spacedToken(token) : undefined,
    units: str(m.units),
    giftBrand: str(m.brand_id) ?? str(m.gift_brand),
    code: str(m.code),
    cardId: str(m.card_id),
    network: str(m.network),
    target: str(m.target),
    billCategory: str(m.bill_category) as NonNullable<Transaction["meta"]>["billCategory"],
    meterType: str(m.meter_type) as NonNullable<Transaction["meta"]>["meterType"],
    recurringId: str(m.recurring_id) ?? str(m.recurring_bill_id),
    recipient: str(m.recipient_name) ?? str(m.recipient),
    handle: str(m.handle),
    channel: str(m.channel_name) ?? str(m.channel),
    country: str(m.country),
    scope: str(m.scope) as NonNullable<Transaction["meta"]>["scope"],
    recipientKind: str(m.recipient_kind) as NonNullable<Transaction["meta"]>["recipientKind"],
    eta: str(m.eta),
    merchant: str(m.merchant),
    cardOp,
  };
  // what was bought, in its own terms: a ₦ bill face, the dollars a card got
  if (type === "bill" && toAmount !== undefined) meta.face = naira(toAmount);
  if (type === "card" && toAmount !== undefined) meta.face = cardOp === "withdrawal" ? `−$${toAmount.toFixed(2)} from card` : `+$${toAmount.toFixed(2)} to card`;
  const faceUsd = str(m.face_usd) ?? str(m.face);
  if (type === "giftcard" && faceUsd) meta.face = `$${Number(faceUsd)} ${meta.giftBrand ? giftBrandById(meta.giftBrand).name : "gift"} card`;
  // bills: the plan id → its name, for the title ("MTN 1GB · 7 days")
  const planId = str(m.plan);
  if (type === "bill" && meta.billerId && planId) {
    const plan = billerById(meta.billerId).plans?.find((p) => p.id === planId);
    if (plan && !r.title.includes(plan.name)) r = { ...r, title: `${r.title} ${plan.name}` };
  }
  if (type === "receive" && str(m.sender_name)) meta.sender = { key: `${str(m.sender_kind) ?? "tribe"}:${str(m.sender_handle) ?? m.sender_name}`, name: String(m.sender_name), detail: str(m.sender_handle), kind: (str(m.sender_kind) as "tribe" | "bank" | "wallet") ?? "tribe" };
  // what one unit paid bought (receipts show it as the rate)
  const paidNet = num(r.amount) - (r.fee_asset === r.asset ? num(r.fee) : 0);
  if (toAmount !== undefined && paidNet > 0 && r.to_asset && r.to_asset !== r.asset) meta.rate = toAmount / paidNet;
  // a send that converted on the way (BTC paid, NGN received) and swaps keep their second leg
  const keepsLeg = (type === "swap" || type === "send") && r.to_asset && r.to_asset !== r.asset;
  const fee = num(r.fee);
  for (const k of Object.keys(meta) as (keyof typeof meta)[]) if (meta[k] === undefined) delete meta[k];
  return {
    id: r.id,
    type,
    asset: asset(r.asset),
    amount: num(r.amount),
    direction: r.direction === "in" ? "in" : "out",
    ...(keepsLeg ? { toAsset: asset(r.to_asset), toAmount } : {}),
    title: r.title,
    subtitle: r.failure_reason && r.status === "failed" ? r.failure_reason : r.subtitle,
    status: STATUS[r.status] ?? "pending",
    date: r.date,
    fee: fee > 0 ? fee : undefined,
    reference: r.reference,
    meta,
  };
}

export function toCard(r: CardResource): VirtualCard {
  const address = r.billing_address ?? {};
  const limit = num(r.monthly_limit);
  return {
    id: r.id,
    label: r.label,
    theme: parseFinish(r.design_finish) as CardFinish,
    network: r.network === "visa" ? "visa" : "mastercard",
    holder: r.holder_name,
    online: r.online_payments_enabled,
    currency: "USD",
    last4: r.last_four,
    // the full number and CVV are only ever fetched on demand (POST cards/:id/reveal)
    number: `•••• •••• •••• ${r.last_four}`,
    expiry: r.expiry,
    cvv: "•••",
    balance: num(r.balance),
    frozen: r.frozen,
    // 0 = no limit set on the server; the app shows its default ceiling
    monthlyLimit: limit > 0 ? limit : 1_000,
    // TODO(backend): GET /cards has no month-to-date spend yet
    spentThisMonth: 0,
    address: { street: address.street ?? CARD_ADDRESS.street, city: address.city ?? CARD_ADDRESS.city, state: address.state ?? CARD_ADDRESS.state, postal: address.postal ?? CARD_ADDRESS.postal },
    inWallet: r.in_wallet,
    version: r.version,
  };
}

export const toVaultToken = (r: VaultTokenResource): VaultToken => ({
  id: r.id,
  provider: r.provider,
  meter: r.meter,
  amount: num(r.amount),
  kwh: num(r.kwh),
  token: spacedToken(r.token),
  bought: r.bought,
  loadedOn: r.loaded_on,
  paidWith: isAssetCode(r.paid_with) ? r.paid_with : undefined,
});

const KINDS: InboxKind[] = ["money", "swap", "security", "cashpoint", "referral", "vault", "card", "promo", "support"];
export function toInboxItem(r: InboxResource): InboxItem {
  const href = r.href ?? undefined;
  const txId = href?.startsWith("/transaction/") ? href.slice("/transaction/".length) : str(r.data?.transaction_id);
  return {
    id: r.id,
    kind: KINDS.includes(r.kind as InboxKind) ? (r.kind as InboxKind) : "money",
    title: r.title,
    body: r.body,
    date: r.created_at,
    read: !!r.read_at,
    href,
    txId,
    asset: isAssetCode(r.data?.asset) ? r.data.asset : undefined,
    tier: tierDecision(r.title, href),
  };
}

/** "Tier 3 approved" / "Tier 2 needs attention" (they link to /verify) → the tier and the verdict. */
function tierDecision(title: string, href?: string): InboxItem["tier"] {
  const m = href === "/verify" ? /^Tier (\d) (approved|needs attention)/i.exec(title) : null;
  return m ? { level: Number(m[1]), approved: m[2].toLowerCase() === "approved" } : undefined;
}

/** Recurring amounts arrive as whole naira strings ("3500.00"). */
export const toSchedule = (r: RecurringResource, planName?: string): Schedule => ({
  id: r.id,
  billerId: r.biller_id,
  target: r.target,
  plan: planName ?? r.plan_id ?? undefined,
  planId: r.plan_id ?? undefined,
  amountNgn: num(r.amount_ngn),
  payWith: asset(r.pay_with_asset),
  frequency: r.frequency,
  nextRun: r.next_run_at,
  active: r.active,
  createdAt: r.created_at,
  lastPaid: r.last_paid_at ?? undefined,
  version: r.version,
});

export const toReferrals = (r: ReferralsResource): { balance: number; earnings: Earning[]; withdrawals: Withdrawal[]; code: string; invited: number } => ({
  code: r.code,
  invited: r.invited,
  balance: num(r.balance),
  earnings: r.earnings.map((e) => ({ id: e.id, friend: e.friend, what: e.what, amount: num(e.amount), date: e.date })),
  withdrawals: r.withdrawals.map((w) => ({ id: w.id, amountNgn: num(w.amount_ngn), to: asset(w.to), received: num(w.amount_ngn), txId: w.tx_id, date: w.date })),
});

export const toBeneficiary = (r: BeneficiaryResource): Beneficiary => ({
  id: r.id,
  kind: r.kind,
  name: r.name,
  handle: r.handle,
  asset: asset(r.asset_code),
  channelId: r.channel_id ?? undefined,
  network: r.network ?? undefined,
  country: r.country ?? undefined,
  details: r.details ?? undefined,
});

/** A phone in Me › Devices: the active one, then the ones it replaced. */
export type Device = { id: string; name: string; /** the phone itself, without "This" */ model: string; platform: string; detail: string; current: boolean; active: boolean; status: string; lastActive: string };

const PLATFORM: Record<string, string> = { ios: "Tribe for iOS", android: "Tribe for Android", web: "Tribe on the web" };
export const toDevice = (r: DeviceResource): Device => ({
  id: r.id,
  name: r.is_current ? `This ${r.model || r.name || "phone"}` : r.name || r.model || "Phone",
  model: r.model || r.name || "Phone",
  platform: r.platform,
  detail: [PLATFORM[r.platform] ?? r.platform, r.model && r.name !== r.model ? r.model : null].filter(Boolean).join(" · "),
  current: r.is_current,
  active: r.status === "active",
  status: r.status,
  lastActive: r.last_seen_at ?? r.created_at,
});
