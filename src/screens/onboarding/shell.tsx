import { router } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { Icon, type IconName } from "@/components/icon";
import { KeyboardFrame } from "@/components/keyboard-frame";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { spacing, useColors } from "@/theme";

/** Soft circle with an icon — the SBU-style header art for every step. */
export function IconBadge({ icon, tone = "brand", size = 72 }: { icon: IconName; tone?: "brand" | "success" | "accent"; size?: number }) {
  const c = useColors();
  const [bg, fg] = tone === "success" ? [c.successSoft, c.success] : tone === "accent" ? [c.accentSoft, c.accentText] : [c.brandSoft, c.brandText];
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: size * 0.62, height: size * 0.62, borderRadius: size * 0.31, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={size * 0.3} color={fg} />
      </View>
    </Animated.View>
  );
}

/**
 * Shared frame for every signup step (SBU.png layout): round back button, optional icon badge,
 * title + subtitle, body, pinned buttons. With `icon` the heading centres.
 */
export function OnboardingShell({
  title,
  subtitle,
  icon,
  iconTone,
  children,
  footer,
  scroll = true,
  onBack,
  back = true,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTone?: "brand" | "success" | "accent";
  children?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  onBack?: () => void;
  back?: boolean;
  right?: ReactNode;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const centred = !!icon;
  const heading = (
    <Animated.View entering={FadeInDown.duration(360)} style={{ gap: spacing.sm, alignItems: centred ? "center" : "flex-start" }}>
      {icon && (
        <View style={{ marginBottom: spacing.sm }}>
          <IconBadge icon={icon} tone={iconTone} />
        </View>
      )}
      <Text variant="largeTitle" align={centred ? "center" : "left"} style={{ fontSize: 28, lineHeight: 33 }}>
        {title}
      </Text>
      {subtitle && (
        <Text variant="body" tone="muted" align={centred ? "center" : "left"}>
          {subtitle}
        </Text>
      )}
    </Animated.View>
  );
  const body = (
    <>
      {heading}
      <Animated.View entering={FadeInDown.duration(360).delay(70)} style={{ gap: spacing.lg, flexGrow: 1 }}>
        {children}
      </Animated.View>
    </>
  );

  return (
    <KeyboardFrame backgroundColor={c.bg}>
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.mdl, flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: insets.top + 52 }}>
        {back ? (
          <PressableScale accessibilityLabel="Back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : null))} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
            <Icon name="back" size={17} color={c.text} />
          </PressableScale>
        ) : (
          <View />
        )}
        {right}
      </View>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" contentContainerStyle={{ padding: spacing.mdl, paddingTop: spacing.lg, gap: spacing.xl, flexGrow: 1 }}>
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: spacing.mdl, paddingTop: spacing.lg, gap: spacing.xl }}>{body}</View>
      )}
      {footer && <View style={{ paddingHorizontal: spacing.mdl, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.md), gap: spacing.sm }}>{footer}</View>}
    </KeyboardFrame>
  );
}

/** "Phone number added successfully." style interstitial: big badge, one message, one button. */
export function StatusScreen({ icon, title, body, cta, onPress, tone = "success" }: { icon: IconName; title: string; body?: string; cta: string; onPress: () => void; tone?: "brand" | "success" }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.md), paddingHorizontal: spacing.mdl }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md }}>
        <IconBadge icon={icon} tone={tone} size={96} />
        <Animated.View entering={FadeInDown.delay(120)} style={{ alignItems: "center", gap: spacing.sm, marginTop: spacing.sm }}>
          <Text variant="title" align="center" style={{ maxWidth: 300 }}>
            {title}
          </Text>
          {body && (
            <Text variant="body" tone="muted" align="center" style={{ maxWidth: 300 }}>
              {body}
            </Text>
          )}
        </Animated.View>
      </View>
      <Button title={cta} onPress={onPress} />
    </View>
  );
}
