import { router, useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { copyToClipboard, EmptyState, Pill } from "@/components/bits";
import { Button } from "@/components/button";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { ListRow, ListSection, SectionLink } from "@/components/list";
import { PendingTimeline } from "@/components/pending-timeline";
import { PressableScale } from "@/components/pressable-scale";
import { PrivacyGuard } from "@/components/privacy-guard";
import { ReceiptPoster, ReceiptStub, Scallops } from "@/components/receipt-poster";
import { ReceiptTicket } from "@/components/receipt-ticket";
import { Text } from "@/components/text";
import { TransactionGroup } from "@/components/transaction-row";
import type { Transaction } from "@/data/seed";
import { overlay } from "@/stores/use-overlay-store";
import { ISSUE_REASON, useSupportStore } from "@/stores/use-support-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";
import { captureReceipt, saveReceiptImage, shareReceiptImage } from "@/utils/share-receipt";
import { senderOf } from "@/utils/tx";

/**
 * The receipt image, previewed in a sheet. Share captures it, then CLOSES the sheet before the
 * system share sheet opens (our overlay sits above everything on iOS and would cover it).
 */
function ReceiptSheet({ tx, first, close }: { tx: Transaction; first: "share" | "download"; close: (after?: () => void) => void }) {
  const ref = useRef<View>(null);
  const { width } = useWindowDimensions();
  const w = Math.min(width - spacing.mdl * 2, 360);
  const share = async () => {
    const uri = await captureReceipt(ref);
    close(() => void shareReceiptImage(uri, tx));
  };
  const save = async () => {
    const uri = await captureReceipt(ref);
    close(() => void saveReceiptImage(uri, tx));
  };
  const shareBtn = <Button key="share" title="Share" icon="share" variant={first === "share" ? "primary" : "secondary"} style={{ flex: 1 }} onPress={share} />;
  const saveBtn = <Button key="save" title="Save image" icon="download" variant={first === "download" ? "primary" : "secondary"} style={{ flex: 1 }} onPress={save} />;
  return (
    <View style={{ paddingHorizontal: spacing.mdl, gap: spacing.md }}>
      <ScrollView showsHorizontalScrollIndicator={false} style={{ maxHeight: 480 }} contentContainerStyle={{ alignItems: "center" }} showsVerticalScrollIndicator={false}>
        <ReceiptTicket ref={ref} tx={tx} width={w} />
      </ScrollView>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>{first === "share" ? [saveBtn, shareBtn] : [shareBtn, saveBtn]}</View>
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

const openReceiptSheet = (tx: Transaction, first: "share" | "download") => overlay.sheet({ title: "Receipt", content: (close) => <ReceiptSheet tx={tx} first={first} close={close} /> });

/**
 * Transaction details as a poster receipt (Gen-Z, Transaction.png's content): the Midnight band
 * with the status sticker and the amount, then the paper stub (details built per kind in
 * utils/tx.ts, any token or code in its own box, barcode + reference). Share / Download make
 * the image; Report an issue sits underneath.
 */
export default function Receipt() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx = useWalletStore((s) => s.transactions.find((t) => t.id === id));
  const ticket = useSupportStore((s) => s.tickets.find((k) => k.txId === id));

  if (!tx) {
    return (
      <FlowScreen title="Receipt" cancel="x">
        <EmptyState icon="history" title="Transaction not found" body="It may have been cleared when demo data was reset." />
      </FlowScreen>
    );
  }
  const w = Math.min(width - spacing.mdl * 2, 520);

  return (
    <FlowScreen
      title="Receipt"
      cancel="x"
      footer={
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <PressableScale onPress={() => openReceiptSheet(tx, "download")} accessibilityLabel="Download receipt" style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
            <Icon name="download" size={20} color={c.text} />
          </PressableScale>
          <Button title="Share receipt" icon="share" style={{ flex: 1 }} onPress={() => openReceiptSheet(tx, "share")} />
        </View>
      }
    >
      {(tx.meta?.token || tx.meta?.code) && <PrivacyGuard />}

      {/* the poster, then the paper stub (theme-aware), with a scalloped foot */}
      <View>
        <View style={{ borderTopLeftRadius: radius.panel, borderTopRightRadius: radius.panel, borderCurve: "continuous", overflow: "hidden" }}>
          <ReceiptPoster tx={tx} width={w} />
        </View>
        <ReceiptStub tx={tx} colors={{ paper: c.surface, ink: c.text, muted: c.textMuted, line: c.borderStrong, soft: c.brandSoft, success: c.success, brand: c.brandText, notch: c.bg }} onCopy={(r) => r.copy && copyToClipboard(r.copy, `${r.label} copied`)} />
        <Scallops width={w} color={c.surface} />
      </View>

      {tx.status === "pending" && <PendingTimeline tx={tx} />}
      <MoreFromSender tx={tx} />
      {ticket ? (
        <ListSection title="Support">
          <ListRow icon="chatLine" title={`Issue reported · ${ticket.id}`} subtitle={`${ISSUE_REASON[ticket.reason].label} · we'll reply in your inbox`} trailing={<Pill label="Open" tone="warning" />} />
        </ListSection>
      ) : (
        <PressableScale onPress={() => router.push({ pathname: "/report/[id]", params: { id: tx.id } })} accessibilityRole="button" style={{ flexDirection: "row", alignSelf: "center", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm }}>
          <Icon name="help" size={15} color={c.textMuted} />
          <Text variant="subhead" tone="muted">
            Something wrong? Report an issue
          </Text>
        </PressableScale>
      )}
    </FlowScreen>
  );
}
