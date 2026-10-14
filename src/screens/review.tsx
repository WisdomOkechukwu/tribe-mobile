import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { EmptyState, Note } from "@/components/bits";
import { Avatar } from "@/components/avatar";
import { BillerThumb, GiftMark } from "@/components/brand-tiles";
import { CardBadge, CARD_THEMES, VirtualCardFace } from "@/components/card-face";
import { Button } from "@/components/button";
import { CashpointMark } from "@/components/cashpoint-mark";
import { CoinIcon } from "@/components/coin-icon";
import { FlowScreen } from "@/components/flow-screen";
import { ListRow, ListSection } from "@/components/list";
import { PairIcon } from "@/components/pair-icon";
import { QuoteTimer } from "@/components/quote-timer";
import { Text } from "@/components/text";
import { assetByCode, SWAP_FEE } from "@/data/assets";
import { countryByIso } from "@/data/countries";
import { CARD_FEE_USD, cardFundingFee } from "@/data/seed";
import { FREQUENCY_LABEL } from "@/stores/use-recurring-store";
import { billerById, GIFT_CARD_BUY_MARKUP, giftBrandById } from "@/data/catalog";
import { useCardsStore } from "@/stores/use-cards-store";
import { useFlowStore, type PendingAction } from "@/stores/use-flow-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset, quote } from "@/utils/format";
import { liveUsd, quoteTick, useQuoteTick } from "@/utils/rates";

type Summary = {
  icon: ReactNode;
  /** small round version of the icon, for compact rows (the PIN screen) */
  badge?: ReactNode;
  amount: string;
  line: string;
  rows: [string, string][];
  note?: string;
  /** a sentence heading instead of the big amount ("Confirm swap of USDT to NGN") */
  heading?: string;
  /** the line under the heading */
  sub?: ReactNode;
  /** label over the rows ("Swap breakdown", "Payment breakdown") */
  breakdown?: string;
  /** the approve button's label */
  cta?: string;
  /** extra block under the rows (e.g. recipient card) */
  after?: ReactNode;
};

const rateText = (from: string, to: string, rate: number) => (rate >= 1 ? `1 ${from} = ${formatAsset(rate, to as never)}` : `1 ${to} = ${formatAsset(1 / rate, from as never)}`);

