import { create } from "zustand";
import { assetByCode, type AssetCode } from "@/data/assets";
import { billerById, GIFT_CARD_BUY_MARKUP, giftBrandById, giftSellPayout } from "@/data/catalog";
import type { InboxItem, InboxKind } from "@/data/inbox";
import { CARD_FEE_USD, CARD_MIN_TOPUP_USD, cardFundingFee, type CardFinish, type CardNetwork, type Transaction, type VirtualCard } from "@/data/seed";
import { formatAsset, randomDigits } from "@/utils/format";
import { PAY } from "@/utils/pay-platform";
import { liveUsd } from "@/utils/rates";
import { useBeneficiariesStore, type BeneficiaryDraft } from "./use-beneficiaries-store";
import { useCardsStore } from "./use-cards-store";
import { useReferralStore } from "./use-referral-store";
import { useSessionStore } from "./use-session-store";
import { useInboxStore } from "./use-inbox-store";
import { FREQUENCY_LABEL, useRecurringStore, type Frequency } from "./use-recurring-store";
import { useVaultStore } from "./use-vault-store";
import { InsufficientFunds, useWalletStore } from "./use-wallet-store";

/**
 * Every money movement is described as a PendingAction on the review screen, authorised on
 * /pin, executed here, and celebrated on /success. Routes can't carry functions, so the
 * action lives in this (non-persisted) store between the three screens.
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
  | { kind: "swap"; from: AssetCode; to: AssetCode; amount: number }
  | {
      kind: "bill";
      billerId: string;
      amountNgn: number;
      payWith: AssetCode;
      /** as shown (meters masked) */
      target: string;
      /** the full number, kept on the transaction for "saved numbers" */
      account?: string;
      category?: "airtime" | "data" | "tv" | "electricity";
      /** electricity only; postpaid pays the account and makes no token */
      meterType?: "prepaid" | "postpaid";
      plan?: string;
      recurringId?: string;
    }
  | { kind: "gift-buy"; brandId: string; usd: number; payWith: AssetCode }
  | { kind: "gift-sell"; brandId: string; usd: number; payout: AssetCode }
  | { kind: "card-fund"; cardId: string; usd: number; from: AssetCode }
  | { kind: "card-create"; label: string; theme: CardFinish; network: CardNetwork; usd: number; from: AssetCode }
  | { kind: "card-withdraw"; cardId: string; usd: number; to: AssetCode }
  | { kind: "recurring-create"; billerId: string; target: string; plan?: string; amountNgn: number; payWith: AssetCode; frequency: Frequency; start: string }
  | { kind: "cashpoint"; amount: number }
  | { kind: "referral-withdraw"; amountNgn: number; to: AssetCode }
  /** not a payment, but final: deleting a card is approved with the PIN too (its balance is refunded) */
  | { kind: "card-delete"; cardId: string };

/** What a paid bill needs to become a recurring schedule (offered on the success screen). */
export type RecurringOffer = { billerId: string; target: string; plan?: string; amountNgn: number; payWith: AssetCode };

export type FlowResult = {
  /** absent for actions that don't move money (e.g. setting up a recurring bill) */
  tx?: Transaction;
  headline: string;
  detail: string;
  extra?: { label: string; value: string };
  notify?: { kind: InboxKind; title: string; body: string; href?: string; billerId?: string; badge?: InboxItem["badge"] };
  recurringOffer?: RecurringOffer;
  /** a send to someone not saved yet: the result card offers "Add to beneficiaries" */
  beneficiary?: BeneficiaryDraft;
  /** a card that was just created: the result card offers "Add to Apple Pay / Google Pay" */
  walletCardId?: string;
  /** a card that was just deleted: the result card shows it fading out */
  retiredCard?: Pick<VirtualCard, "theme" | "network" | "label" | "last4" | "holder">;
};

type FlowState = {
  pending: PendingAction | null;
  result: FlowResult | null;
  begin: (action: PendingAction) => void;
  execute: () => FlowResult;
  /** for actions that don't need a PIN (e.g. redeeming a Cashpoint) */
  complete: (result: FlowResult) => void;
  clear: () => void;
};

const NGN_PER_KWH = 438.6;

/** "Everyday •• 4821" for a card id. */
function cardName(id: string) {
  const k = useCardsStore.getState().cards.find((c) => c.id === id);
  return k ? `${k.label} •• ${k.last4}` : "virtual card";
}

/** Cardholder name for new cards. */
function cardHolderName() {
  const u = useSessionStore.getState().user;
  return `${u.firstName} ${u.lastName}`;
}

