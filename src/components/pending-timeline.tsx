import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import type { Transaction } from "@/data/seed";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";
import { Icon } from "./icon";
import { Text } from "./text";

type Step = { title: string; body?: string; state: "done" | "active" | "todo" };

/** What happens next for a pending transaction, in plain words. */
export function pendingSteps(tx: Transaction): Step[] {
  if (tx.type === "giftcard")
    return [
      { title: "Card submitted", body: tx.meta?.face, state: "done" },
      { title: "Checking the card", body: "We verify the code, usually within 15 minutes.", state: "active" },
      { title: `Paid to your ${tx.asset} balance`, body: formatAsset(tx.amount, tx.asset), state: "todo" },
    ];
  if (tx.type === "cashpoint")
    return [
      { title: "Code created", body: `${formatAsset(tx.amount, "NGN")} set aside from your Naira`, state: "done" },
      { title: "Waiting to be redeemed", body: "Anyone with the code can claim it in the Tribe app.", state: "active" },
      { title: "Redeemed", body: "We'll notify you the moment it's used.", state: "todo" },
    ];
  return [
    { title: "Submitted", state: "done" },
    { title: "Processing", body: "This usually takes a few minutes.", state: "active" },
    { title: "Completed", state: "todo" },
  ];
}

function Dot({ state }: { state: Step["state"] }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (state === "active" && !reduce) pulse.set(withRepeat(withSequence(withTiming(1.35, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
  }, [state, pulse, reduce]);
  const halo = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }], opacity: 2 - pulse.get() * 1.2 }));
  if (state === "done")
    return (
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.success, alignItems: "center", justifyContent: "center" }}>
        <Icon name="check" size={12} color="#fff" weight="bold" />
      </View>
    );
  if (state === "active")
    return (
      <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ position: "absolute", width: 24, height: 24, borderRadius: 12, backgroundColor: c.warningSoft }, halo]} />
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.pending }} />
      </View>
    );
  return <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: c.borderStrong }} />;
}

/** Vertical step tracker used on pending results and pending receipts. */
export function PendingTimeline({ tx }: { tx: Transaction }) {
  const c = useColors();
  const steps = pendingSteps(tx);
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }} accessibilityLabel="Progress">
      {steps.map((s, i) => (
        <View key={s.title} style={{ flexDirection: "row", gap: spacing.smd }}>
          <View style={{ alignItems: "center" }}>
            <Dot state={s.state} />
            {i < steps.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: s.state === "done" ? c.success : c.border, marginVertical: 3 }} />}
          </View>
          <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? spacing.md : 0, gap: 1 }}>
            <Text variant="bodyStrong" style={{ color: s.state === "todo" ? c.textMuted : c.text }}>
              {s.title}
            </Text>
            {s.body && (
              <Text variant="caption" tone="muted">
                {s.body}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
