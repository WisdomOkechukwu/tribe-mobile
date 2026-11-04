import { dec, decAdd, decMul, decToNumber, decToString } from "@/utils/decimal";
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
    /** units of the second leg per unit paid (net of fees), from the API's amounts: ₦ per $ on a bill paid in USD, $ per ₦ on a card funded in NGN */
    rate?: number;
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
  /** the server's row version (optimistic locking on PATCH cards/:id) */
  version?: number;
};

export const CARD_ADDRESS: CardAddress = { street: "16 Admiralty Way, Lekki Phase 1", city: "Lekki", state: "Lagos", postal: "106104" };
/** Card fees as the API charges them (creation $1, funding 1%, withdrawals free). The API is the
 * source of truth; these only word the estimate before the PIN. */
export const CARD_FEE_USD = 1;
/** A new card must be funded: the first top-up is at least this much. */
export const CARD_MIN_TOPUP_USD = 5;
/** Funding fee on card top-ups: 1%, to the cent (exact decimal maths). */
export const cardFundingFee = (usd: number) => (usd > 0 ? decToNumber(dec(decToString(decMul(dec(usd), dec("0.01")), 2))) : 0);
/** First top-up + creation fee + funding fee, in USD. */
export const cardCreateTotal = (usd: number) => decToNumber(decAdd(dec(usd), dec(CARD_FEE_USD), dec(cardFundingFee(usd))));
/** Top-up + funding fee, in USD. */
export const cardFundTotal = (usd: number) => decToNumber(decAdd(dec(usd), dec(cardFundingFee(usd))));

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
