import type { AssetCode } from "./assets";

export type TxType = "receive" | "send" | "swap" | "bill" | "giftcard" | "card" | "cashpoint" | "referral";
export type TxStatus = "completed" | "pending" | "failed" | "cancelled";

export type Transaction = {
  id: string;
  type: TxType;
  /** asset that left (out) or arrived (in); for swaps this is the FROM asset */
  asset: AssetCode;
  amount: number;
  direction: "in" | "out";
  /** swaps, and sends converted on the way (what the recipient got) */
  toAsset?: AssetCode;
  toAmount?: number;
  title: string;
  subtitle: string;
  status: TxStatus;
  date: string;
  fee?: number;
  reference: string;
  meta?: {
    billerId?: string;
    token?: string;
    units?: string;
    giftBrand?: string;
    code?: string;
    cardId?: string;
    network?: string;
    /** what was bought or sold, in its own terms — "₦15,000" token, "$50 Steam card" */
    face?: string;
    /** bills: the full phone / meter / smartcard number paid for, and which kind of bill */
    target?: string;
    billCategory?: "airtime" | "data" | "tv" | "electricity";
    /** electricity: prepaid gets a token; postpaid pays the account */
    meterType?: "prepaid" | "postpaid";
    /** recurring schedule that created this payment */
    recurringId?: string;
    /** sends: who, how and where */
    recipient?: string;
    handle?: string;
    channel?: string;
    country?: string;
    scope?: "local" | "global" | "crypto";
    recipientKind?: "tribe" | "bank" | "wallet";
    eta?: string;
    /** money in: who sent it. `key` groups every payment from the same sender (receipt → "More from…") */
    sender?: { key: string; name: string; detail?: string; kind: "tribe" | "bank" | "wallet" };
    /** card activity: merchant and what kind of card movement */
    merchant?: string;
    cardOp?: "funding" | "withdrawal" | "expense" | "refund" | "chargeback" | "created";
  };
};

// Demo-only values. Never shown in UI copy — testers read them here.
export const DEMO = {
  /** fallback transaction PIN if none was set (signup normally sets one) */
  pin: "1234",
  takenTags: ["tolu", "ada", "tribe", "chiamaka", "kwame"],
  /** the seeded account: sign in with these (or with the account created on this device) */
  account: { email: "ada@tribe.africa", password: "Tribe@2026" },
  /** emails that "already exist" at signup */
  takenEmails: ["ada@tribe.africa", "tolu@tribe.africa", "hello@tribe.africa"],
  /** phone numbers that "already exist" at signup (digits after the dial code) */
  takenPhones: ["8035550142", "8030000000"],
  /** email codes: any 4 digits verify except this one, which reads as expired */
  badEmailCode: "0000",
  /** Cashpoint codes the redeem screen rejects (anything else redeems ₦5,000) */
  cashpointInvalid: "000000000000",
  cashpointUsed: "111111111111",
} as const;

export const SEED_USER = {
  firstName: "Ada",
  lastName: "Okafor",
  tag: "ada",
  phone: "+234 803 555 0142",
  email: "ada@tribe.africa",
};

/** Accounts open at signup. NGN is always open; every other currency is opened in-app (add-currency flow). */
export const SEED_OPENED: AssetCode[] = ["NGN", "USD", "GBP", "EUR", "USDT", "BTC", "ETH", "USDC", "SOL"];

export const SEED_BALANCES: Record<AssetCode, number> = {
  NGN: 308_654.5,
  USD: 1_240,
  GBP: 318.2,
  EUR: 96.75,
  KES: 0,
  GHS: 0,
  CAD: 0,
  USDT: 812.4,
  BTC: 0.0142,
  ETH: 0.2,
  USDC: 140,
  SOL: 1.85,
};

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const ref = (n: number) => `TRB-${(482_190 + n * 7_919).toString(36).toUpperCase()}`;

const UPWORK = { key: "bank:upwork", name: "Upwork Inc.", detail: "Bank of America •• 3021", kind: "bank" } as const;
const TUNDE = { key: "tribe:tunde", name: "Tunde Bakare", detail: "@tunde", kind: "tribe" } as const;
const BINANCE_TRC20 = { key: "trc20:TXk3…9QpL", name: "TXk3…9QpL", detail: "Tron wallet", kind: "wallet" } as const;

