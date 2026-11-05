import { router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { Icon, type IconName } from "@/components/icon";
import { KeyboardFrame } from "@/components/keyboard-frame";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { Stripes } from "@/components/stripes";
import { MarkDisc } from "@/screens/auth/shell";
import { palette, radius, spacing, useColors } from "@/theme";

const BAND = palette.purple[900];
const OVERLAP = spacing.lg;

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

/** Finish setup, in four stages (phone, PIN, identity, global accounts); the meter follows the route. */
const STAGES: { label: string; routes: string[] }[] = [
  { label: "Phone", routes: ["/setup/phone", "/setup/otp", "/setup/phone-done"] },
  { label: "Payment PIN", routes: ["/setup/pin-intro", "/setup/create-pin", "/setup/pin-done", "/setup/biometrics"] },
  { label: "Identity", routes: ["/setup/bvn", "/setup/bvn-done"] },
  { label: "Global accounts", routes: ["/setup/profile"] },
];

/** Five thin segments: done in orange, the current one wider, the rest faint. */
function StageMeter({ at, onBand = true }: { at: number; onBand?: boolean }) {
  const c = useColors();
  const [current, rest] = onBand ? [palette.white, "rgba(255,255,255,0.22)"] : [c.brand, c.border];
  return (
    <View style={{ flexDirection: "row", gap: spacing.xs }} accessible accessibilityLabel={`Setup step ${at + 1} of ${STAGES.length}: ${STAGES[at].label}`}>
      {STAGES.map((st, i) => (
        <View key={st.label} style={{ width: i === at ? 26 : 14, height: 4, borderRadius: radius.full, backgroundColor: i < at ? palette.orange[400] : i === at ? current : rest }} />
      ))}
    </View>
  );
}

/** "Create a transaction PIN" → ["Create a transaction", "PIN"]: the last word becomes the orange line. */
function splitHeadline(title: string) {
  const words = title.trim().split(/\s+/);
  if (words.length < 2) return [title];
  return [words.slice(0, -1).join(" "), words[words.length - 1]];
}

/** A die-cut sticker for the step's icon: orange disc, thick white edge, a little tilt. */
function StepSticker({ icon }: { icon: IconName }) {
  return (
    <Animated.View entering={ZoomIn.delay(160).springify().damping(10)}>
      <View style={{ transform: [{ rotate: "10deg" }], width: 58, height: 58, borderRadius: 29, backgroundColor: palette.orange[500], borderWidth: 3, borderColor: palette.white, alignItems: "center", justifyContent: "center", boxShadow: "0 10px 20px -10px rgba(0,0,0,0.6)" }}>
        <Icon name={icon} size={24} color={palette.white} />
      </View>
    </Animated.View>
  );
}

/**
 * Frame for every post-signup setup step, in the same language as sign-up (AuthShell): a
 * purple-900 band with the logo's stripes, a stage meter for the whole journey (world → verify
 * → PINs → lock → first money), a loud caps headline whose last line is orange, the step's icon
 * as a tilted sticker, and the content on a sheet rising over the band.
 */
export function OnboardingShell({
  title,
  headline,
  subtitle,
  icon,
  children,
  footer,
  scroll = true,
  onBack,
  back = true,
  right,
  stripes = true,
  kicker,
}: {
  title: string;
  /** explicit poster lines (the last one orange); defaults to the title with its last word orange */
  headline?: string[];
  subtitle?: string;
  icon?: IconName;
  /** kept for older callers; the sticker is always brand orange now */
  iconTone?: "brand" | "success" | "accent";
  children?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  onBack?: () => void;
  back?: boolean;
  /** white-on-purple action in the band's top right (e.g. Skip) */
  right?: ReactNode;
  /** false when the content already carries the stripes motif (one per screen) */
  stripes?: boolean;
  /** overline when the screen isn't a setup step */
  kicker?: string;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const compact = useWindowDimensions().height < 780;
  const pathname = usePathname();
  // -1 outside setup (e.g. a skipped step finished later from Home): no meter then
  const stage = STAGES.findIndex((st) => st.routes.includes(pathname));
  const lines = headline ?? splitHeadline(title);
  const size = compact ? 26 : 30;

  const band = (
    <View style={{ backgroundColor: BAND, overflow: "hidden", paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.mdl, paddingBottom: OVERLAP + spacing.md, gap: compact ? spacing.md : spacing.lg }}>
      {stripes && (
        <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "30%", overflow: "hidden" }}>
          <Stripes band={12} gap={16} colors={[palette.orange[500], palette.purple[500]]} opacity={0.9} />
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, minHeight: 40 }}>
        {back ? (
          <PressableScale accessibilityLabel="Back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : null))} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="back" size={17} color={palette.white} />
          </PressableScale>
        ) : (
          <MarkDisc />
        )}
        {stage >= 0 && <StageMeter at={stage} />}
        <View style={{ flex: 1 }} />
        {right}
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.md }}>
        <Animated.View entering={FadeInDown.duration(360)} style={{ flex: 1, gap: spacing.sm }}>
          <Text variant="overline" style={{ color: palette.orange[300] }}>
            {stage >= 0 ? `Finish setup · ${STAGES[stage].label}` : (kicker ?? "Welcome to Tribe")}
          </Text>
          <Text variant="poster" accessibilityRole="header" maxFontSizeMultiplier={1.2} style={{ color: palette.white, fontSize: size, lineHeight: size + 2 }}>
            {lines.map((line, i) => (
              <Text key={line} variant="poster" style={{ fontSize: size, lineHeight: size + 2, color: i === lines.length - 1 ? palette.orange[400] : palette.white }}>
                {i > 0 ? "\n" : ""}
                {line}
              </Text>
            ))}
          </Text>
        </Animated.View>
        {icon && <StepSticker icon={icon} />}
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
        <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" contentContainerStyle={{ flexGrow: 1 }}>
          {/* pull-down bounce shows purple, not a light gap above the band */}
          <View style={{ position: "absolute", top: -1000, left: 0, right: 0, height: 1000, backgroundColor: BAND }} />
          {band}
          {sheet}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {band}
          {sheet}
        </View>
      )}
      {footer && <View style={{ backgroundColor: c.bg, paddingHorizontal: spacing.mdl, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.md), gap: spacing.sm }}>{footer}</View>}
    </KeyboardFrame>
  );
}

