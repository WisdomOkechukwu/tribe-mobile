import { router, useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { copyToClipboard, EmptyState, Pill, StatusPill } from "@/components/bits";
import { BillerThumb, GiftMark } from "@/components/brand-tiles";
import { Button } from "@/components/button";
import { CashpointMark } from "@/components/cashpoint-mark";
import { CoinIcon } from "@/components/coin-icon";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { ListRow, ListSection, SectionLink } from "@/components/list";
import { PairIcon } from "@/components/pair-icon";
import { PendingTimeline } from "@/components/pending-timeline";
import { PressableScale } from "@/components/pressable-scale";
import { PrivacyGuard } from "@/components/privacy-guard";
import { ReceiptTicket } from "@/components/receipt-ticket";
import { Text } from "@/components/text";
import { CardLeading, showFace, TransactionGroup } from "@/components/transaction-row";
import { billerById, giftBrandById } from "@/data/catalog";
import type { Transaction } from "@/data/seed";
import { overlay } from "@/stores/use-overlay-store";
import { ISSUE_REASON, useSupportStore } from "@/stores/use-support-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { spacing, useColors } from "@/theme";
import { downloadReceipt, shareReceipt } from "@/utils/share-receipt";
import { formatAsset } from "@/utils/format";
import { headline, receiptRows, senderOf, txTitle } from "@/utils/tx";

function Hero({ tx }: { tx: Transaction }) {
  if (tx.type === "swap" && tx.toAsset) return <PairIcon from={tx.asset} to={tx.toAsset} size={72} />;
  if (tx.type === "bill" && tx.meta?.billerId) {
    const b = billerById(tx.meta.billerId);
    return <PairIcon from={tx.asset} front={(s) => <BillerThumb biller={b} size={s} />} size={72} />;
  }
  if (tx.type === "giftcard" && tx.meta?.giftBrand) {
    const g = giftBrandById(tx.meta.giftBrand);
    return <PairIcon from={tx.asset} front={(s) => <GiftMark brand={g} size={s} />} size={72} />;
  }
  if (tx.type === "cashpoint") return <CashpointMark size={60} />;
  if (tx.type === "card") return <CardLeading tx={tx} size={72} />;
  // earnings underneath (from), the balance they landed in in front (to)
  if (tx.type === "referral") return <PairIcon from="Referral earnings" to={tx.asset} back={(s) => <ReferralMark size={s} />} size={72} />;
  return <CoinIcon code={tx.asset} size={60} />;
}

function ReferralMark({ size }: { size: number }) {
  const c = useColors();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
      <Icon name="people" size={size * 0.45} color="#fff" />
    </View>
  );
}

/** The receipt image, previewed in a sheet — then shared or saved (Transaction.png). */
function ReceiptSheet({ tx, first }: { tx: Transaction; first: "share" | "download" }) {
  const ref = useRef<View>(null);
  const { width } = useWindowDimensions();
  const w = Math.min(width - spacing.mdl * 2, 360);
  const share = <Button key="share" title="Share" icon="share" variant={first === "share" ? "primary" : "secondary"} style={{ flex: 1 }} onPress={() => shareReceipt(ref, tx)} />;
  const save = <Button key="save" title="Save image" icon="download" variant={first === "download" ? "primary" : "secondary"} style={{ flex: 1 }} onPress={() => downloadReceipt(ref, tx)} />;
  return (
    <View style={{ paddingHorizontal: spacing.mdl, gap: spacing.md }}>
      <ScrollView showsHorizontalScrollIndicator={false} style={{ maxHeight: 460 }} contentContainerStyle={{ alignItems: "center" }} showsVerticalScrollIndicator={false}>
        <ReceiptTicket ref={ref} tx={tx} width={w} />
      </ScrollView>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>{first === "share" ? [save, share] : [share, save]}</View>
    </View>
  );
}

/** Money in: every other payment from the same sender, totalled, with a way into the full list. */
function MoreFromSender({ tx }: { tx: Transaction }) {
  const c = useColors();
  const sender = senderOf(tx);
  const all = useWalletStore((s) => s.transactions);
  if (!sender) return null;
  const fromThem = all.filter((t) => senderOf(t)?.key === sender.key);
  const others = fromThem.filter((t) => t.id !== tx.id);
  if (!others.length) return null;
  // totals per currency ("$1,350 · ₦35,000"), every payment from them including this one
  const totals = new Map<Transaction["asset"], number>();
  for (const t of fromThem) totals.set(t.asset, (totals.get(t.asset) ?? 0) + t.amount);
  const seeAll = () => {
    router.back();
    router.push({ pathname: "/activity", params: { from: sender.key, fromName: sender.name } }, { withAnchor: true });
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: spacing.xs }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="headline" numberOfLines={1}>
            More from {sender.name}
          </Text>
          <Text variant="caption" tone="muted">
            {[...totals].map(([code, sum]) => formatAsset(sum, code)).join(" · ")} across {fromThem.length} payments
          </Text>
        </View>
        {others.length > 3 && <SectionLink label="See all" onPress={seeAll} />}
      </View>
      <TransactionGroup items={others.slice(0, 3)} />
      {others.length <= 3 && (
        <PressableScale onPress={seeAll} accessibilityRole="button" style={{ alignSelf: "center", paddingVertical: spacing.xs }}>
          <Text variant="subhead" style={{ color: c.brandText }}>
            View all in History
          </Text>
        </PressableScale>
      )}
    </View>
  );
}

