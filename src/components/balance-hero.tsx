import { View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { NGN_PER_USD } from "@/data/assets";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { radius, spacing, useColors } from "@/theme";
import { pickDisplayCurrency } from "@/utils/pickers";
import { formatMoney } from "@/utils/format";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/**
 * Home balance — no box. Label + eye, the big number (rolls on currency/visibility change),
 * a currency pill that opens a native picker, and the day's change.
 */
export function BalanceHero({ totalUsd, changePct }: { totalUsd: number; changePct: number }) {
  const c = useColors();
  const display = usePrefsStore((s) => s.display);
  const setDisplay = usePrefsStore((s) => s.setDisplay);
  const hidden = usePrefsStore((s) => s.hideBalances);
  const toggleHidden = usePrefsStore((s) => s.toggleHideBalances);
  const value = display === "USD" ? totalUsd : totalUsd * NGN_PER_USD;
  const up = changePct >= 0;

  const pickCurrency = () => pickDisplayCurrency(display, setDisplay);

  return (
    <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm }}>
      <PressableScale onPress={toggleHidden} hitSlop={10} accessibilityLabel={hidden ? "Show balances" : "Hide balances"} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text variant="subhead" tone="muted">
          Total balance
        </Text>
        <Icon name={hidden ? "eyeOff" : "eye"} size={15} color={c.textMuted} />
      </PressableScale>

      <View style={{ height: 52, justifyContent: "center", alignSelf: "stretch", overflow: "hidden" }}>
        <Animated.View key={`${display}-${hidden}`} entering={FadeInDown.springify().damping(18)} exiting={FadeOutUp.duration(140)}>
          <Text variant="balance" align="center" adjustsFontSizeToFit numberOfLines={1} accessibilityLabel={hidden ? "Balance hidden" : undefined}>
            {hidden ? (display === "USD" ? "$ ••••••" : "₦ ••••••") : formatMoney(value, display, { exact: true })}
          </Text>
        </Animated.View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <PressableScale onPress={pickCurrency} accessibilityLabel={`Display currency ${display}, change`} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.surface, borderRadius: radius.full, paddingLeft: spacing.smd, paddingRight: spacing.sm, paddingVertical: 5 }}>
          <Text variant="subhead">{display === "NGN" ? "₦ NGN" : "$ USD"}</Text>
          <Icon name="chevronDown" size={11} color={c.textMuted} weight="bold" />
        </PressableScale>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: up ? c.successSoft : c.dangerSoft, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 5 }}>
          <Icon name={up ? "send" : "receive"} size={10} color={up ? c.success : c.danger} weight="bold" />
          <Text variant="subhead" style={{ color: up ? c.success : c.danger }}>
            {Math.abs(changePct).toFixed(2)}% today
          </Text>
        </View>
      </View>
    </View>
  );
}