function run(action: PendingAction): FlowResult {
  const wallet = useWalletStore.getState();
  switch (action.kind) {
    case "send": {
      const tx = wallet.send(action);
      const got = formatAsset(action.toAmount ?? action.amount, action.toAsset ?? action.asset);
      const who = (action.name ?? action.to).replace(/\.$/, "");
      const saved = useBeneficiariesStore.getState().has({ asset: action.toAsset ?? action.asset, handle: action.to });
      const beneficiary: BeneficiaryDraft | undefined =
        action.beneficiaryId || saved || !action.recipientKind
          ? undefined
          : { kind: action.recipientKind, name: who, handle: action.to, asset: action.toAsset ?? action.asset, channelId: action.channelId, network: action.network, country: action.country, details: action.details };
      return {
        tx,
        beneficiary,
        headline: tx.status === "pending" ? "Transfer submitted" : "Money sent",
        detail: tx.status === "pending" ? `${got} to ${who} by ${action.channel}. Expected: ${action.eta?.toLowerCase() ?? "soon"}.` : `${got} is on its way to ${who}.`,
        notify: { kind: "money", title: `You sent ${got}`, body: `To ${action.name ? `${action.name} (${action.to})` : action.to} · ${action.channel}` },
      };
    }
    case "swap": {
      const tx = wallet.swap(action);
      const legs = `${formatAsset(action.amount, action.from)} → ${formatAsset(tx.toAmount!, action.to)}`;
      return { tx, headline: "Swap complete", detail: `Now in your ${assetByCode(action.to).name} balance.`, notify: { kind: "swap", title: "Swap complete", body: `${legs} is in your ${assetByCode(action.to).name} balance.` } };
    }
    case "bill": {
      const b = billerById(action.billerId);
      const cost = (action.amountNgn * assetByCode("NGN").usd) / assetByCode(action.payWith).usd;
      const isLight = b.category === "electricity";
      const postpaid = isLight && action.meterType === "postpaid";
      // prepaid meters get a token (saved to the Vault); postpaid just settles the account
      const token = isLight && !postpaid ? randomDigits(20).replace(/(.{4})(?=.)/g, "$1 ") : undefined;
      const category = action.category ?? b.category;
      const units = isLight ? `${(action.amountNgn / NGN_PER_KWH).toFixed(1)} kWh` : undefined;
      const tx = wallet.record(
        {
          type: "bill",
          asset: action.payWith,
          amount: cost,
          direction: "out",
          title: action.plan ? `${b.name} ${action.plan}` : `${b.name} ${isLight ? (postpaid ? "Postpaid" : "Prepaid") : category === "airtime" ? "airtime" : "top-up"}`,
          subtitle: `Paid with ${action.payWith} · ${isLight && !postpaid ? units : action.target}`,
          meta: { billerId: b.id, token, units: postpaid ? undefined : units, face: `₦${action.amountNgn.toLocaleString()}`, recurringId: action.recurringId, target: action.account ?? action.target, billCategory: category, meterType: isLight ? (postpaid ? "postpaid" : "prepaid") : undefined },
        },
        { [action.payWith]: -cost },
      );
      if (isLight && token) {
        useVaultStore.getState().add({ provider: `${b.name} Prepaid`, meter: action.target, amount: action.amountNgn, kwh: Number((action.amountNgn / NGN_PER_KWH).toFixed(1)), token, paidWith: action.payWith, paid: cost });
      }
      if (action.recurringId) useRecurringStore.getState().markPaid(action.recurringId);
      const recurringOffer = action.recurringId || postpaid ? undefined : { billerId: b.id, target: action.target, plan: action.plan, amountNgn: action.amountNgn, payWith: action.payWith };
      return isLight && !postpaid
        ? { tx, recurringOffer, headline: "Token saved to your Vault", detail: `${units} for meter ${action.target}`, extra: { label: "Token", value: token! }, notify: { kind: "vault", title: "Token saved to your Vault", body: `${b.name} Prepaid · ${units}. Load it, then tap “I've loaded it”.` } }
        : { tx, recurringOffer, headline: "Paid", detail: `${b.name} · ${action.target}`, notify: { kind: "money", title: `${b.name} paid`, body: `₦${action.amountNgn.toLocaleString()} · ${action.target}` } };
    }
    case "gift-buy": {
      const brand = giftBrandById(action.brandId);
      const cost = (action.usd * (1 + GIFT_CARD_BUY_MARKUP)) / assetByCode(action.payWith).usd;
      const code = `${randomDigits(4)}-${randomDigits(4)}-${randomDigits(4)}`;
      const tx = wallet.record(
        { type: "giftcard", asset: action.payWith, amount: cost, direction: "out", title: `${brand.name} gift card`, subtitle: `Paid with ${action.payWith} · code ready`, meta: { giftBrand: brand.id, code, face: `$${action.usd} ${brand.name} card` } },
        { [action.payWith]: -cost },
      );
      return { tx, headline: "Your card is ready", detail: `${brand.name} $${action.usd}`, extra: { label: "Redeem code", value: code } };
    }
    case "gift-sell": {
      const brand = giftBrandById(action.brandId);
      const amount = giftSellPayout(action.usd, brand, action.payout);
      // a currency you hadn't opened yet gets opened for the payout
      if (!wallet.opened.includes(action.payout)) wallet.openAccount(action.payout);
      // Paid out once the card is verified — logged as pending, balance untouched for now.
      const tx = wallet.record(
        { type: "giftcard", asset: action.payout, amount, direction: "in", status: "pending", title: `Sold ${brand.name} gift card`, subtitle: `Paid out in ${action.payout} · ₦${brand.sellRate.toLocaleString()}/$`, meta: { giftBrand: brand.id, face: `$${action.usd} ${brand.name} card` } },
        {},
      );
      return { tx, headline: "Card submitted", detail: `We're verifying it. ${formatAsset(amount, action.payout)} lands in minutes.` };
    }
    case "card-fund": {
      const feeUsd = cardFundingFee(action.usd);
      const cost = (action.usd + feeUsd) / assetByCode(action.from).usd;
      const tx = wallet.record(
        { type: "card", asset: action.from, amount: cost, direction: "out", fee: feeUsd / assetByCode(action.from).usd, title: "Card top-up", subtitle: `Funded from ${action.from} · ${cardName(action.cardId)}`, meta: { cardId: action.cardId, face: `+$${action.usd.toFixed(2)} to card` } },
        { [action.from]: -cost },
      );
      useCardsStore.getState().credit(action.cardId, action.usd);
      return { tx, headline: "Card funding successful", detail: `$${action.usd.toFixed(2)} is on your card. You can now pay online with ease.`, notify: { kind: "card", title: "Card topped up", body: `+$${action.usd.toFixed(2)} on your virtual card.` } };
    }
    case "card-create": {
      // every new card starts funded (the details step enforces it too)
      if (action.usd < CARD_MIN_TOPUP_USD) throw new Error(`Add at least $${CARD_MIN_TOPUP_USD} to your new card.`);
      const total = action.usd + CARD_FEE_USD + cardFundingFee(action.usd);
      const cost = total / assetByCode(action.from).usd;
      // Check funds before creating, so a failed top-up never leaves a half-made card.
      if (cost > wallet.balances[action.from] + 1e-9) throw new InsufficientFunds(action.from);
      const user = cardHolderName();
      const card = useCardsStore.getState().createCard({ label: action.label, theme: action.theme, network: action.network, holder: user });
      const tx = wallet.record(
        { type: "card", asset: action.from, amount: cost, direction: "out", fee: (CARD_FEE_USD + cardFundingFee(action.usd)) / assetByCode(action.from).usd, title: "New virtual card", subtitle: `Paid with ${action.from} · ${action.label} •• ${card.last4}`, meta: { cardId: card.id, cardOp: "created", face: `+$${action.usd.toFixed(2)} to card` } },
        { [action.from]: -cost },
      );
      useCardsStore.getState().credit(card.id, action.usd);
      return {
        tx,
        walletCardId: card.id,
        headline: "Your card is ready",
        detail: `${action.label} •• ${card.last4} works anywhere online. Add it to ${PAY.name} to tap and pay with your phone.`,
        notify: { kind: "card", title: "New virtual card", body: `${action.label} •• ${card.last4} is ready to use.` },
      };
    }
    case "card-withdraw": {
      const card = useCardsStore.getState().cards.find((c) => c.id === action.cardId);
      if (!card || action.usd > card.balance + 1e-9) throw new Error("That's more than your card balance.");
      const amount = action.usd / assetByCode(action.to).usd;
      useCardsStore.getState().debit(card.id, action.usd);
      const tx = wallet.record(
        { type: "card", asset: action.to, amount, direction: "in", title: "Card withdrawal", subtitle: `From ${card.label} •• ${card.last4} to ${action.to}`, meta: { cardId: card.id, face: `−$${action.usd.toFixed(2)} from card` } },
        { [action.to]: amount },
      );
      return {
        tx,
        headline: "Card withdrawal successful",
        detail: `$${action.usd.toFixed(2)} moved from your card to your ${assetByCode(action.to).name} balance.`,
        notify: { kind: "card", title: "Card withdrawal", body: `+${formatAsset(amount, action.to)} from ${card.label} •• ${card.last4}.` },
      };
    }
    case "recurring-create": {
      const b = billerById(action.billerId);
      useRecurringStore.getState().add({ billerId: action.billerId, target: action.target, plan: action.plan, amountNgn: action.amountNgn, payWith: action.payWith, frequency: action.frequency, nextRun: action.start });
      const when = new Date(action.start).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      return {
        headline: "Recurring bill on",
        detail: `${b.name}${action.plan ? ` ${action.plan}` : ""} renews ${FREQUENCY_LABEL[action.frequency].toLowerCase()} from ${when}, paid with ${action.payWith}.`,
        notify: { kind: "money", title: "Recurring bill set up", body: `${b.name} · ₦${action.amountNgn.toLocaleString()} ${FREQUENCY_LABEL[action.frequency].toLowerCase()}`, href: "/pay/recurring", billerId: action.billerId, badge: "repeat" },
      };
    }
    case "referral-withdraw": {
      const referrals = useReferralStore.getState();
      if (action.amountNgn > referrals.balance + 1e-9) throw new Error("That's more than your referral balance.");
      const received = (action.amountNgn * liveUsd("NGN")) / liveUsd(action.to);
      if (!wallet.opened.includes(action.to)) wallet.openAccount(action.to);
      const tx = wallet.record(
        { type: "referral", asset: action.to, amount: received, direction: "in", title: "Referral payout", subtitle: `From referral earnings · ₦${action.amountNgn.toLocaleString()}`, meta: { face: `₦${action.amountNgn.toLocaleString()}` } },
        { [action.to]: received },
      );
      referrals.withdraw({ amountNgn: action.amountNgn, to: action.to, received, txId: tx.id });
      return {
        tx,
        headline: "Withdrawal successful",
        detail: `${formatAsset(received, action.to)} is in your ${assetByCode(action.to).name} balance.`,
        notify: { kind: "referral", title: "Referral earnings withdrawn", body: `₦${action.amountNgn.toLocaleString()} → ${formatAsset(received, action.to)}` },
      };
    }
    case "card-delete": {
      const gone = useCardsStore.getState().deleteCard(action.cardId);
      if (!gone) throw new Error("That card is already gone.");
      const name = `${gone.label} •• ${gone.last4}`;
      const retiredCard = { theme: gone.theme, network: gone.network, label: gone.label, last4: gone.last4, holder: gone.holder };
      // whatever was on the card goes back to the USD wallet
      const tx =
        gone.balance > 0
          ? wallet.record({ type: "card", asset: "USD", amount: gone.balance, direction: "in", title: "Card deleted · refund", subtitle: name, meta: { cardId: gone.id } }, { USD: gone.balance })
          : undefined;
      return {
        tx,
        retiredCard,
        headline: "Card deleted",
        detail: tx ? `${name} no longer works. Its $${gone.balance.toFixed(2)} is back in your USD wallet.` : `${name} no longer works anywhere it was saved.`,
        notify: { kind: "card", title: "Card deleted", body: tx ? `${name} · $${gone.balance.toFixed(2)} refunded to USD.` : `${name} was deleted.`, href: "/cards" },
      };
    }
    case "cashpoint": {
      const tx = wallet.generateCashpoint(action.amount);
      return {
        tx,
        headline: "Cashpoint ready",
        detail: `Share this code with anyone. It loads ${formatAsset(action.amount, "NGN")} into their Tribe wallet.`,
        extra: { label: "12-digit code", value: tx.meta!.code!.replace(/(.{4})(?=.)/g, "$1 ") },
        notify: { kind: "cashpoint", title: "Cashpoint ready", body: `Your ${formatAsset(action.amount, "NGN")} code is waiting to be redeemed.` },
      };
    }
  }
}

export const useFlowStore = create<FlowState>()((set, get) => ({
  pending: null,
  result: null,
  begin: (pending) => set({ pending, result: null }),
  execute: () => {
    const { pending } = get();
    if (!pending) throw new Error("Nothing to confirm.");
    const result = run(pending);
    if (result.notify) useInboxStore.getState().push({ ...result.notify, txId: result.tx?.id, href: result.notify.href ?? (result.tx ? `/transaction/${result.tx.id}` : undefined) });
    set({ pending: null, result });
    return result;
  },
  complete: (result) => set({ pending: null, result }),
  clear: () => set({ pending: null, result: null }),
}));