/** "Recipient's details" card on the send review. */
function RecipientCard({ name, handle, sub }: { name: string; handle: string; sub?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
        Recipient&apos;s details
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: c.brandSoft, borderRadius: radius.group, borderCurve: "continuous", borderWidth: 1, borderColor: c.brand, padding: spacing.smd }}>
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
      const rows: [string, string][] = [
        ["Net amount to send", formatAsset(a.amount, a.asset)],
        ["Send fee", a.fee ? formatAsset(a.fee, a.asset) : "Free"],
      ];
      if (converted) rows.push(["Rate", rateText(a.asset, toAsset, quote(1, a.asset, toAsset, tick).rate)], ["Conversion fee", `${SWAP_FEE * 100}%`]);
      rows.push(["Amount to receive", formatAsset(toAmount, toAsset)], ["Total to debit", formatAsset(a.amount + a.fee, a.asset)], ["Channel", a.network ? `${a.channel}` : a.channel], ["Estimated time", a.eta ?? "Within minutes"]);
      return {
        icon: converted ? <PairIcon from={a.asset} to={toAsset} size={56} /> : <CoinIcon code={a.asset} size={56} />,
        amount: formatAsset(a.amount, a.asset),
        line: `to ${a.name ?? a.to}`,
        heading: `You're sending ${formatAsset(toAmount, toAsset)}`,
        sub: `To ${a.name ?? a.to}${converted ? `, paid from your ${assetByCode(a.asset).name} balance` : ""}`,
        breakdown: "Payment breakdown",
        rows,
        after: <RecipientCard name={a.name ?? a.to} handle={a.to} sub={a.country ? countryByIso(a.country).name : a.network} />,
        note: "Review the details before you confirm. Once sent, it can't be reversed.",
        cta: "Continue to approve",
      };
    }
    case "swap": {
      const q = quote(a.amount, a.from, a.to, tick);
      return {
        icon: <PairIcon from={a.from} to={a.to} size={60} />,
        amount: formatAsset(q.receive, a.to),
        line: `for ${formatAsset(a.amount, a.from)}`,
        heading: `Confirm swap of ${a.from} to ${a.to}`,
        sub: (
          <>
            You get <Text variant="bodyStrong">{formatAsset(q.receive, a.to)}</Text> for {formatAsset(a.amount, a.from)}
          </>
        ),
        breakdown: "Swap breakdown",
        rows: [
          ["Swap from", formatAsset(a.amount, a.from)],
          ["To receive", formatAsset(q.receive, a.to)],
          ["Rate", rateText(a.from, a.to, q.rate)],
          [`Swap fee (${SWAP_FEE * 100}%)`, formatAsset(q.fee, a.from)],
          ["Lands", "Instantly"],
        ],
        note: "Review the breakdown before swapping. Once swapped, it can't be reversed.",
        cta: "Swap",
      };
    }
    case "bill": {
      const b = billerById(a.billerId);
      const cost = (a.amountNgn * assetByCode("NGN").usd) / assetByCode(a.payWith).usd;
      const field = b.field === "meter" ? "Meter" : b.field === "smartcard" ? "Smartcard" : "Phone";
      return {
        icon: <PairIcon from={a.payWith} front={(sz) => <BillerThumb biller={b} size={sz} />} size={64} />,
        amount: `₦${a.amountNgn.toLocaleString()}`,
        line: `${b.name}${a.plan ? ` · ${a.plan}` : ""}`,
        rows: [[field, a.target], ...(a.plan ? ([["Plan", a.plan]] as [string, string][]) : []), ["Paying from", `${assetByCode(a.payWith).name} wallet`], ...(a.payWith !== "NGN" ? ([["You pay", formatAsset(cost, a.payWith)]] as [string, string][]) : []), ["Fee", "Free"]],
        note: b.category === "electricity" ? "Your token is saved to the Token Vault the moment it's issued." : undefined,
      };
    }
    case "gift-buy": {
      const brand = giftBrandById(a.brandId);
      const cost = (a.usd * (1 + GIFT_CARD_BUY_MARKUP)) / assetByCode(a.payWith).usd;
      return {
        icon: <PairIcon from={a.payWith} front={(sz) => <GiftMark brand={brand} size={sz} />} size={64} />,
        amount: `$${a.usd}`,
        line: `${brand.name} gift card`,
        rows: [["Card", `${brand.name} · $${a.usd}`], ["You pay", formatAsset(cost, a.payWith)], ["Fee", `Included (${GIFT_CARD_BUY_MARKUP * 100}%)`], ["Delivery", "Code in-app, instantly"]],
      };
    }
    case "gift-sell": {
      const brand = giftBrandById(a.brandId);
      const ngn = a.usd * brand.sellRate;
      const amount = a.payout === "NGN" ? ngn : ngn * assetByCode("NGN").usd;
      return {
        icon: <PairIcon from={a.payout} front={(sz) => <GiftMark brand={brand} size={sz} />} size={64} />,
        amount: formatAsset(amount, a.payout),
        line: `for a $${a.usd} ${brand.name} card`,
        rows: [["Card", `${brand.name} · $${a.usd}`], ["Rate", `₦${brand.sellRate.toLocaleString()}/$`], ["You get", formatAsset(amount, a.payout)], ["Fee", "Free"], ["Paid", "After a quick check (minutes)"]],
      };
    }
    case "card-fund": {
      const card = useCardsStore.getState().cards.find((c) => c.id === a.cardId);
      const fee = cardFundingFee(a.usd);
      const cost = (a.usd + fee) / assetByCode(a.from).usd;
      return {
        icon: card ? <VirtualCardFace card={card} width={200} /> : <CoinIcon code={a.from} size={56} />,
        badge: card ? <CardBadge theme={card.theme} network={card.network} size={44} /> : undefined,
        amount: `USD ${a.usd.toFixed(2)}`,
        line: `You're funding ${card ? `${card.label} •• ${card.last4}` : "your card"}`,
        heading: `You're funding USD ${a.usd.toFixed(2)}`,
        sub: `To ${card ? `${card.label} •• ${card.last4}` : "your card"}`,
        breakdown: "Payment breakdown",
        rows: [
          ["Card", card ? `${card.label} •• ${card.last4}` : "Virtual card"],
          ["Net funding", `USD ${a.usd.toFixed(2)}`],
          ["Funding fee", `USD ${fee.toFixed(2)}`],
          ["Rate", a.from === "USD" ? "USD 1 = USD 1" : `USD 1 = ${formatAsset(1 / assetByCode(a.from).usd, a.from)}`],
          ["Account to debit", `${formatAsset(cost, a.from)} (${a.from})`],
        ],
      };
    }
    case "card-create": {
      const total = a.usd + CARD_FEE_USD + cardFundingFee(a.usd);
      return {
        icon: <VirtualCardFace card={{ theme: a.theme, network: a.network, holder: "", number: "", last4: "••••", expiry: "09/29", cvv: "", frozen: false }} width={200} />,
        badge: <CardBadge theme={a.theme} network={a.network} size={44} />,
        amount: `$${total.toFixed(2)}`,
        line: `${a.label} · ${CARD_THEMES[a.theme].name} ${a.network === "visa" ? "Visa" : "Mastercard"}`,
        rows: [
          ["Card name", a.label],
          ["Card type", a.network === "visa" ? "Visa · USD" : "Mastercard · USD"],
          ["First top-up", a.usd ? `$${a.usd.toFixed(2)}` : "None"],
          ["Card creation fee", `$${CARD_FEE_USD.toFixed(2)}`],
          ...(a.usd ? ([["Funding fee", `$${cardFundingFee(a.usd).toFixed(2)}`]] as [string, string][]) : []),
          ["Account to debit", `${formatAsset(total / assetByCode(a.from).usd, a.from)} (${a.from})`],
        ],
        note: "Your card is ready the moment you confirm. Add it to Apple Pay or Google Wallet from the Cards tab.",
      };
    }
    case "card-withdraw": {
      const card = useCardsStore.getState().cards.find((c) => c.id === a.cardId);
      return {
        icon: <CoinIcon code={a.to} size={56} />,
        amount: `$${a.usd.toFixed(2)}`,
        line: `from ${card ? `${card.label} •• ${card.last4}` : "your card"}`,
        heading: `You're withdrawing USD ${a.usd.toFixed(2)}`,
        sub: `From ${card ? `${card.label} •• ${card.last4}` : "your card"} to your ${assetByCode(a.to).name} balance`,
        breakdown: "Payment breakdown",
        rows: [
          ["Card", card ? `${card.label} •• ${card.last4}` : "Virtual card"],
          ["You receive", formatAsset(a.usd / assetByCode(a.to).usd, a.to)],
          ["Rate", a.to === "USD" ? "1:1" : `$1 = ${formatAsset(1 / assetByCode(a.to).usd, a.to)}`],
          ["Fee", "Free"],
        ],
      };
    }
    case "recurring-create": {
      const b = billerById(a.billerId);
      return {
        icon: <PairIcon from={a.payWith} front={(sz) => <BillerThumb biller={b} size={sz} />} size={64} />,
        amount: `₦${a.amountNgn.toLocaleString()}`,
        line: `${b.name}${a.plan ? ` · ${a.plan}` : ""} · ${FREQUENCY_LABEL[a.frequency].toLowerCase()}`,
        rows: [
          [b.field === "meter" ? "Meter" : b.field === "smartcard" ? "Smartcard" : "Phone", a.target],
          ["Repeats", FREQUENCY_LABEL[a.frequency]],
          ["First payment", new Date(a.start).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })],
          ["Pays with", a.payWith],
          ["Fee", "Free"],
        ],
        note: "We'll remind you the day before each payment. Pause or delete it any time in Pay › Recurring.",
      };
    }
    case "referral-withdraw": {
      const received = (a.amountNgn * liveUsd("NGN", tick)) / liveUsd(a.to, tick);
      const to = assetByCode(a.to);
      return {
        icon: <PairIcon from="NGN" to={a.to} size={56} />,
        amount: `₦${a.amountNgn.toLocaleString()}`,
        line: `to your ${to.name} balance`,
        heading: `You're withdrawing ₦${a.amountNgn.toLocaleString()}`,
        sub: `From your referral earnings into ${to.name}`,
        breakdown: "Withdrawal breakdown",
        rows: [
          ["From", "Referral balance"],
          ["To", `${to.name} (${to.code})`],
          ...(a.to !== "NGN" ? ([["Rate", rateText("NGN", a.to, liveUsd("NGN", tick) / liveUsd(a.to, tick))]] as [string, string][]) : []),
          ["You receive", formatAsset(received, a.to)],
          ["Fee", "Free"],
          ["Lands", "Instantly"],
        ],
      };
    }
    case "cashpoint":
      return {
        icon: <CashpointMark size={56} />,
        amount: formatAsset(a.amount, "NGN"),
        line: "Cashpoint code",
        rows: [["Amount", formatAsset(a.amount, "NGN")], ["Fee", "Free"], ["Who can redeem", "Anyone with the code"]],
        note: "Share the code only with the person you're paying. Unredeemed codes can be cancelled from the receipt.",
      };
  }
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
  const isSwap = pending?.kind === "swap";

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
      {s.heading ? (
        <View style={{ gap: spacing.smd, paddingVertical: spacing.sm }}>
          {s.icon}
          <Text variant="title" style={{ marginTop: spacing.xs }}>
            {s.heading}
          </Text>
          {s.sub && (
            <Text variant="body" tone="muted">
              {s.sub}
            </Text>
          )}
        </View>
      ) : (
        <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md }}>
          {s.icon}
          <Text variant="largeTitle" align="center" adjustsFontSizeToFit numberOfLines={1} style={{ marginTop: spacing.sm }}>
            {s.amount}
          </Text>
          <Text variant="body" tone="muted" align="center">
            {s.line}
          </Text>
        </View>
      )}
      <ListSection inset={spacing.md} title={s.breakdown} action={isSwap ? <QuoteTimer /> : undefined}>
        {s.rows.map(([k, v]) => (
          <ListRow key={k} title={k} value={v} valueTone="text" compact />
        ))}
      </ListSection>
      {s.after}
      {s.note && <Note icon="info">{s.note}</Note>}
    </FlowScreen>
  );
}
