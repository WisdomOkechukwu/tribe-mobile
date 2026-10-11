import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { BackHandler, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CopyField, Pill } from "@/components/bits";
import { BillerThumb } from "@/components/brand-tiles";
import { Button } from "@/components/button";
import { CardBadge } from "@/components/card-face";
import { CashpointTicket } from "@/components/cashpoint-ticket";
import { CoinIcon } from "@/components/coin-icon";
import { CashpointMark } from "@/components/cashpoint-mark";
import { Icon, type IconName } from "@/components/icon";
import { ListSection } from "@/components/list";
import { PendingTimeline } from "@/components/pending-timeline";
import { PressableScale } from "@/components/pressable-scale";
import { PrivacyGuard } from "@/components/privacy-guard";
import { Text } from "@/components/text";
import { TribeLoader } from "@/components/tribe-loader";
import { LEG_ICON, TransferLegs, type Leg } from "@/components/transfer-legs";
import { assetByCode, type AssetCode } from "@/data/assets";
import { billerById } from "@/data/catalog";
import type { Transaction } from "@/data/seed";
import { useBeneficiariesStore } from "@/stores/use-beneficiaries-store";
import { useCardsStore } from "@/stores/use-cards-store";
import { useFlowStore, type RecurringOffer } from "@/stores/use-flow-store";
import { useInboxStore } from "@/stores/use-inbox-store";
import { FREQUENCY_LABEL, nextDate, useRecurringStore, type Frequency } from "@/stores/use-recurring-store";
import { toast } from "@/stores/use-ui-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";

const FREQS: Frequency[] = ["weekly", "biweekly", "monthly"];

/** "Make this recurring?" — offered after a bill is paid (already PIN-authorised). */
function RecurringOfferCard({ offer }: { offer: RecurringOffer }) {
  const c = useColors();
  const add = useRecurringStore((s) => s.add);
  const [freq, setFreq] = useState<Frequency>("monthly");
  const [done, setDone] = useState(false);
  const b = billerById(offer.billerId);
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
        <BillerThumb biller={b} size={40} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{done ? `${b.name} renews ${FREQUENCY_LABEL[freq].toLowerCase()}` : "Make this recurring?"}</Text>
          <Text variant="caption" tone="muted">
            {done ? "Manage it any time in Pay › Recurring bills." : `Pay ₦${offer.amountNgn.toLocaleString()} automatically and never get cut off.`}
          </Text>
        </View>
        {done && <Pill label="On" tone="success" icon="check" />}
      </View>
      {!done && (
        <>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {FREQS.map((f) => {
              const on = f === freq;
              return (
                <PressableScale key={f} onPress={() => setFreq(f)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: on ? c.brand : c.surfaceAlt }}>
                  <Text variant="subhead" style={{ color: on ? c.onBrand : c.text }}>
                    {FREQUENCY_LABEL[f]}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          <Button
            title="Turn on"
            icon="repeat"
            variant="secondary"
            size="md"
            onPress={() => {
              add({ ...offer, frequency: freq, nextRun: nextDate(new Date(), freq).toISOString() });
              useInboxStore.getState().push({ kind: "money", title: "Recurring bill set up", body: `${b.name} · ₦${offer.amountNgn.toLocaleString()} ${FREQUENCY_LABEL[freq].toLowerCase()}`, href: "/pay/recurring" });
              toast("Recurring bill on", "success");
              setDone(true);
            }}
          />
        </>
      )}
    </View>
  );
}

/** The headline number for a result: what arrived, what the card got, or what left. */
function headlineAmount(tx: Transaction) {
  if (tx.type === "swap" && tx.toAsset) return `+${formatAsset(tx.toAmount!, tx.toAsset)}`;
  if (tx.type === "card" && tx.direction === "out" && tx.meta?.face?.startsWith("+$")) return tx.meta.face.split(" ")[0];
  return `${tx.direction === "in" ? "+" : ""}${formatAsset(tx.amount, tx.asset)}`;
}

/** Where the money moved, for swaps and card top-ups/withdrawals. */
function useLegs(tx: Transaction | undefined): { from: Leg; to: Leg } | null {
  const card = useCardsStore((s) => s.cards.find((k) => k.id === tx?.meta?.cardId));
  if (!tx) return null;
  const coin = (code: AssetCode) => <CoinIcon code={code} size={LEG_ICON} />;
  if (tx.type === "swap" && tx.toAsset) {
    return {
      from: { leading: coin(tx.asset), label: "You paid", title: assetByCode(tx.asset).name, value: formatAsset(tx.amount, tx.asset) },
      to: { leading: coin(tx.toAsset), label: "You received", title: assetByCode(tx.toAsset).name, value: `+${formatAsset(tx.toAmount!, tx.toAsset)}`, valueTone: "success" },
    };
  }
  if (tx.type === "card" && card && tx.meta?.face) {
    const usd = tx.meta.face.split(" ")[0].replace(/^[+−-]/, "");
    const cardLeg = (label: string, value: string, tone?: "success"): Leg => ({ leading: <CardBadge theme={card.theme} network={card.network} size={LEG_ICON} />, label, title: `${card.label} •• ${card.last4}`, value, valueTone: tone });
    if (tx.title === "Card top-up") return { from: { leading: coin(tx.asset), label: "Paid from", title: assetByCode(tx.asset).name, value: formatAsset(tx.amount, tx.asset) }, to: cardLeg("To", `+${usd}`, "success") };
    if (tx.title === "Card withdrawal") return { from: cardLeg("From", usd), to: { leading: coin(tx.asset), label: "To", title: assetByCode(tx.asset).name, value: `+${formatAsset(tx.amount, tx.asset)}`, valueTone: "success" } };
  }
  return null;
}

/** How long the card shows "Processing" before it settles (the PIN already approved it). */
const PROCESSING_MS = 900;

/** The settled icon: what kind of thing just happened. */
function ResultIcon({ tx, pending }: { tx?: Transaction; pending: boolean }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const size = 88;
  if (tx?.type === "cashpoint" && tx.direction === "out") return <CashpointMark size={size} />;
  const icon: IconName = !tx ? "repeat" : tx.type === "send" ? "paperplane" : tx.type === "swap" ? "swap" : tx.type === "card" ? "card" : tx.type === "bill" ? (tx.meta?.token ? "bolt" : "bill") : tx.type === "giftcard" ? "gift" : "receive";
  const [bg, fg] = pending ? [c.warningSoft, c.pending] : [c.brandSoft, c.brandText];
  return (
    <Animated.View entering={reduce ? undefined : FadeIn.duration(220)} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: size * 0.64, height: size * 0.64, borderRadius: size * 0.32, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={size * 0.28} color={fg} />
      </View>
      <View style={{ position: "absolute", right: 2, bottom: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: pending ? c.pending : c.success, borderWidth: 3, borderColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        <Icon name={pending ? "clock" : "check"} size={12} color="#fff" weight="bold" />
      </View>
    </Animated.View>
  );
}

function Check({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.xs }}>
      <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: on ? 0 : 1.5, borderColor: c.borderStrong, backgroundColor: on ? c.brand : "transparent", alignItems: "center", justifyContent: "center" }}>{on && <Icon name="check" size={11} color="#fff" weight="bold" />}</View>
      <Text variant="subhead">{label}</Text>
    </Pressable>
  );
}

