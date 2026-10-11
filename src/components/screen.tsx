import type { ReactNode } from "react";
import { RefreshControl, ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useColors } from "@/theme";
import { GLASS_TAB_BAR_HEIGHT } from "./glass-tab-bar";

/**
 * Scrollable screen body. Inside a native stack with large titles it lets iOS manage insets
 * (`automatic`); `footer` pins a CTA above the home indicator. Bottom padding clears the
 * floating glass tab bar.
 */
export function Screen({
  children,
  footer,
  padded = true,
  refreshing,
  onRefresh,
  contentStyle,
  background,
  ...props
}: ScrollViewProps & { children: ReactNode; footer?: ReactNode; padded?: boolean; refreshing?: boolean; onRefresh?: () => void; contentStyle?: StyleProp<ViewStyle>; /** page tint (e.g. the selected card's colour) */ background?: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: background ?? c.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.brand} colors={[c.brand]} /> : undefined}
        {...props}
        contentContainerStyle={[
          { gap: spacing.lg, paddingBottom: footer ? spacing.lg : insets.bottom + GLASS_TAB_BAR_HEIGHT + spacing.xl },
          padded && { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
      {footer && (
        <View style={{ paddingHorizontal: spacing.mdl, paddingTop: spacing.smd, paddingBottom: Math.max(insets.bottom, spacing.md), backgroundColor: background ?? c.bg, gap: spacing.sm }}>
          {footer}
        </View>
      )}
    </View>
  );
}