/** Seed deposits added after v4, for the "More from this sender" receipts (wallet store migration). */
export const SENDER_SEED_IDS = ["t23", "t24", "t25", "t26", "t27"];

export function seedTransactions(): Transaction[] {
  return ([
    { id: "t1", type: "swap", asset: "USDT", amount: 250, direction: "out", toAsset: "NGN", toAmount: 383_075, title: "Swapped USDT → NGN", subtitle: "Rate ₦1,540", status: "completed", date: ago(18), fee: 1.25, reference: ref(1) },
    { id: "t2", type: "bill", asset: "NGN", amount: 15_000, direction: "out", title: "PHED Prepaid", subtitle: "Paid with NGN · 34.2 kWh", status: "completed", date: ago(95), reference: ref(2), meta: { billerId: "phed", token: "4821 0937 5512 8846 3307", units: "34.2 kWh", face: "₦15,000" } },
    { id: "t3", type: "receive", asset: "USD", amount: 450, direction: "in", title: "Upwork Inc.", subtitle: "ACH transfer", status: "completed", date: ago(240), reference: ref(3), meta: { channel: "ACH", sender: UPWORK } },
    { id: "t4", type: "cashpoint", asset: "NGN", amount: 5_000, direction: "out", title: "Cashpoint generated", subtitle: "Redeemed by @tolu", status: "completed", date: ago(60 * 9), reference: ref(4), meta: { code: "4827 1930 5561" } },
    { id: "t5", type: "receive", asset: "BTC", amount: 0.0042, direction: "in", title: "Received Bitcoin", subtitle: "Bitcoin network", status: "completed", date: ago(60 * 26), reference: ref(5), meta: { network: "Bitcoin", sender: { key: "btc:bc1qxy…0wlh", name: "bc1qxy…0wlh", detail: "Bitcoin wallet", kind: "wallet" } } },
    { id: "t6", type: "card", asset: "USD", amount: 15.49, direction: "out", title: "Netflix", subtitle: "Virtual card •• 4821", status: "completed", date: ago(60 * 30), reference: ref(6), meta: { cardId: "c1", merchant: "Netflix.com", cardOp: "expense" } },
    { id: "t18", type: "card", asset: "USD", amount: 2.99, direction: "out", title: "Apple iCloud+", subtitle: "Virtual card •• 4821", status: "completed", date: ago(60 * 20), reference: ref(18), meta: { cardId: "c1", merchant: "Apple Services", cardOp: "expense" } },
    { id: "t19", type: "card", asset: "USD", amount: 10.99, direction: "out", title: "Spotify Premium", subtitle: "Virtual card •• 4821", status: "completed", date: ago(60 * 96), reference: ref(19), meta: { cardId: "c1", merchant: "Spotify AB", cardOp: "expense" } },
    { id: "t20", type: "card", asset: "USD", amount: 4.99, direction: "in", title: "AliExpress refund", subtitle: "Virtual card •• 4821", status: "completed", date: ago(60 * 130), reference: ref(20), meta: { cardId: "c1", merchant: "AliExpress", cardOp: "refund" } },
    { id: "t21", type: "card", asset: "USD", amount: 19.0, direction: "in", title: "Chargeback · Udemy", subtitle: "Virtual card •• 4821", status: "pending", date: ago(60 * 190), reference: ref(21), meta: { cardId: "c1", merchant: "Udemy", cardOp: "chargeback" } },
    { id: "t7", type: "swap", asset: "BTC", amount: 0.001, direction: "out", toAsset: "USDT", toAmount: 97.91, title: "Swapped BTC → USDT", subtitle: "Rate $98,400", status: "completed", date: ago(60 * 34), fee: 0.000005, reference: ref(7) },
    { id: "t8", type: "giftcard", asset: "USDT", amount: 50.75, direction: "out", title: "Steam gift card", subtitle: "Paid with USDT · code ready", status: "completed", date: ago(60 * 50), reference: ref(8), meta: { giftBrand: "steam", face: "$50 Steam card", code: "7Q2M-4KXP-91LD" } },
    { id: "t9", type: "send", asset: "NGN", amount: 20_000, direction: "out", title: "To Chiamaka E.", subtitle: "Bank transfer · GTBank •• 4410", status: "completed", date: ago(60 * 52), fee: 25, reference: ref(9), meta: { recipient: "Chiamaka Eze", handle: "GTBank •• 4410", channel: "Bank transfer", scope: "local", recipientKind: "bank" } },
    { id: "t10", type: "bill", asset: "NGN", amount: 3_500, direction: "out", title: "MTN 10GB data", subtitle: "Paid with NGN · 0803 555 0142", status: "completed", date: ago(60 * 75), reference: ref(10), meta: { billerId: "mtn", face: "₦3,500" } },
    { id: "t11", type: "giftcard", asset: "NGN", amount: 62_000, direction: "in", title: "Sold Apple gift card", subtitle: "Paid out in NGN · ₦1,240/$", status: "pending", date: ago(60 * 80), reference: ref(11), meta: { giftBrand: "apple", face: "$50 Apple card" } },
    { id: "t12", type: "swap", asset: "NGN", amount: 154_000, direction: "out", toAsset: "USD", toAmount: 99.5, title: "Swapped NGN → USD", subtitle: "Rate ₦1,540", status: "completed", date: ago(60 * 100), reference: ref(12) },
    { id: "t13", type: "receive", asset: "USDT", amount: 300, direction: "in", title: "Received USDT", subtitle: "Tron (TRC20)", status: "completed", date: ago(60 * 120), reference: ref(13), meta: { network: "TRC20", sender: BINANCE_TRC20 } },
    { id: "t14", type: "send", asset: "ETH", amount: 0.05, direction: "out", title: "Sent Ethereum", subtitle: "Ethereum (ERC20) · 0x71C…9A3f", status: "failed", date: ago(60 * 140), fee: 0.0012, reference: ref(14), meta: { recipient: "ETH wallet", handle: "0x71C…9A3f", network: "Ethereum (ERC20)", scope: "crypto", recipientKind: "wallet" } },
    { id: "t15", type: "bill", asset: "NGN", amount: 15_700, direction: "out", title: "DStv Compact", subtitle: "Paid with NGN · Smartcard •• 3317", status: "completed", date: ago(60 * 170), reference: ref(15), meta: { billerId: "dstv", face: "₦15,700" } },
    { id: "t17", type: "card", asset: "USDT", amount: 100, direction: "out", title: "Card top-up", subtitle: "Funded from USDT · Everyday •• 4821", status: "completed", date: ago(60 * 44), reference: ref(17), meta: { cardId: "c1", face: "+$100.00 to card" } },
    { id: "t22", type: "referral", asset: "NGN", amount: 3_000, direction: "in", title: "Referral payout", subtitle: "From referral earnings", status: "completed", date: ago(60 * 24 * 12), reference: ref(22), meta: { face: "₦3,000" } },
    // earlier deposits, so a receipt can show "More from this sender"
    { id: "t23", type: "receive", asset: "USD", amount: 380, direction: "in", title: "Upwork Inc.", subtitle: "ACH transfer", status: "completed", date: ago(60 * 24 * 14), reference: ref(23), meta: { channel: "ACH", sender: UPWORK } },
    { id: "t24", type: "receive", asset: "USD", amount: 520, direction: "in", title: "Upwork Inc.", subtitle: "ACH transfer", status: "completed", date: ago(60 * 24 * 29), reference: ref(24), meta: { channel: "ACH", sender: UPWORK } },
    { id: "t25", type: "receive", asset: "NGN", amount: 25_000, direction: "in", title: "Tunde Bakare", subtitle: "Tribe transfer · @tunde", status: "completed", date: ago(60 * 24 * 3), reference: ref(25), meta: { channel: "Tribe transfer", sender: TUNDE } },
    { id: "t26", type: "receive", asset: "NGN", amount: 10_000, direction: "in", title: "Tunde Bakare", subtitle: "Tribe transfer · @tunde", status: "completed", date: ago(60 * 24 * 9), reference: ref(26), meta: { channel: "Tribe transfer", sender: TUNDE } },
    { id: "t27", type: "receive", asset: "USDT", amount: 150, direction: "in", title: "Received USDT", subtitle: "Tron (TRC20)", status: "completed", date: ago(60 * 24 * 20), reference: ref(27), meta: { network: "TRC20", sender: BINANCE_TRC20 } },
    { id: "t16", type: "swap", asset: "GBP", amount: 100, direction: "out", toAsset: "EUR", toAmount: 116.38, title: "Swapped GBP → EUR", subtitle: "Rate €1.17", status: "completed", date: ago(60 * 200), reference: ref(16) },
  ] as Transaction[]).sort((a, b) => b.date.localeCompare(a.date));
}

