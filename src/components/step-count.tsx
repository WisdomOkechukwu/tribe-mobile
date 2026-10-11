import { View } from "react-native";
import { fonts, useColors } from "@/theme";
import { Text } from "./text";

/** "1/3" step counter for the top-right of multi-step flows (Create Account.png). */
export function StepCount({ step, of }: { step: number; of: number }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }} accessible accessibilityLabel={`Step ${step} of ${of}`}>
      <Text style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: c.text }}>{step}</Text>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12, lineHeight: 14, color: c.textMuted }}>/{of}</Text>
    </View>
  );
}
