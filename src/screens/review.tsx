import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { EmptyState, Note } from "@/components/bits";
import { Avatar } from "@/components/avatar";
import { BillerThumb, GiftMark } from "@/components/brand-tiles";
import { CardBadge, CardPairIcon, cardLook } from "@/components/card-face";
import { Button } from "@/components/button";
import { CashpointMark } from "@/components/cashpoint-mark";
import { CoinIcon } from "@/components/coin-icon";
import { FlowScreen } from "@/components/flow-screen";
import type { IconName } from "@/components/icon";
import { RowIcon } from "@/components/list";
import { PairIcon } from "@/components/pair-icon";
import { QuoteTimer } from "@/components/quote-timer";
import { Text } from "@/components/text";
import { LEG_ICON, TransferLegs, type Leg } from "@/components/transfer-legs";
import { assetByCode, SWAP_FEE } from "@/data/assets";
import { countryByIso } from "@/data/countries";
import { CARD_FEE_USD, cardFundingFee } from "@/data/seed";
import { FREQUENCY_LABEL } from "@/stores/use-recurring-store";
import { billerById, GIFT_CARD_BUY_MARKUP, giftBrandById, giftSellPayout } from "@/data/catalog";
import { useCardsStore } from "@/stores/use-cards-store";
import { useFlowStore, type PendingAction } from "@/stores/use-flow-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset, quote } from "@/utils/format";
import { PAY } from "@/utils/pay-platform";
import { liveUsd, quoteTick, useQuoteTick } from "@/utils/rates";

type Summary = {
  /** the hero art (64): what pays sits at the back, what it becomes in front */
  icon: ReactNode;
  /** the same art, small (≤44), for compact rows (the PIN screen) */
  badge: ReactNode;
  /** the big number */
  amount: string;
  /** one line under the amount on the PIN screen */
  line: string;
  /** small caps over the amount ("YOU GET", "YOU'RE PAYING") */
  overline: string;
  /** the line under the amount on the review */
  sub?: ReactNode;
  /** where the money moves from and to, when two balances are involved */
  legs?: { from: Leg; to: Leg };
  rows: [string, string][];
  /** the emphasised last line of the ticket ("Total to debit", "You get") */
  total?: [string, string];
  note?: string;
  noteIcon?: IconName;
  /** label over the rows ("Swap breakdown", "Payment breakdown") */
  breakdown?: string;
  /** the approve button's label */
  cta?: string;
  /** the rate comes from a live 30-second quote: show the countdown */
  live?: boolean;
  /** extra block under the rows (e.g. recipient card) */
  after?: ReactNode;
  /** the PIN screen's heading, when "Approve this transaction" doesn't fit (deleting a card) */
  approve?: string;
};

const rateText = (from: string, to: string, rate: number) => (rate >= 1 ? `1 ${from} = ${formatAsset(rate, to as never)}` : `1 ${to} = ${formatAsset(1 / rate, from as never)}`);
const coinLeg = (code: string, label: string, title: string, value: string, tone?: "success"): Leg => ({ leading: <CoinIcon code={code} size={LEG_ICON} />, label, title, value, valueTone: tone });

