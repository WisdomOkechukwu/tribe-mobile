import { View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { radius, spacing, useColors } from "@/theme";
import { Text } from "./text";

/**
 * Where you are in a multi-step flow: one segment per step (done and current in brand, upcoming
 * quiet), with the current step's name and "n of m". Steps are passed in, so optional ones
 * (e.g. Verify, only when it's needed) keep the count honest.
 */
export function FlowProgress({ steps, at, color }: { steps: string[]; at: number; color?: string }) {
  const c = useColors();
  const tone = color ?? c.brand;
  return (
    <View style={{ gap: spacing.sm }} accessible accessibilityLabel={`Step ${at + 1} of ${steps.length}: ${steps[at]}`}>
      <View style={{ flexDirection: "row", gap: spacing.xs }}>
        {steps.map((s, i) => (
          <Animated.View key={s} layout={LinearTransition} style={{ flex: i === at ? 2 : 1, height: 5, borderRadius: radius.full, backgroundColor: i <= at ? tone : c.border, opacity: i < at ? 0.55 : 1 }} />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.xxs }}>
        <Text variant="subhead">{steps[at]}</Text>
        <Text variant="caption" tone="muted">
          {at + 1} of {steps.length}
        </Text>
      </View>
    </View>
  );
}

/** The card-creation steps. ID checks happen before the flow opens (openCardCreation), never inside it. */
export const CARD_STEPS = ["Finish", "Network", "Details", "Review"];
