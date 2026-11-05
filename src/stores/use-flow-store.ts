import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { resources } from "@/api/client";
import { api, ApiError, newIdempotencyKey, request } from "@/api/http";
import { toCard, toTransaction } from "@/api/mappers";
import { queryClient, refreshAfterMoney } from "@/api/query-client";
import type { CardResource, QuoteResource, TransactionResource } from "@/api/types";
import { assetByCode, type AssetCode } from "@/data/assets";
import { billerById, giftBrandById } from "@/data/catalog";
import type { CardFinish, CardNetwork, Transaction, VirtualCard } from "@/data/seed";
import { amountString } from "@/utils/decimal";
import { formatAsset } from "@/utils/format";
import { PAY } from "@/utils/pay-platform";
import { apiDecimals } from "./use-catalog-store";
import { useBeneficiariesStore, type BeneficiaryDraft } from "./use-beneficiaries-store";
import { useCardsStore } from "./use-cards-store";
import { FREQUENCY_LABEL, type Frequency } from "./use-recurring-store";
import { useWalletStore } from "./use-wallet-store";

/**
 * Every money movement is described as a PendingAction on the review screen, approved on /pin,
 * executed here against the API, and shown on /success. Routes can't carry functions, so the
 * action lives in this (non-persisted) store between the screens.
 *
 * `execute(pin)` is async and walks: quoting (swaps and converted sends lock a price with
 * POST quotes) → submitting → success | failed. Before anything is sent, the request's
 * Idempotency-Key is saved to SecureStore with a hash of its body: a retry of the same request
 * (the network dropped, the app was killed mid-payment) reuses it, so the server answers with the
 * first result instead of charging twice. A changed body (a different PIN) gets a new key.
 */
export type PendingAction =
  | {
      kind: "send";
      /** what leaves your wallet (amount excludes the fee) */
      asset: AssetCode;
      amount: number;
      fee: number;
      /** what the recipient gets — differs from `asset` when we convert on the way */
      toAsset?: AssetCode;
      toAmount?: number;
      /** converted sends: the side the user typed ("pay" = `amount` is exact, the quote prices what they get) */
      typed?: "pay" | "receive";
      /** @tag, masked account or short address */
      to: string;
      name?: string;
      /** "ACH", "Tribe transfer", "Tron (TRC20)"… */
      channel: string;
      channelId?: string;
      network?: string;
      country?: string;
      scope?: "local" | "global" | "crypto";
      recipientKind?: "tribe" | "bank" | "wallet";
      details?: Record<string, string>;
      beneficiaryId?: string;
      eta?: string;
    }
  | { kind: "swap"; from: AssetCode; to: AssetCode; amount: number; /** the exact amount to land, when that's what was typed (the quote prices `amount`) */ receive?: number; /** funding a just-opened currency (add-currency/fund): worded as "Add money" */ fund?: boolean }
  | {
      kind: "bill";
      billerId: string;
      amountNgn: number;
      payWith: AssetCode;
      /** as shown (meters masked) */
      target: string;
      /** the full number, sent to the API */
      account?: string;
      category?: "airtime" | "data" | "tv" | "electricity";
      /** electricity only; postpaid pays the account and makes no token */
      meterType?: "prepaid" | "postpaid";
      /** the plan's name, for display */
      plan?: string;
      planId?: string;
      recurringId?: string;
    }
  | { kind: "gift-buy"; brandId: string; usd: number; payWith: AssetCode }
  | { kind: "gift-sell"; brandId: string; usd: number; payout: AssetCode; code?: string }
  | { kind: "card-fund"; cardId: string; usd: number; from: AssetCode }
  | { kind: "card-create"; label: string; theme: CardFinish; network: CardNetwork; usd: number; from: AssetCode }
  | { kind: "card-withdraw"; cardId: string; usd: number; to: AssetCode }
  | { kind: "recurring-create"; billerId: string; target: string; plan?: string; planId?: string; amountNgn: number; payWith: AssetCode; frequency: Frequency; start: string }
  | { kind: "cashpoint"; amount: number }
  | { kind: "referral-withdraw"; amountNgn: number; to: AssetCode }
  /** not a payment, but final: deleting a card is approved with the PIN too (its balance is refunded) */
  | { kind: "card-delete"; cardId: string }
  /** PIN-less: money only comes in */
  | { kind: "cashpoint-redeem"; code: string };