/** Tribe's seven preset finishes (Virtual Card.png themes, in Tribe colours). */
export type CardTheme = "midnight" | "sunset" | "onyx" | "cream" | "lime" | "forest" | "sky";
/** The patterns a finish can carry (Midnight keeps the logo's own stripes). */
export type CardPattern = "plain" | "lines" | "waves" | "dots" | "rings" | "stripes" | "grid" | "diamonds" | "orbits" | "contours" | "sparkles" | "daisies" | "hearts" | "zigzag";
/**
 * How a card looks: a preset ("sunset"), a preset wearing another pattern ("sunset:dots"), or
 * one made in "Make your own" ("custom:RRGGBB:pattern"). A plain string, so it travels as a
 * route param and persists as-is. Read it with `cardLook()`.
 */
export type CardFinish = CardTheme | `${CardTheme}:${CardPattern}` | `custom:${string}:${CardPattern}`;
export type CardNetwork = "mastercard" | "visa";
export type CardAddress = { street: string; city: string; state: string; postal: string };

export type VirtualCard = {
  id: string;
  label: string;
  theme: CardFinish;
  network: CardNetwork;
  holder: string;
  /** online & international payments allowed */
  online: boolean;
  currency: "USD";
  last4: string;
  number: string;
  expiry: string;
  cvv: string;
  balance: number;
  frozen: boolean;
  monthlyLimit: number;
  spentThisMonth: number;
  address: CardAddress;
  /** added to Apple Pay / Google Pay on this phone (simulated: Cards › Wallet & payments) */
  inWallet?: boolean;
};

