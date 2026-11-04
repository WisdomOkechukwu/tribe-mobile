import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { Note, Pill } from "@/components/bits";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { useKyc } from "@/api/queries";
import { TIER_INFO } from "@/services/kyc";
import { TIER_LIMITS, useSessionStore } from "@/stores/use-session-store";
import { reviewAge, useTierStates, type TierState } from "@/utils/kyc-state";
import { openVerification } from "@/utils/verification";
import { radius, spacing, useColors } from "@/theme";

/**
 * Verification centre: current limits, then one row per tier saying where it stands (Verified /
 * In review / Needs attention / Start / After Tier N). Only the tier that can be started has a
 * button, so there's never more than one thing to do and nothing in review can be sent again.
 * While this is open and something is in review, it checks back every 30 seconds.
 */
export default function VerifyCentre() {
  const c = useColors();
  const tier = useSessionStore((s) => s.kycTier);
  const states = useTierStates();
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useKyc(focused && states.some((s) => s.state === "in_review"));

  return (
    <Screen>
      <View style={{ flexDirection: "row", backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="caption" tone="muted">
            Daily limit
          </Text>
          <Text variant="title">{TIER_LIMITS[tier].daily}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: c.border, marginHorizontal: spacing.md }} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="caption" tone="muted">
            Max balance
          </Text>
          <Text variant="title">{TIER_LIMITS[tier].balance}</Text>
        </View>
      </View>

      <ListSection title="Your tiers">
        {states.map((s) => (
          <TierRow key={s.tier} s={s} />
        ))}
      </ListSection>

      <Note icon="shield">Your identity details are checked against official records. Your documents are encrypted and never sold.</Note>
    </Screen>
  );
}

/** One tier: its badge, what it is, and where it stands. Only available / needs attention can be tapped. */
function TierRow({ s }: { s: TierState }) {
  const c = useColors();
  const info = TIER_INFO[s.tier];
  const startable = s.state === "available" || s.state === "needs_attention";
  const badge = {
    verified: { bg: c.success, icon: <Icon name="check" size={16} color="#fff" weight="bold" /> },
    in_review: { bg: c.warningSoft, icon: <Icon name="clock" size={15} color={c.text} /> },
    needs_attention: { bg: c.dangerSoft, icon: <Icon name="warning" size={15} color={c.danger} /> },
    available: { bg: c.brand, icon: <Text variant="bodyStrong" style={{ color: c.onBrand }}>{s.tier}</Text> },
    locked: { bg: c.sunken, icon: <Icon name="lock" size={14} color={c.textSubtle} /> },
  }[s.state];
  const subtitle =
    s.state === "in_review"
      ? `Submitted ${reviewAge(s.submittedAt) || "recently"}. We'll notify you when it's done.`
      : s.state === "needs_attention"
        ? (s.reason ?? "Your last try needs another look.")
        : info.unlocks;
  const trailing =
    s.state === "verified" ? (
      <Pill label="Verified" tone="success" />
    ) : s.state === "in_review" ? (
      <Pill label="In review" tone="warning" />
    ) : s.state === "locked" ? (
      <Text variant="caption" tone="muted">
        After Tier {s.afterTier ?? s.tier - 1}
      </Text>
    ) : (
      <Button title={s.state === "needs_attention" ? "Try again" : "Start"} size="sm" inline onPress={() => openVerification(s.tier)} />
    );
  return (
    <ListRow
      leading={<View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: badge.bg, alignItems: "center", justifyContent: "center" }}>{badge.icon}</View>}
      title={`Tier ${s.tier} · ${info.title}`}
      subtitle={subtitle}
      trailing={trailing}
      onPress={startable ? () => openVerification(s.tier) : undefined}
      accessibilityLabel={`Tier ${s.tier}, ${info.title}. ${{ verified: "Verified", in_review: "In review", needs_attention: "Needs attention", available: "Start", locked: "Locked" }[s.state]}`}
    />
  );
}