/** What a paid bill needs to become a recurring schedule (offered on the success screen). */
export type RecurringOffer = { billerId: string; target: string; plan?: string; planId?: string; amountNgn: number; payWith: AssetCode };

export type FlowResult = {
  /** absent for actions that don't move money (e.g. setting up a recurring bill) */
  tx?: Transaction;
  headline: string;
  detail: string;
  extra?: { label: string; value: string };
  /** an electricity token: the result card offers "I'm loading it now" (files it under Loaded) */
  vaultId?: string;
  recurringOffer?: RecurringOffer;
  /** a send to someone not saved yet: the result card offers "Add to beneficiaries" */
  beneficiary?: BeneficiaryDraft;
  /** a card that was just created: the result card offers "Add to Apple Pay / Google Pay" */
  walletCardId?: string;
  /** a card that was just deleted: the result card shows it fading out */
  retiredCard?: Pick<VirtualCard, "theme" | "network" | "label" | "last4" | "holder">;
  /** the API replayed a saved answer (this exact request already went through) */
  replayed?: boolean;
};

export type FlowStatus = "idle" | "quoting" | "submitting" | "success" | "failed";

type FlowState = {
  pending: PendingAction | null;
  result: FlowResult | null;
  status: FlowStatus;
  error: ApiError | null;
  /** the locked price for a swap / converted send (the review shows it; execute reuses it while valid) */
  quote: QuoteResource | null;
  begin: (action: PendingAction) => void;
  /** price the pending action now (review screen). Safe to call repeatedly. */
  refreshQuote: () => Promise<QuoteResource | null>;
  execute: (pin?: string) => Promise<FlowResult>;
  /** for results made outside execute */
  complete: (result: FlowResult) => void;
  clear: () => void;
};

// ─── idempotency: one saved attempt at a time ───────────────────────────

/** Kept in SecureStore, not AsyncStorage: the body hash comes from a body that holds the 4-digit
 * PIN, so in plain storage it could be reversed by trying all 10,000 PINs. */
const ATTEMPT_KEY = "tribe.flow-attempt";
type Attempt = { actionKey: string; bodyHash: string; key: string; quoteId?: string; quoteExpiresAt?: string; savedAt: number };
/** an unanswered attempt is retried with its key for this long; after that a tap is a new payment */
const ATTEMPT_TTL_MS = 15 * 60_000;

/** Stable JSON (sorted keys), so the same action always gives the same string. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value as object)
      .sort()
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

/** The body is hashed (it holds the PIN): only the digest is saved, and only in SecureStore. */
const digest = (text: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);

async function loadAttempt(): Promise<Attempt | null> {
  try {
    const raw = await SecureStore.getItemAsync(ATTEMPT_KEY);
    const attempt = raw ? (JSON.parse(raw) as Attempt) : null;
    return attempt && Date.now() - (attempt.savedAt ?? 0) < ATTEMPT_TTL_MS ? attempt : null;
  } catch {
    return null;
  }
}
const saveAttempt = (a: Attempt) => SecureStore.setItemAsync(ATTEMPT_KEY, JSON.stringify(a)).catch(() => {});
const dropAttempt = () => SecureStore.deleteItemAsync(ATTEMPT_KEY).catch(() => {});

// ─── quotes ─────────────────────────────────────────────────────────────

/** Which actions are priced with a quote, and how. */
function quoteRequest(a: PendingAction) {
  if (a.kind === "swap" && a.receive !== undefined) return { transaction_type: "swap", from_asset: a.from, to_asset: a.to, receive_amount: amountString(a.receive, apiDecimals(a.to)) };
  if (a.kind === "swap") return { transaction_type: "swap", from_asset: a.from, to_asset: a.to, amount: amountString(a.amount, apiDecimals(a.from)) };
  if (a.kind === "send" && a.toAsset && a.toAsset !== a.asset && a.typed === "pay")
    // the user typed what they pay: the server works out what the recipient gets (no client-side conversion)
    return { transaction_type: "send", from_asset: a.asset, to_asset: a.toAsset, amount: amountString(a.amount, apiDecimals(a.asset)) };
  if (a.kind === "send" && a.toAsset && a.toAsset !== a.asset && a.toAmount !== undefined)
    // the recipient gets exactly what was typed; the quote works out what that costs
    return { transaction_type: "send", from_asset: a.asset, to_asset: a.toAsset, receive_amount: amountString(a.toAmount, apiDecimals(a.toAsset)) };
  return null;
}