/** "Recipient's details" card on the send review. */
function RecipientCard({ name, handle, sub }: { name: string; handle: string; sub?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="headline" style={{ paddingHorizontal: spacing.xs }}>
        Recipient
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
        <Avatar size={40} name={name} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {handle}
            {sub ? ` · ${sub}` : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Everything the review and PIN screens show about a pending money action. */
export function actionSummary(a: PendingAction, tick = quoteTick()): Summary {
  switch (a.kind) {
    case "send": {
      const toAsset = a.toAsset ?? a.asset;
      const toAmount = a.toAmount ?? a.amount;
      const converted = toAsset !== a.asset;
      const art = (size: number) => (converted ? <PairIcon from={a.asset} to={toAsset} size={size} /> : <CoinIcon code={a.asset} size={size} />);
      const rows: [string, string][] = [["Amount", formatAsset(a.amount, a.asset)], ["Send fee", a.fee ? formatAsset(a.fee, a.asset) : "Free"]];
      if (converted) rows.push(["Rate", rateText(a.asset, toAsset, quote(1, a.asset, toAsset, tick).rate)], ["Conversion fee", `${SWAP_FEE * 100}%`]);
      rows.push(["Channel", a.channel], ["Arrives", a.eta ?? "Within minutes"]);
      return {
        icon: art(64),
        badge: art(40),
        amount: formatAsset(toAmount, toAsset),
        line: `to ${a.name ?? a.to}`,
        overline: "You're sending",
        sub: `To ${a.name ?? a.to}${converted ? `, paid from your ${assetByCode(a.asset).name} balance` : ""}`,
        legs: converted ? { from: coinLeg(a.asset, "You pay", assetByCode(a.asset).name, formatAsset(a.amount + a.fee, a.asset)), to: coinLeg(toAsset, "They get", assetByCode(toAsset).name, formatAsset(toAmount, toAsset), "success") } : undefined,
        breakdown: "Payment breakdown",
        rows,
        total: ["Total to debit", formatAsset(a.amount + a.fee, a.asset)],
        live: converted,
        after: <RecipientCard name={a.name ?? a.to} handle={a.to} sub={a.country ? countryByIso(a.country).name : a.network} />,
        note: "Check the details before you approve. Once sent, it can't be reversed.",
        noteIcon: "lock",
        cta: "Continue to approve",
      };
    }
    case "swap": {
      const q = quote(a.amount, a.from, a.to, tick);
      const art = (size: number) => <PairIcon from={a.from} to={a.to} size={size} />;
      return {
        icon: art(64),
        badge: art(40),
        amount: formatAsset(q.receive, a.to),
        line: `for ${formatAsset(a.amount, a.from)}`,
        overline: a.fund ? `Adding to ${a.to}` : "You get",
        sub: `for ${formatAsset(a.amount, a.from)}`,
        legs: { from: coinLeg(a.from, "From", assetByCode(a.from).name, formatAsset(a.amount, a.from)), to: coinLeg(a.to, "To", assetByCode(a.to).name, formatAsset(q.receive, a.to), "success") },
        breakdown: "Swap breakdown",
        rows: [
          ["Rate", rateText(a.from, a.to, q.rate)],
          [`Swap fee (${SWAP_FEE * 100}%)`, formatAsset(q.fee, a.from)],
          ["Lands", "Instantly"],
        ],
        total: ["You get", formatAsset(q.receive, a.to)],
        live: true,
        note: "Check the breakdown before you swap. Once swapped, it can't be reversed.",
        noteIcon: "lock",
        cta: a.fund ? "Add money" : "Swap",
      };
    }
    case "bill": {
      const b = billerById(a.billerId);
      const cost = (a.amountNgn * liveUsd("NGN", tick)) / liveUsd(a.payWith, tick);
      const field = b.field === "meter" ? "Meter" : b.field === "smartcard" ? "Smartcard" : "Phone";
      const art = (size: number) => <PairIcon from={a.payWith} front={(sz) => <BillerThumb biller={b} size={sz} />} size={size} />;
      return {
        icon: art(64),
        badge: art(40),
        amount: `₦${a.amountNgn.toLocaleString()}`,
        line: `${b.name}${a.plan ? ` · ${a.plan}` : ""}`,
        overline: "You're paying",
        sub: `${b.name}${a.plan ? ` · ${a.plan}` : ""}`,
        rows: [[field, a.target], ...(a.meterType ? ([["Meter type", a.meterType === "postpaid" ? "Postpaid" : "Prepaid"]] as [string, string][]) : []), ...(a.plan ? ([["Plan", a.plan]] as [string, string][]) : []), ["Paying from", `${assetByCode(a.payWith).name} wallet`], ["Fee", "Free"]],
        total: ["You pay", a.payWith !== "NGN" ? formatAsset(cost, a.payWith) : `₦${a.amountNgn.toLocaleString()}`],
        note: b.category === "electricity" ? (a.meterType === "postpaid" ? "Postpaid bills settle your account balance. No token is issued." : "Your token shows on the next screen. Load it then, or find it later in your Token Vault.") : undefined,
      };
    }
    case "gift-buy": {
      const brand = giftBrandById(a.brandId);
      const cost = (a.usd * (1 + GIFT_CARD_BUY_MARKUP)) / liveUsd(a.payWith, tick);
      const art = (size: number) => <PairIcon from={a.payWith} front={(sz) => <GiftMark brand={brand} size={sz} />} size={size} />;
      return {
        icon: art(64),
        badge: art(40),
        amount: `$${a.usd}`,
        line: `${brand.name} gift card`,
        overline: "You're buying",
        sub: `${brand.name} gift card`,
        rows: [["Card", `${brand.name} · $${a.usd}`], ["Fee", `Included (${GIFT_CARD_BUY_MARKUP * 100}%)`], ["Delivery", "Code in-app, instantly"]],
        total: ["You pay", formatAsset(cost, a.payWith)],
      };
    }
    case "gift-sell": {
      const brand = giftBrandById(a.brandId);
      const amount = giftSellPayout(a.usd, brand, a.payout, tick);
      const art = (size: number) => <PairIcon from={a.payout} front={(sz) => <GiftMark brand={brand} size={sz} />} size={size} />;
      return {
        icon: art(64),
        badge: art(40),
        amount: formatAsset(amount, a.payout),
        line: `for a $${a.usd} ${brand.name} card`,
        overline: "You get",
        sub: `for a $${a.usd} ${brand.name} card`,
        rows: [
          ["Card", `${brand.name} · $${a.usd}`],
          ["Rate", `₦${brand.sellRate.toLocaleString()}/$`],
          ...(a.payout !== "NGN" ? ([["Converted", `₦${(a.usd * brand.sellRate).toLocaleString()} → ${a.payout}`]] as [string, string][]) : []),
          ["Paid into", `${assetByCode(a.payout).name} ${assetByCode(a.payout).kind === "crypto" ? "wallet" : "account"}`],
          ["Fee", "Free"],
          ["Paid", "After a quick check (minutes)"],
        ],
        total: ["You get", formatAsset(amount, a.payout)],
      };
    }
    case "card-fund": {
      const card = useCardsStore.getState().cards.find((c) => c.id === a.cardId);
      const fee = cardFundingFee(a.usd);
      const cost = (a.usd + fee) / liveUsd(a.from, tick);
      const name = card ? `${card.label} •• ${card.last4}` : "your card";
      // the wallet that pays at the back, the card in front
      const art = (size: number) => (card ? <CardPairIcon theme={card.theme} network={card.network} asset={a.from} size={size} /> : <CoinIcon code={a.from} size={size} />);
      return {
        icon: art(64),
        badge: art(36),
        amount: `$${a.usd.toFixed(2)}`,
        line: `You're funding ${name}`,
        overline: "You're adding",
        sub: `to ${name}`,
        legs: card ? { from: coinLeg(a.from, "From", `${assetByCode(a.from).name} wallet`, formatAsset(cost, a.from)), to: { leading: <CardBadge theme={card.theme} network={card.network} size={LEG_ICON} />, label: "To", title: name, value: `+$${a.usd.toFixed(2)}`, valueTone: "success" } } : undefined,
        breakdown: "Payment breakdown",
        rows: [
          ["Net funding", `$${a.usd.toFixed(2)}`],
          ["Funding fee", `$${fee.toFixed(2)}`],
          ["Rate", a.from === "USD" ? "1:1" : `$1 = ${formatAsset(1 / liveUsd(a.from, tick), a.from)}`],
        ],
        total: ["Total to debit", formatAsset(cost, a.from)],
      };
    }
    case "card-create": {
      const total = a.usd + CARD_FEE_USD + cardFundingFee(a.usd);
      const network = a.network === "visa" ? "Visa" : "Mastercard";
      const art = (size: number) => <CardPairIcon theme={a.theme} network={a.network} asset={a.from} size={size} />;
      return {
        icon: art(64),
        badge: art(36),
        amount: `$${total.toFixed(2)}`,
        line: `${a.label} · ${cardLook(a.theme).name} ${network}`,
        overline: "New card",
        sub: `${a.label} · ${cardLook(a.theme).name} ${network}`,
        rows: [
          ["Card name", a.label],
          ["Card type", `${network} · USD`],
          ["First top-up", `$${a.usd.toFixed(2)}`],
          ["Card creation fee", `$${CARD_FEE_USD.toFixed(2)}`],
          ["Funding fee", `$${cardFundingFee(a.usd).toFixed(2)}`],
        ],
        total: ["Total to debit", formatAsset(total / liveUsd(a.from, tick), a.from)],
        note: `Your card is ready the moment you confirm. Tap the ${PAY.name} mark on it to add it to ${PAY.wallet}.`,
      };
    }
    case "card-withdraw": {
      const card = useCardsStore.getState().cards.find((c) => c.id === a.cardId);
      const name = card ? `${card.label} •• ${card.last4}` : "your card";
      const received = a.usd / liveUsd(a.to, tick);
      // the card at the back, the balance it lands in up front
      const art = (size: number) => (card ? <CardPairIcon theme={card.theme} network={card.network} asset={a.to} direction="in" size={size} /> : <CoinIcon code={a.to} size={size} />);
      return {
        icon: art(64),
        badge: art(36),
        amount: `$${a.usd.toFixed(2)}`,
        line: `from ${name}`,
        overline: "You're withdrawing",
        sub: `from ${name} to your ${assetByCode(a.to).name} balance`,
        legs: card ? { from: { leading: <CardBadge theme={card.theme} network={card.network} size={LEG_ICON} />, label: "From", title: name, value: `$${a.usd.toFixed(2)}` }, to: coinLeg(a.to, "To", assetByCode(a.to).name, formatAsset(received, a.to), "success") } : undefined,
        breakdown: "Payment breakdown",
        rows: [
          ["Rate", a.to === "USD" ? "1:1" : `$1 = ${formatAsset(1 / liveUsd(a.to, tick), a.to)}`],
          ["Fee", "Free"],
        ],
        total: ["You receive", formatAsset(received, a.to)],
      };
    }
    case "recurring-create": {
      const b = billerById(a.billerId);
      const art = (size: number) => <PairIcon from={a.payWith} front={(sz) => <BillerThumb biller={b} size={sz} />} size={size} />;
      return {
        icon: art(64),
        badge: art(40),
        amount: `₦${a.amountNgn.toLocaleString()}`,
        line: `${b.name}${a.plan ? ` · ${a.plan}` : ""} · ${FREQUENCY_LABEL[a.frequency].toLowerCase()}`,
        overline: FREQUENCY_LABEL[a.frequency],
        sub: `${b.name}${a.plan ? ` · ${a.plan}` : ""}`,
        rows: [
          [b.field === "meter" ? "Meter" : b.field === "smartcard" ? "Smartcard" : "Phone", a.target],
          ["Repeats", FREQUENCY_LABEL[a.frequency]],
          ["First payment", new Date(a.start).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })],
          ["Pays with", `${assetByCode(a.payWith).name} wallet`],
          ["Fee", "Free"],
        ],
        total: ["Each payment", `₦${a.amountNgn.toLocaleString()}`],
        note: "We'll remind you the day before each payment. Pause or delete it any time in Pay › Recurring.",
      };
    }
    case "referral-withdraw": {
      const received = (a.amountNgn * liveUsd("NGN", tick)) / liveUsd(a.to, tick);
      const to = assetByCode(a.to);
      const art = (size: number) => <PairIcon from="NGN" to={a.to} size={size} />;
      return {
        icon: art(64),
        badge: art(40),
        amount: `₦${a.amountNgn.toLocaleString()}`,
        line: `to your ${to.name} balance`,
        overline: "You're withdrawing",
        sub: `From your referral earnings into ${to.name}`,
        legs: { from: { leading: <RowIcon name="gift" size={LEG_ICON} />, label: "From", title: "Referral balance", value: `₦${a.amountNgn.toLocaleString()}` }, to: coinLeg(a.to, "To", to.name, formatAsset(received, a.to), "success") },
        breakdown: "Withdrawal breakdown",
        rows: [...(a.to !== "NGN" ? ([["Rate", rateText("NGN", a.to, liveUsd("NGN", tick) / liveUsd(a.to, tick))]] as [string, string][]) : []), ["Fee", "Free"], ["Lands", "Instantly"]],
        total: ["You receive", formatAsset(received, a.to)],
        live: a.to !== "NGN",
      };
    }
    case "card-delete": {
      const card = useCardsStore.getState().cards.find((c) => c.id === a.cardId);
      const name = card ? `${card.label} •• ${card.last4}` : "This card";
      const refund = card && card.balance > 0 ? `$${card.balance.toFixed(2)}` : null;
      const art = (size: number) => (card ? <CardBadge theme={card.theme} network={card.network} size={size} /> : <CoinIcon code="USD" size={size} />);
      return {
        icon: art(64),
        badge: art(40),
        amount: `Delete ${name}`,
        line: refund ? `${refund} goes back to your USD wallet` : "Nothing on it to refund",
        overline: "Delete card",
        rows: [["Card", name], ["Refund", refund ? `${refund} to USD` : "None"]],
        approve: "Confirm it's you",
      };
    }
    case "cashpoint":
      return {
        icon: <CashpointMark size={60} />,
        badge: <CashpointMark size={40} />,
        amount: formatAsset(a.amount, "NGN"),
        line: "Cashpoint code",
        overline: "Cashpoint code",
        sub: "A 12-digit code anyone can redeem",
        rows: [["Fee", "Free"], ["Who can redeem", "Anyone with the code"]],
        total: ["Total to debit", formatAsset(a.amount, "NGN")],
        note: "Share the code only with the person you're paying. Unredeemed codes can be cancelled from the receipt.",
      };
  }
}

/** The big centred number: the art on a soft disc, small caps over the amount, a line under it. */
export function ReviewHero({ icon, overline, amount, sub }: { icon: ReactNode; overline?: string; amount: string; sub?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ alignItems: "center", gap: spacing.xs, paddingTop: spacing.sm }}>
      <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm }}>{icon}</View>
      {overline && (
        <Text variant="overline" tone="muted">
          {overline}
        </Text>
      )}
      <Text variant="largeTitle" align="center" adjustsFontSizeToFit numberOfLines={1}>
        {amount}
      </Text>
      {sub && (
        <Text variant="body" tone="muted" align="center">
          {sub}
        </Text>
      )}
    </View>
  );
}

