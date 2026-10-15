import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Note } from "@/components/bits";
import { GiftCardFace } from "@/components/brand-tiles";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { GIFT_BRANDS } from "@/data/catalog";
import { spacing } from "@/theme";

type Mode = "buy" | "sell";

export default function GiftCards() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>(params.mode === "sell" ? "sell" : "buy");
  const cardWidth = (width - spacing.md * 2 - spacing.smd) / 2;

  return (
    <Screen>
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: "buy", label: "Buy" },
          { value: "sell", label: "Sell" },
        ]}
      />
      <Note icon={mode === "buy" ? "gift" : "bank"} tone="brand">
        {mode === "buy" ? "Pay with USDT, BTC, dollars or Naira. Codes land instantly." : "Fair rates, paid out in any currency (crypto too) in minutes."}
      </Note>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.smd }}>
        {GIFT_BRANDS.map((b) => (
          <PressableScale key={b.id} onPress={() => router.push({ pathname: "/gift/[id]", params: { id: b.id, mode } })} accessibilityLabel={`${mode === "buy" ? "Buy" : "Sell"} ${b.name} gift card`} scaleTo={0.97} style={{ gap: spacing.sm }}>
            <GiftCardFace brand={b} width={cardWidth} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 }}>
              <Text variant="subhead">{b.name}</Text>
              {mode === "sell" && (
                <Text variant="subhead" tone="success">
                  ₦{b.sellRate.toLocaleString()}/$
                </Text>
              )}
            </View>
          </PressableScale>
        ))}
      </View>
    </Screen>
  );
}