const usable = (q: { expires_at?: string; expiresAt?: string } | null | undefined, slackMs = 3_000) => {
  const at = q?.expires_at ?? q?.expiresAt;
  return !!at && new Date(at).getTime() - slackMs > Date.now();
};

// ─── each action as one API call ────────────────────────────────────────

type Call = { path: string; method: "POST" | "DELETE"; body: Record<string, unknown> };

const money = (n: number | string, code: string) => amountString(n, apiDecimals(code));
const naira = (n: number) => amountString(n, 2);
const ymd = (iso: string) => new Date(iso).toISOString().slice(0, 10);

function planIdFor(billerId: string, plan?: string, planId?: string) {
  if (planId) return planId;
  if (!plan) return undefined;
  return billerById(billerId).plans?.find((p) => p.name === plan || p.id === plan)?.id;
}

function buildCall(a: PendingAction, pin: string | undefined, quote: QuoteResource | null): Call {
  const withPin = (body: Record<string, unknown>) => ({ ...body, pin });
  switch (a.kind) {
    case "send": {
      const base = {
        recipient_kind: a.recipientKind ?? "tribe",
        handle: a.to,
        recipient_name: a.name,
        channel_id: a.channelId,
        network: a.network,
        country: a.country,
        details: a.details,
        save_beneficiary: false,
      };
      return { path: "sends", method: "POST", body: withPin(quote ? { ...base, quote_id: quote.id } : { ...base, asset: a.asset, amount: money(a.amount, a.asset) }) };
    }
    case "swap":
      return { path: "swaps", method: "POST", body: withPin({ quote_id: quote!.id }) };
    case "bill":
      return { path: "bills", method: "POST", body: withPin({ biller_id: a.billerId, target: a.account ?? a.target, plan_id: planIdFor(a.billerId, a.plan, a.planId), amount_ngn: naira(a.amountNgn), pay_with: a.payWith }) };
    case "gift-buy":
      return { path: "gift-cards/buy", method: "POST", body: withPin({ brand_id: a.brandId, face_usd: amountString(a.usd, 2), asset: a.payWith }) };
    case "gift-sell":
      return { path: "gift-cards/sell", method: "POST", body: withPin({ brand_id: a.brandId, face_usd: amountString(a.usd, 2), asset: a.payout, code: a.code ?? "" }) };
    case "card-fund":
      return { path: `cards/${a.cardId}/fund`, method: "POST", body: withPin({ amount_usd: amountString(a.usd, 2), asset: a.from }) };
    case "card-withdraw":
      return { path: `cards/${a.cardId}/withdraw`, method: "POST", body: withPin({ amount_usd: amountString(a.usd, 2), asset: a.to }) };
    case "card-create":
      return { path: "cards", method: "POST", body: withPin({ label: a.label.slice(0, 18), network: a.network, design_finish: a.theme, first_top_up: amountString(a.usd, 2), pay_with: a.from }) };
    case "card-delete":
      return { path: `cards/${a.cardId}`, method: "DELETE", body: withPin({}) };
    case "recurring-create":
      return {
        path: "recurring-bills",
        method: "POST",
        body: withPin({ biller_id: a.billerId, target: a.target, plan_id: planIdFor(a.billerId, a.plan, a.planId), amount_ngn: naira(a.amountNgn), pay_with: a.payWith, frequency: a.frequency, start_date: ymd(a.start) }),
      };
    case "cashpoint":
      return { path: "cashpoints", method: "POST", body: withPin({ amount_ngn: naira(a.amount) }) };
    case "referral-withdraw":
      return { path: "referrals/withdraw", method: "POST", body: withPin({ amount_ngn: naira(a.amountNgn) }) };
    case "cashpoint-redeem":
      return { path: "cashpoints/redeem", method: "POST", body: { code: a.code } };
  }
}