export const CARD_ADDRESS: CardAddress = { street: "16 Admiralty Way, Lekki Phase 1", city: "Lekki", state: "Lagos", postal: "106104" };
export const CARD_FEE_USD = 1;
/** A new card must be funded: the first top-up is at least this much. */
export const CARD_MIN_TOPUP_USD = 5;
/** Funding fee on card top-ups (illustrative): 1%, at least $0.50. Withdrawals are free. */
export const cardFundingFee = (usd: number) => (usd > 0 ? Math.max(0.5, Math.round(usd * 1) / 100) : 0);

export const SEED_CARDS: VirtualCard[] = [
  { id: "c1", label: "Everyday", theme: "midnight", network: "mastercard", holder: "Ada Okafor", online: true, currency: "USD", last4: "4821", number: "5399 2810 7712 4821", expiry: "09/29", cvv: "713", balance: 184.51, frozen: false, monthlyLimit: 1_000, spentThisMonth: 312.4, address: CARD_ADDRESS },
];

export type VaultToken = {
  id: string;
  provider: string;
  meter: string;
  amount: number;
  kwh: number;
  token: string;
  bought: string;
  loadedOn: string | null;
  /** the balance that paid, and how much of it (absent on older tokens = paid in naira) */
  paidWith?: AssetCode;
  paid?: number;
};

export const SEED_TOKENS: VaultToken[] = [
  { id: "v1", provider: "PHED Prepaid", meter: "4502 •••• 19", amount: 15_000, kwh: 34.2, token: "4821 0937 5512 8846 3307", bought: ago(95), loadedOn: null, paidWith: "NGN", paid: 15_000 },
  { id: "v2", provider: "PHED Prepaid", meter: "4502 •••• 19", amount: 10_000, kwh: 22.8, token: "1176 4420 9083 5531 0648", bought: ago(60 * 70), loadedOn: null, paidWith: "USDT", paid: 6.49 },
  { id: "v3", provider: "PHED · Mum's house", meter: "0137 •••• 82", amount: 20_000, kwh: 45.6, token: "6630 2814 7759 0412 9925", bought: ago(60 * 24 * 12), loadedOn: ago(60 * 24 * 11) },
];