/**
 * The breakdown as a ticket: key/value rows, a perforation (page-coloured notches and a dashed
 * line), then the one line that matters, emphasised. `page` is the colour behind the ticket.
 */
export function ReviewTicket({ title, action, rows, total, page }: { title?: string; action?: ReactNode; rows: [string, string][]; total?: [string, string]; page?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.sm }}>
      {(title || action) && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xs }}>
          {title ? <Text variant="headline">{title}</Text> : <View />}
          {action}
        </View>
      )}
      <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous" }}>
        <View style={{ paddingVertical: spacing.sm }}>
          {rows.map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
              <Text variant="body" tone="muted">
                {k}
              </Text>
              <Text variant="bodyStrong" style={{ flex: 1, textAlign: "right" }} numberOfLines={2}>
                {v}
              </Text>
            </View>
          ))}
        </View>
        {total && (
          <>
            <Perforation page={page} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md }}>
              <Text variant="bodyStrong">{total[0]}</Text>
              <Text variant="amount" style={{ flex: 1, textAlign: "right" }} numberOfLines={1} adjustsFontSizeToFit>
                {total[1]}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

/**
 * A ticket's tear line: half-circle notches cut into both edges (in the page colour `page`) and a
 * dashed line between them. Place it inside a surface block that doesn't clip (no overflow hidden).
 */