/** Send one call with a key that survives retries of the same request. */
async function sendOnce<T>(actionKey: string, call: Call, quote: QuoteResource | null) {
  const bodyHash = await digest(stable({ path: call.path, method: call.method, body: call.body }));
  const saved = await loadAttempt();
  const key = saved && saved.actionKey === actionKey && saved.bodyHash === bodyHash ? saved.key : newIdempotencyKey();
  // saved BEFORE sending: if the app dies mid-request, the retry reuses this key
  await saveAttempt({ actionKey, bodyHash, key, quoteId: quote?.id, quoteExpiresAt: quote?.expires_at, savedAt: saved?.key === key ? saved.savedAt : Date.now() });
  try {
    const res = await request<T>(call.path, { method: call.method, body: call.body, idempotencyKey: key });
    await dropAttempt();
    return res;
  } catch (error) {
    // a final answer (wrong PIN, not enough money…) ends the attempt; a network failure keeps it
    if (!(error instanceof ApiError) || !error.retryable) await dropAttempt();
    throw error;
  }
}

// ─── results: the server's transaction, worded for the result card ──────

const cardLabel = (id: string) => {
  const k = useCardsStore.getState().cards.find((c) => c.id === id);
  return k ? `${k.label} •• ${k.last4}` : "your card";
};

/** The vault id of a fresh token (the API saved it with the bill). */
async function vaultIdFor(token?: string) {
  if (!token) return undefined;
  const digits = token.replace(/\D/g, "");
  try {
    const tokens = await queryClient.fetchQuery({ queryKey: resources.vault.key, queryFn: () => resources.vault.fetch(), staleTime: 0 });
    return tokens.find((t) => t.token.replace(/\D/g, "") === digits)?.id;
  } catch {
    return undefined;
  }
}

