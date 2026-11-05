import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icon";
import { KeyboardFrame } from "@/components/keyboard-frame";
import { PressableScale } from "@/components/pressable-scale";
import { Stripes } from "@/components/stripes";
import { Text } from "@/components/text";
import { palette, radius, spacing, useColors } from "@/theme";

const BAND = palette.purple[900];
const OVERLAP = spacing.lg;

/** The Tribe logo on a white disc: its purple bands need a light ground on purple-900. */
export function MarkDisc({ size = 38 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }} accessible accessibilityLabel="Tribe">
      <Image source={require("@/assets/brand/tribe-logo.png")} style={{ width: size * 0.72, height: size * 0.72 }} contentFit="contain" />
    </View>
  );
}

/** Thin segments for "step n of m", white on the band, orange once done. */
function Steps({ at, of }: { at: number; of: number }) {
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }} accessible accessibilityLabel={`Step ${at} of ${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <View key={i} style={{ width: 22, height: 4, borderRadius: radius.full, backgroundColor: i < at ? palette.orange[400] : "rgba(255,255,255,0.22)" }} />
      ))}
    </View>
  );
}

/**
 * Frame for every signed-out screen: a purple-900 brand band (logo stripes in the corner, the
 * mark, loud caps headline whose last line is orange) with a light sheet rising over it for
 * the form. The band lives inside the scroll view so it scrolls away above the keyboard on
 * small phones; the footer (CTA + switch link) stays pinned. Post-signup setup keeps
 * OnboardingShell.
 */
export function AuthShell({
  headline,
  kicker,
  step,
  subtitle,
  children,
  footer,
  band = "tall",
  scroll = true,
  back = true,
}: {
  /** one entry per line; the last line is the orange accent */
  headline: string[];
  kicker?: string;
  step?: { at: number; of: number };
  subtitle?: string;
  children?: ReactNode;
  footer?: ReactNode;
  band?: "tall" | "compact";
  scroll?: boolean;
  back?: boolean;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const label = step ? `Step ${step.at} of ${step.of}` : kicker;

  const top = (
    <View style={{ backgroundColor: BAND, overflow: "hidden", paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.mdl, paddingBottom: OVERLAP + spacing.lg, minHeight: band === "tall" ? Math.max(260, height * 0.36) : undefined, justifyContent: "space-between", gap: spacing.lg }}>
      {/* crisp logo bands in the corner (low opacity muddied orange into brown on purple-900) */}
      <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "34%", overflow: "hidden" }}>
        <Stripes band={14} gap={18} colors={[palette.orange[500], palette.purple[500]]} opacity={0.9} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
        {back ? (
          <PressableScale accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : null)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="back" size={17} color="#fff" />
          </PressableScale>
        ) : (
          <MarkDisc />
        )}
        {back && <MarkDisc />}
      </View>
      <View style={{ gap: spacing.smd }}>
        {(label || step) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
            {step && <Steps at={step.at} of={step.of} />}
            {label && (
              <Text variant="overline" style={{ color: palette.orange[300] }}>
                {label}
              </Text>
            )}
          </View>
        )}
        <Text variant="poster" accessibilityRole="header" maxFontSizeMultiplier={1.2} style={{ color: "#fff" }}>
          {headline.map((line, i) => (
            <Text key={line} variant="poster" style={{ color: i === headline.length - 1 ? palette.orange[400] : "#fff" }}>
              {i > 0 ? "\n" : ""}
              {line}
            </Text>
          ))}
        </Text>
      </View>
    </View>
  );

  const sheet = (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={{ marginTop: -OVERLAP, flexGrow: 1, flexShrink: scroll ? 0 : 1, backgroundColor: c.bg, borderTopLeftRadius: radius.panel, borderTopRightRadius: radius.panel, borderCurve: "continuous", padding: spacing.mdl, paddingTop: spacing.lg, gap: spacing.lg }}>
      {subtitle && (
        <Text variant="body" tone="muted">
          {subtitle}
        </Text>
      )}
      {children}
    </Animated.View>
  );

  return (
    <KeyboardFrame backgroundColor={c.bg}>
      <StatusBar style="light" />
      {scroll ? (
        <ScrollView showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          {/* pull-down bounce shows purple, not a light gap above the band */}
          <View style={{ position: "absolute", top: -1000, left: 0, right: 0, height: 1000, backgroundColor: BAND }} />
          {top}
          {sheet}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {top}
          {sheet}
        </View>
      )}
      {footer && <View style={{ backgroundColor: c.bg, paddingHorizontal: spacing.mdl, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.md), gap: spacing.sm }}>{footer}</View>}
    </KeyboardFrame>
  );
}

/** "Don't have an account? Sign up" style switch line under a CTA. */
export function SwitchLink({ prompt, action, onPress }: { prompt: string; action: string; onPress: () => void }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.xs }}>
      <Text variant="body" tone="muted">
        {prompt}
      </Text>
      <PressableScale onPress={onPress} hitSlop={10} accessibilityRole="link">
        <Text variant="bodyStrong" tone="brand">
          {action}
        </Text>
      </PressableScale>
    </View>
  );
}
