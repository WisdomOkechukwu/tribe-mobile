import { router } from "expo-router";
import { View } from "react-native";
import { Note, Pill } from "@/components/bits";
import { Icon } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TIER_INFO } from "@/services/kyc";
import { TIER_LIMITS, useSessionStore, type KycTier } from "@/stores/use-session-store";
import { radius, spacing, useColors } from "@/theme";

/** Verification centre: current limits, then the tier ladder with the next step highlighted. */
export default function VerifyCentre() {
  const c = useColors();
  const tier = useSessionStore((s) => s.kycTier);
  const status = useSessionStore((s) => s.kycStatus);

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
      {status === "pending" && <Note icon="clock" tone="warning">Your verification is being reviewed. We&apos;ll notify you.</Note>}

      <ListSection title="Your tiers">
        {([1, 2, 3] as Exclude<KycTier, 0>[]).map((t) => {
          const done = tier >= t;
          const next = t === tier + 1;
          const locked = t > tier + 1;
          const info = TIER_INFO[t];
          return (
            <ListRow
              key={t}
              leading={
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: done ? c.success : next ? c.brand : c.sunken, alignItems: "center", justifyContent: "center" }}>
                  {done ? <Icon name="check" size={16} color="#fff" weight="bold" /> : locked ? <Icon name="lock" size={14} color={c.textSubtle} /> : <Text variant="bodyStrong" style={{ color: "#fff" }}>{t}</Text>}
                </View>
              }
              title={`Tier ${t} · ${info.title}`}
              subtitle={info.unlocks}
              chevron={next}
              trailing={done ? <Pill label="Done" tone="success" /> : next ? <Pill label={TIER_LIMITS[t].daily} tone="brand" /> : undefined}
              onPress={next ? () => router.push({ pathname: "/verify/[tier]", params: { tier: String(t) } }) : undefined}
            />
          );
        })}
      </ListSection>

      <Note icon="shield">Your identity details are checked against official records. Your documents are encrypted and never sold.</Note>
    </Screen>
  );
}