async function describe(a: PendingAction, data: unknown, pin: string | undefined, replayed: boolean): Promise<FlowResult> {
  const txOf = (r: unknown) => toTransaction(r as TransactionResource);
  switch (a.kind) {
    case "send": {
      const tx = txOf(data);
      const got = formatAsset(tx.toAmount ?? a.toAmount ?? tx.amount, tx.toAsset ?? a.toAsset ?? a.asset);
      const who = (a.name ?? a.to).replace(/\.$/, "");
      const asset = a.toAsset ?? a.asset;
      const saved = useBeneficiariesStore.getState().has({ asset, handle: a.to });
      const beneficiary: BeneficiaryDraft | undefined = a.beneficiaryId || saved || !a.recipientKind ? undefined : { kind: a.recipientKind, name: who, handle: a.to, asset, channelId: a.channelId, network: a.network, country: a.country, details: a.details };
      return {
        tx,
        beneficiary,
        headline: tx.status === "pending" ? "Transfer submitted" : "Money sent",
        detail: tx.status === "pending" ? `${got} to ${who} by ${a.channel}. Expected: ${a.eta?.toLowerCase() ?? "soon"}.` : `${got} is on its way to ${who}.`,
      };
    }
    case "swap": {
      const tx = txOf(data);
      return { tx, headline: a.fund ? `${a.to} funded` : "Swap complete", detail: `Now in your ${assetByCode(a.to).name} balance.` };
    }
    case "bill": {
      const tx = txOf(data);
      const b = billerById(a.billerId);
      const token = tx.meta?.token;
      const postpaid = b.category === "electricity" && a.meterType === "postpaid";
      const vaultId = await vaultIdFor(token);
      const planId = planIdFor(a.billerId, a.plan, a.planId);
      const recurringOffer = a.recurringId || postpaid ? undefined : { billerId: b.id, target: a.account ?? a.target, plan: a.plan, planId, amountNgn: a.amountNgn, payWith: a.payWith };
      return token
        ? { tx, recurringOffer, vaultId, headline: "Your token is ready", detail: `${tx.meta?.units ?? ""} of ${b.name} electricity`.trim(), extra: { label: "Token", value: token } }
        : { tx, recurringOffer, headline: "Paid", detail: `${b.name} · ${a.target}` };
    }
    case "gift-buy": {
      const r = data as { transaction: TransactionResource; code: string };
      const tx = txOf(r.transaction);
      const brand = giftBrandById(a.brandId);
      tx.meta = { ...tx.meta, code: r.code };
      return { tx, headline: "Your card is ready", detail: `${brand.name} $${a.usd}`, extra: { label: "Redeem code", value: r.code } };
    }
    case "gift-sell": {
      const tx = txOf(data);
      const brand = giftBrandById(a.brandId);
      return { tx, headline: tx.status === "pending" ? "Card submitted" : "Card sold", detail: tx.status === "pending" ? `We're verifying it. ${formatAsset(tx.amount, tx.asset)} lands in minutes.` : `${formatAsset(tx.amount, tx.asset)} for your ${brand.name} card is in your ${assetByCode(tx.asset).name} balance.` };
    }
    case "card-fund": {
      const tx = txOf(data);
      const usd = amountString(a.usd, 2);
      return { tx, headline: "Card funding successful", detail: `$${usd} is on ${cardLabel(a.cardId)}. You can now pay online with ease.` };
    }
    case "card-withdraw": {
      const tx = txOf(data);
      return { tx, headline: "Card withdrawal successful", detail: `$${amountString(a.usd, 2)} moved from your card to your ${assetByCode(a.to).name} balance.` };
    }
    case "card-create": {
      const r = data as { card: CardResource; transaction: TransactionResource };
      const card = toCard(r.card);
      useCardsStore.getState().setCards([...useCardsStore.getState().cards.filter((c) => c.id !== card.id), card]);
      useCardsStore.getState().select(card.id);
      const tx = txOf(r.transaction);
      return {
        tx,
        walletCardId: card.id,
        headline: "Your card is ready",
        detail: `${card.label} •• ${card.last4} works anywhere online. Add it to ${PAY.name} to tap and pay with your phone.`,
      };
    }
    case "card-delete": {
      const tx = txOf(data);
      const gone = useCardsStore.getState().cards.find((c) => c.id === a.cardId);
      const name = gone ? `${gone.label} •• ${gone.last4}` : "Your card";
      const retiredCard = gone ? { theme: gone.theme, network: gone.network, label: gone.label, last4: gone.last4, holder: gone.holder } : undefined;
      useCardsStore.getState().setCards(useCardsStore.getState().cards.filter((c) => c.id !== a.cardId));
      const refunded = tx.amount > 0;
      return {
        tx: refunded ? tx : undefined,
        retiredCard,
        headline: "Card deleted",
        detail: refunded ? `${name} no longer works. Its ${formatAsset(tx.amount, "USD")} is back in your USD wallet.` : `${name} no longer works anywhere it was saved.`,
      };
    }
    case "recurring-create": {
      const b = billerById(a.billerId);
      const when = new Date(a.start).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      return { headline: "Recurring bill on", detail: `${b.name}${a.plan ? ` ${a.plan}` : ""} renews ${FREQUENCY_LABEL[a.frequency].toLowerCase()} from ${when}, paid with ${a.payWith}.` };
    }
    case "cashpoint": {
      const r = data as { id: string; code: string; amount: string; transaction_id: string };
      // the create answer has no transaction: fetch it for the receipt
      let tx: Transaction;
      try {
        tx = txOf((await api.get<{ transaction: TransactionResource }>(`transactions/${r.transaction_id}`)).transaction);
      } catch {
        tx = { id: r.transaction_id, type: "cashpoint", asset: "NGN", amount: Number(r.amount), direction: "out", title: "Cashpoint code", subtitle: "Waiting to be redeemed", status: "pending", date: new Date().toISOString(), reference: "" };
      }
      tx.meta = { ...tx.meta, code: r.code };
      return {
        tx,
        headline: "Cashpoint ready",
        detail: `Share this code with anyone. It loads ${formatAsset(Number(r.amount), "NGN")} into their Tribe wallet.`,
        extra: { label: "12-digit code", value: r.code.replace(/(.{4})(?=.)/g, "$1 ") },
      };
    }
    case "referral-withdraw": {
      let tx = txOf(data);
      // the API pays referral money into NGN; another currency is a swap on top (same PIN)
      if (a.to !== "NGN" && pin) {
        const quote = await api.post<QuoteResource>("quotes", { transaction_type: "swap", from_asset: "NGN", to_asset: a.to, amount: naira(a.amountNgn) });
        const swap = await sendOnce<TransactionResource>(`referral-swap:${tx.id}`, { path: "swaps", method: "POST", body: { quote_id: quote.id, pin } }, quote);
        tx = txOf(swap.data);
      }
      const received = tx.toAmount ?? tx.amount;
      return { tx, headline: "Withdrawal successful", detail: `${formatAsset(received, a.to)} is in your ${assetByCode(a.to).name} balance.` };
    }
    case "cashpoint-redeem": {
      const tx = txOf(data);
      return { tx, headline: "Cashpoint redeemed", detail: `${formatAsset(tx.amount, "NGN")} just landed in your Naira wallet.`, replayed };
    }
  }
}

