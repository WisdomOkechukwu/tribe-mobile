import { View } from "react-native";
import { spacing, useColors } from "@/theme";
import { Icon, type IconName } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** 56pt circular action with label — the Home / asset / card action row. */
export function CircleAction({ icon, label, onPress, primary, badge }: { icon: IconName; label: string; onPress: () => void; primary?: boolean; badge?: boolean }) {
  const c = useColors();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} scaleTo={0.92} style={{ alignItems: "center", gap: spacing.sm, minWidth: 64 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: primary ? c.brand : c.surface, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={22} color={primary ? c.onBrand : c.text} />
        {badge && <View style={{ position: "absolute", top: 4, right: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent, borderWidth: 2, borderColor: primary ? c.brand : c.surface }} />}
      </View>
      <Text variant="subhead">{label}</Text>
    </PressableScale>
  );
}

export function CircleActionRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", justifyContent: "space-around" }}>{children}</View>;
}
