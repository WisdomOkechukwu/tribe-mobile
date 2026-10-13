import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FlipInEasyX } from "react-native-reanimated";
import { Button } from "@/components/button";
import { useCardPalette, VirtualCardFace } from "@/components/card-face";
import { CARD_STEPS, FlowProgress } from "@/components/flow-progress";
import { FlowScreen } from "@/components/flow-screen";
import { Icon, type IconName } from "@/components/icon";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import type { CardNetwork, CardTheme } from "@/data/seed";
import { useSessionStore } from "@/stores/use-session-store";
import { radius, spacing, useColors } from "@/theme";

const TYPES: Record<CardNetwork, { title: string; points: [IconName, string][] }> = {
  mastercard: {
    title: "Mastercard",
    points: [
      ["globe", "Accepted almost everywhere online"],
      ["repeat", "Best for subscriptions: Netflix, Spotify, Apple"],
      ["gift", "Great for shopping and in-app purchases"],
    ],
  },
  visa: {
    title: "Visa",
    points: [
      ["globe", "Accepted almost everywhere online"],
      ["paperplane", "Best for travel bookings and hotels"],
      ["card", "Great for everyday spending abroad"],
    ],
  },
};

/** New card · Network: the card in your finish, with Mastercard / Visa swapped live on it. */
export default function CardType() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const { theme = "midnight" } = useLocalSearchParams<{ theme?: CardTheme }>();
  const user = useSessionStore((s) => s.user);
  const tint = useCardPalette(theme);
  const [network, setNetwork] = useState<CardNetwork>("mastercard");
  const t = TYPES[network];

  return (
    <FlowScreen
      title="Pick a network"
      cancel="back"
      tint={tint.page}
      footer={<Button title={`Continue with ${t.title}`} colors={{ bg: tint.accent, fg: tint.accentFg }} onPress={() => router.push({ pathname: "/card-new/details", params: { theme, network } })} />}
    >
      <FlowProgress steps={CARD_STEPS} at={1} color={tint.accent} />

      {/* the card itself, re-flipped whenever the network changes */}
      <Animated.View key={network} entering={FlipInEasyX.springify().damping(16)} style={{ alignItems: "center" }}>
        <VirtualCardFace card={{ theme, network, holder: `${user.firstName} ${user.lastName}`, number: network === "visa" ? "4532" : "5399", last4: "••••", expiry: "09/29", cvv: "", frozen: false }} width={width - spacing.mdl * 2} />
      </Animated.View>

      <Segmented<CardNetwork>
        value={network}
        onChange={(n) => {
          Haptics.selectionAsync().catch(() => {});
          setNetwork(n);
        }}
        options={[
          { value: "mastercard", label: "Mastercard" },
          { value: "visa", label: "Visa" },
        ]}
      />

      <Animated.View key={`p-${network}`} entering={FadeIn.duration(220)} style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, gap: spacing.md }}>
        {t.points.map(([icon, line]) => (
          <View key={line} style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: tint.soft, alignItems: "center", justifyContent: "center" }}>
              <Icon name={icon} size={15} color={tint.accent} />
            </View>
            <Text variant="body" style={{ flex: 1 }}>
              {line}
            </Text>
          </View>
        ))}
      </Animated.View>

    </FlowScreen>
  );
}