/** What each action changes besides balances, history and the inbox. */
function extraKeys(a: PendingAction): (readonly unknown[])[] {
  switch (a.kind) {
    case "card-fund":
    case "card-withdraw":
    case "card-create":
    case "card-delete":
      return [resources.cards.key];
    case "bill":
      return [resources.vault.key];
    case "recurring-create":
      return [resources.recurring.key];
    case "referral-withdraw":
      return [resources.referrals.key];
    case "cashpoint":
    case "cashpoint-redeem":
      return [resources.cashpoints.key];
    case "send":
      return [resources.beneficiaries.key];
    default:
      return [];
  }
}

/** The PIN that approved the last action, kept in memory only while its result card is up: "Make this recurring?" is consent given with it. */
let approvedPin: string | undefined;
export const pinForFollowUp = () => approvedPin;

export const useFlowStore = create<FlowState>()((set, get) => ({
  pending: null,
  result: null,
  status: "idle",
  error: null,
  quote: null,

  begin: (pending) => {
    approvedPin = undefined;
    set({ pending, result: null, status: "idle", error: null, quote: null });
  },

  refreshQuote: async () => {
    const { pending, quote } = get();
    const req = pending ? quoteRequest(pending) : null;
    if (!pending || !req) return null;
    if (quote && usable(quote, 5_000)) return quote;
    const fresh = await api.post<QuoteResource>("quotes", req);
    // the action may have changed while the quote was in flight
    if (get().pending === pending) set({ quote: fresh });
    return fresh;
  },

  execute: async (pin) => {
    const { pending } = get();
    if (!pending) throw new ApiError(0, "NOTHING_PENDING", "Nothing to confirm.");
    const actionKey = stable(pending);
    try {
      // 1. lock the price (swaps, converted sends): reuse the review's quote, or the one a failed
      //    attempt was sent with, while it's still valid
      let quote: QuoteResource | null = null;
      const req = quoteRequest(pending);
      if (req) {
        set({ status: "quoting", error: null });
        const saved = await loadAttempt();
        const current = get().quote;
        // an attempt that never got an answer is retried with ITS quote, even if that has expired
        // since: if the server did the work, the key replays it; if not, QUOTE_EXPIRED → re-price
        if (saved?.actionKey === actionKey && saved.quoteId) quote = { ...(current ?? ({} as QuoteResource)), id: saved.quoteId, expires_at: saved.quoteExpiresAt ?? "" };
        else if (current && usable(current)) quote = current;
        else {
          quote = await api.post<QuoteResource>("quotes", req);
          set({ quote });
        }
      }
      // 2. send it
      set({ status: "submitting", error: null });
      const call = buildCall(pending, pin, quote);
      const res = await sendOnce<unknown>(actionKey, call, quote);
      approvedPin = pin;
      const result = await describe(pending, res.data, pin, res.replay);
      if (result.tx) useWalletStore.getState().upsertTransaction(result.tx);
      refreshAfterMoney(extraKeys(pending));
      set({ pending: null, result: { ...result, replayed: res.replay }, status: "success", quote: null });
      return result;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, "UNKNOWN", error instanceof Error ? error.message : "Something went wrong. Nothing was charged.");
      // an expired or used quote: the next try prices again
      if (apiError.code === "QUOTE_EXPIRED" || apiError.code === "QUOTE_USED" || (apiError.status === 404 && quoteRequest(pending))) set({ quote: null });
      set({ status: "failed", error: apiError });
      throw apiError;
    }
  },

  complete: (result) => set({ pending: null, result, status: "success" }),
  clear: () => {
    approvedPin = undefined;
    void dropAttempt(); // a signed-out user's unfinished attempt must not be retried for the next user
    set({ pending: null, result: null, status: "idle", error: null, quote: null });
  },
}));
