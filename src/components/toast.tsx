import { Platform, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import { useUiStore } from "@/stores/use-ui-store";
import { radius, spacing, useColors } from "@/theme";
import { Icon } from "./icon";
import { Text } from "./text";

/**
 * Global toast host — mounted once in the root layout. Call toast("Copied") anywhere.
 * Rendered in a FullWindowOverlay so it shows above native modals and sheets on iOS.
 */
export function ToastHost() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const t = useUiStore((s) => s.toast);
  if (!t) return null;
  const tint = t.tone === "danger" ? c.danger : t.tone === "success" ? c.success : c.brandText;
  const content = (
      <View pointerEvents="none" style={{ position: "absolute", top: insets.top + spacing.sm, left: 0, right: 0, alignItems: "center", zIndex: 1000 }}>
        <Animated.View
          key={t.id}
          entering={FadeInUp.springify().damping(18)}
          accessibilityLiveRegion="polite"
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surface, borderRadius: radius.full, paddingVertical: spacing.smd, paddingLeft: spacing.smd, paddingRight: spacing.md, boxShadow: "0 12px 30px -10px rgba(20,10,30,0.35)", borderWidth: 1, borderColor: c.border }}
        >
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.tone === "danger" ? c.dangerSoft : t.tone === "success" ? c.successSoft : c.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name={t.tone === "danger" ? "warning" : "check"} size={12} color={tint} weight="bold" />
          </View>
          <Text variant="bodyStrong">{t.message}</Text>
        </Animated.View>
      </View>
  );
  // FullWindowOverlay is iOS-only (it warns elsewhere); Android/web stack the host last instead.
  return Platform.OS === "ios" ? <FullWindowOverlay>{content}</FullWindowOverlay> : content;
}