/** Card that springs up over the dimmed PIN screen (Swap.png / Send / VC result sheets). */
function ResultCard({ children }: { children: ReactNode }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) v.set(withSpring(1, { damping: 17, stiffness: 190 }));
  }, [v, reduce]);
  const card = useAnimatedStyle(() => ({ opacity: Math.min(1, v.get() * 1.6), transform: [{ translateY: (1 - v.get()) * 60 }, { scale: 0.94 + 0.06 * v.get() }] }));
  const back = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) back.set(withTiming(1, { duration: 220 }));
  }, [back, reduce]);
  const dim = useAnimatedStyle(() => ({ opacity: back.get() }));
  return (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: spacing.md, paddingTop: insets.top + spacing.md, paddingBottom: Math.max(insets.bottom, spacing.md) }}>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", inset: 0, backgroundColor: c.overlay }, dim]} />
      <Animated.View accessibilityViewIsModal style={[{ maxHeight: height - insets.top - insets.bottom - spacing.xl, backgroundColor: c.bg, borderRadius: radius.panel, borderCurve: "continuous", overflow: "hidden", boxShadow: "0 30px 60px -20px rgba(20,0,40,0.45)" }, card]}>
        {children}
      </Animated.View>
    </View>
  );
}

/**
 * The payoff after every money flow (Swap.png, Send boards, Virtual Card.png): a card over the
 * dimmed PIN screen. It opens on "Processing", then settles into success — or stays pending
 * with its live steps. Presented ON TOP of /pin (push, not replace), so nothing flashes.
 * View details opens the receipt; Make another restarts the flow; Done closes everything.
 */
