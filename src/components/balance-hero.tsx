import { View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { radius, spacing, useColors } from "@/theme";
import { formatMoney } from "@/utils/format";
import { ngnPerUsd } from "@/utils/rates";
import { useRatesVersion } from "@/api/live-rates";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/**
 * Home balance — no box. Label + eye, the big number (rolls on currency/visibility change),
 * and a currency pill that flips the display between USD and NGN on tap.
 */
export function BalanceHero({ totalUsd }: { totalUsd: number }) {
  const c = useColors();
  const display = usePrefsStore((s) => s.display);
  const setDisplay = usePrefsStore((s) => s.setDisplay);
  const hidden = usePrefsStore((s) => s.hideBalances);
  const toggleHidden = usePrefsStore((s) => s.toggleHideBalances);
  const v = useRatesVersion();
  const value = display === "USD" ? totalUsd : totalUsd * ngnPerUsd(v);

  const toggleCurrency = () => setDisplay(display === "USD" ? "NGN" : "USD");

  return (
    <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm }}>
      <PressableScale onPress={toggleHidden} hitSlop={10} accessibilityLabel={hidden ? "Show balances" : "Hide balances"} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Text variant="subhead" tone="muted">
          Total balance
        </Text>
        <Icon name={hidden ? "eyeOff" : "eye"} size={15} color={c.textMuted} />
      </PressableScale>

      {/* minHeight, not height: a fixed height caps the text's measure, and Android's
          adjustsFontSizeToFit shrinks the font but never the lineHeight, so it fell to 4pt */}
      <View style={{ minHeight: 52, justifyContent: "center", alignSelf: "stretch", overflow: "hidden" }}>
        <Animated.View key={`${display}-${hidden}`} entering={FadeInDown.springify().damping(18)} exiting={FadeOutUp.duration(140)}>
          <Text variant="balance" align="center" adjustsFontSizeToFit numberOfLines={1} accessibilityLabel={hidden ? "Balance hidden" : undefined}>
            {hidden ? (display === "USD" ? "$ ••••••" : "₦ ••••••") : formatMoney(value, display, { exact: true })}
          </Text>
        </Animated.View>
      </View>

      <PressableScale onPress={toggleCurrency} accessibilityLabel={`Display currency ${display}, switch to ${display === "USD" ? "NGN" : "USD"}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: c.surface, borderRadius: radius.full, paddingLeft: spacing.smd, paddingRight: spacing.sm, paddingVertical: 5 }}>
        <Text variant="subhead">{display === "NGN" ? "₦ NGN" : "$ USD"}</Text>
        <Icon name="swap" size={11} color={c.textMuted} weight="bold" />
      </PressableScale>
    </View>
  );
}