export function Perforation({ page, size = 20 }: { page?: string; size?: number }) {
  const c = useColors();
  const notch = { position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: page ?? c.bg } as const;
  return (
    <View style={{ height: size, justifyContent: "center" }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={[notch, { left: -size / 2 }]} />
      <View style={{ marginHorizontal: spacing.md, height: 1, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: c.borderStrong }} />
      <View style={[notch, { right: -size / 2 }]} />
    </View>
  );
}

/** The quote countdown as a small pill (live rates: swaps, converted sends). */
export function QuotePill() {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}>
      <QuoteTimer />
    </View>
  );
}

/**
 * The flow's pending action, kept after approval clears it: this screen sits under /pin and the
 * result card until they all close, and re-rendering empty flashed "Nothing to review".
 */
export function useKeptPending() {
  const live = useFlowStore((s) => s.pending);
  const [kept, setKept] = useState(live);
  if (live && live !== kept) setKept(live);
  return live ?? kept;
}

/** Shared review step for every money flow → /pin → /success. */
export function ReviewScreen({ step }: { step?: string }) {
  const pending = useKeptPending();
  // re-renders when the 30-second quote window rolls over, and the rows re-price with it
  const tick = useQuoteTick();

  if (!pending) {
    return (
      <FlowScreen title="Review" cancel="back">
        <EmptyState icon="info" title="Nothing to review" body="Start again from the previous step." />
      </FlowScreen>
    );
  }
  const s = actionSummary(pending, tick);

  return (
    <FlowScreen title="Review" step={step} cancel="back" footer={<Button title={s.cta ?? "Confirm with PIN"} icon="lock" onPress={() => router.push("/pin")} />}>
      <ReviewHero icon={s.icon} overline={s.overline} amount={s.amount} sub={s.sub} />
      {s.legs && <TransferLegs from={s.legs.from} to={s.legs.to} />}
      <ReviewTicket title={s.breakdown ?? "Breakdown"} action={s.live ? <QuotePill /> : undefined} rows={s.rows} total={s.total} />
      {s.after}
      {s.note && <Note icon={s.noteIcon ?? "info"}>{s.note}</Note>}
    </FlowScreen>
  );
}