const openReceiptSheet = (tx: Transaction, first: "share" | "download") => overlay.sheet({ title: "Receipt", content: () => <ReceiptSheet tx={tx} first={first} /> });

/**
 * Transaction details (Transaction.png): the hero, a "{type} details" list built for each kind
 * of transaction (utils/tx.ts), Share receipt + Download as an image, and Report an issue.
 */
export default function Receipt() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx = useWalletStore((s) => s.transactions.find((t) => t.id === id));
  const ticket = useSupportStore((s) => s.tickets.find((k) => k.txId === id));

  if (!tx) {
    return (
      <FlowScreen title="Transaction details" cancel="x">
        <EmptyState icon="history" title="Transaction not found" body="It may have been cleared when demo data was reset." />
      </FlowScreen>
    );
  }

  const isSwap = tx.type === "swap" && tx.toAsset;
  const bought = (tx.type === "bill" || tx.type === "giftcard" || tx.type === "card") && !!tx.meta?.face;
  const { title, rows } = receiptRows(tx);

  return (
    <FlowScreen
      title="Transaction details"
      cancel="x"
      footer={
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Button title="Share" icon="share" variant="secondary" style={{ flex: 1 }} onPress={() => openReceiptSheet(tx, "share")} />
          <Button title="Download" icon="download" style={{ flex: 1 }} onPress={() => openReceiptSheet(tx, "download")} />
        </View>
      }
    >
      {(tx.meta?.token || tx.meta?.code) && <PrivacyGuard />}
      <View style={{ alignItems: "center", gap: spacing.sm }}>
        <Hero tx={tx} />
        <Text variant="subhead" tone="muted" style={{ marginTop: spacing.sm }}>
          {txTitle(tx)}
        </Text>
        <Text variant="largeTitle" tone={tx.status === "failed" || tx.status === "cancelled" ? "muted" : tx.direction === "in" || isSwap ? "success" : "text"} adjustsFontSizeToFit numberOfLines={1}>
          {headline(tx)}
        </Text>
        {bought && showFace(tx) && (
          <Text variant="body" tone="muted" align="center">
            {tx.direction === "in" ? `for your ${tx.meta!.face}` : `for ${tx.meta!.face}`}
          </Text>
        )}
        {/* wrapped: Pill pins itself to flex-start, the wrapper is what the column centres */}
        <View>
          <StatusPill status={tx.status} />
        </View>
      </View>
      {tx.status === "pending" && <PendingTimeline tx={tx} />}
      <ListSection title={title} inset={spacing.md}>
        {rows.map((r) => (
          <ListRow
            key={r.label}
            title={r.label}
            value={r.value}
            valueTone={r.tone === "success" ? "success" : undefined}
            compact
            trailing={
              r.copy ? (
                <PressableScale onPress={() => copyToClipboard(r.copy!, `${r.label} copied`)} hitSlop={12} accessibilityLabel={`Copy ${r.label.toLowerCase()}`}>
                  <Icon name="copy" size={15} color={c.brandText} />
                </PressableScale>
              ) : undefined
            }
          />
        ))}
      </ListSection>
      <MoreFromSender tx={tx} />
      {ticket ? (
        <ListSection title="Support">
          <ListRow icon="chatLine" title={`Issue reported · ${ticket.id}`} subtitle={`${ISSUE_REASON[ticket.reason].label} · we'll reply in your inbox`} trailing={<Pill label="Open" tone="warning" />} />
        </ListSection>
      ) : (
        <PressableScale onPress={() => router.push({ pathname: "/report/[id]", params: { id: tx.id } })} accessibilityRole="button" style={{ flexDirection: "row", alignSelf: "center", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm }}>
          <Icon name="info" size={15} color={c.textMuted} />
          <Text variant="bodyStrong" tone="muted">
            Report an issue
          </Text>
        </PressableScale>
      )}
    </FlowScreen>
  );
}