/** "Phone number added successfully." style interstitial: big badge, one message, one button. */
/** `art` replaces the icon badge with a custom illustration (e.g. `PhoneVerifiedArt`). */
export function StatusScreen({ icon, art, title, body, cta, onPress, tone = "success" }: { icon?: IconName; art?: ReactNode; title: string; body?: string; cta: string; onPress: () => void; tone?: "brand" | "success" }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const stage = STAGES.findIndex((st) => st.routes.includes(pathname));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.md), paddingHorizontal: spacing.mdl }}>
      {/* where this sits in setup: the same meter as the steps around it */}
      {stage >= 0 && (
        <View style={{ alignItems: "center", gap: spacing.sm, paddingTop: spacing.md }}>
          <StageMeter at={stage} onBand={false} />
          <Text variant="overline" tone="brand">
            Finish setup · {STAGES[stage].label} · done
          </Text>
        </View>
      )}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md }}>
        {art ?? (icon && <IconBadge icon={icon} tone={tone} size={96} />)}
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

/** Why this step matters, as short perk rows: a tinted icon chip, a bold line, a quiet line. */
export function Perks({ items }: { items: { icon: IconName; title: string; body: string }[] }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", paddingVertical: spacing.xs }}>
      {items.map((p, i) => (
        <View key={p.title}>
          {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: spacing.md + 40 + spacing.smd }} />}
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, paddingVertical: spacing.smd }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: i === 0 ? c.accentSoft : c.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name={p.icon} size={17} color={i === 0 ? c.accentText : c.brandText} />
            </View>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="bodyStrong">{p.title}</Text>
              <Text variant="caption" tone="muted">
                {p.body}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/** The step's illustration, centred, with a little room around it. */
export function Hero({ children }: { children: ReactNode }) {
  return <View style={{ alignItems: "center", marginTop: -spacing.sm, marginBottom: -spacing.sm }}>{children}</View>;
}

/** "Skip" in the band's top right (white on purple): for steps that can wait. */
export function BandSkip({ onPress, label = "Skip" }: { onPress: () => void; label?: string }) {
  return (
    <PressableScale onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel={`${label}, do this later`} style={{ backgroundColor: "rgba(255,255,255,0.14)", borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs }}>
      <Text variant="subhead" style={{ color: palette.white }}>
        {label}
      </Text>
    </PressableScale>
  );
}