export default function Success() {
  const c = useColors();
  const reduce = useReducedMotion();
  const result = useFlowStore((s) => s.result);
  const origin = useFlowStore((s) => s.origin);
  const clear = useFlowStore((s) => s.clear);
  const addBeneficiary = useBeneficiariesStore((s) => s.add);
  const legs = useLegs(result?.tx);
  const [settled, setSettled] = useState(reduce);
  const [save, setSave] = useState(true);

  useEffect(() => {
    if (settled) return;
    const t = setTimeout(() => setSettled(true), PROCESSING_MS);
    return () => clearTimeout(t);
  }, [settled]);

  const keepBeneficiary = () => {
    if (result?.beneficiary && save) {
      addBeneficiary(result.beneficiary);
      toast(`${result.beneficiary.name} saved to beneficiaries`, "success");
    }
  };
  const closeAll = () => {
    if (router.canDismiss()) router.dismissAll();
    else router.replace("/");
  };
  const done = () => {
    keepBeneficiary();
    clear();
    closeAll();
  };
  const again = () => {
    keepBeneficiary();
    const href = origin;
    clear();
    closeAll();
    if (href) setTimeout(() => router.push(href as never), 60);
  };

  // Android back = Done (never back into the PIN pad)
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      clear();
      if (router.canDismiss()) router.dismissAll();
      else router.replace("/");
      return true;
    });
    return () => sub.remove();
  }, [clear]);

  if (!result) {
    return (
      <ResultCard>
        <View style={{ padding: spacing.lg, gap: spacing.md, alignItems: "center" }}>
          <Text variant="body" tone="muted">
            Nothing to show here.
          </Text>
          <Button title="Back to Tribe" inline onPress={done} />
        </View>
      </ResultCard>
    );
  }

  const { tx, headline, detail, extra, recurringOffer, beneficiary } = result;
  const cashpoint = tx?.type === "cashpoint" && tx.direction === "out" && !!tx.meta?.code;
  const pending = !!tx && tx.status === "pending" && !cashpoint;
  const amount = tx && !cashpoint ? headlineAmount(tx) : null;

  const openReceipt = () => {
    if (!tx) return;
    keepBeneficiary();
    clear();
    router.replace({ pathname: "/transaction/[id]", params: { id: tx.id } });
  };

  if (!settled) {
    return (
      <ResultCard>
        <View style={{ padding: spacing.xl, alignItems: "center", gap: spacing.md }} accessibilityLiveRegion="polite">
          <TribeLoader size={88} />
          <Text variant="title" align="center">
            Processing
          </Text>
          <Text variant="body" tone="muted" align="center">
            Your transaction is being processed.
          </Text>
        </View>
      </ResultCard>
    );
  }

  return (
    <ResultCard>
      {(cashpoint || extra) && <PrivacyGuard />}
      <ScrollView bounces={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ alignItems: "center", gap: spacing.sm }} accessibilityLiveRegion="polite">
          <ResultIcon tx={tx} pending={pending} />
          <Animated.View entering={reduce ? undefined : FadeInDown.delay(80).duration(320)} style={{ alignItems: "center", gap: spacing.xs, marginTop: spacing.xs }}>
            {pending && <Pill label="Processing" tone="warning" icon="clock" />}
            <Text variant="title" align="center">
              {headline}
            </Text>
            {amount && (
              <Text variant="balance" align="center" adjustsFontSizeToFit numberOfLines={1} style={{ fontSize: 34, lineHeight: 40, color: amount.startsWith("+") ? c.success : c.text }}>
                {amount}
              </Text>
            )}
            <Text variant="body" tone="muted" align="center" style={{ maxWidth: 300 }}>
              {detail}
            </Text>
          </Animated.View>
        </View>

        {legs && <TransferLegs from={legs.from} to={legs.to} />}
        {pending && tx && <PendingTimeline tx={tx} />}

        {cashpoint && tx ? (
          <CashpointTicket amount={formatAsset(tx.amount, "NGN")} code={tx.meta?.code} note="Anyone with this code can redeem it in the Tribe app." />
        ) : (
          extra && (
            <ListSection inset={spacing.md}>
              <CopyField label={extra.label} value={extra.value} mono />
            </ListSection>
          )
        )}

        {recurringOffer && <RecurringOfferCard offer={recurringOffer} />}
        {beneficiary && <Check on={save} onToggle={() => setSave((v) => !v)} label={`Save ${beneficiary.name.split(" ")[0]} to beneficiaries`} />}

        <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
          {tx ? <Button title="View details" onPress={openReceipt} /> : <Button title="Done" onPress={done} />}
          {origin && <Button title="Make another transaction" variant="secondary" onPress={again} />}
          {tx && <Button title="Done" variant="tertiary" size="md" onPress={done} />}
        </View>
      </ScrollView>
    </ResultCard>
  );
}
