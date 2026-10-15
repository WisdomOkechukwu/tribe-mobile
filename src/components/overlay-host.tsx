import * as Haptics from "expo-haptics";
import { useEffect, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import { scheduleOnRN } from "react-native-worklets";
import { useOverlayStore, type Overlay } from "@/stores/use-overlay-store";
import { radius, spacing, useColors, type ThemeColors } from "@/theme";
import { Button } from "./button";
import { Icon } from "./icon";
import { Text } from "./text";

const OUT = { duration: 160, easing: Easing.in(Easing.quad) };

/**
 * JS-side callback to run once the current overlay has animated out (navigate, open the next
 * overlay…). Module-level because only one overlay exists at a time, and so it's never shipped
 * through the UI thread.
 */
let pendingAfter: (() => void) | undefined;
function settle(close: () => void) {
  close();
  const after = pendingAfter;
  pendingAfter = undefined;
  if (after) requestAnimationFrame(after);
}

function toneColors(c: ThemeColors, tone?: string) {
  if (tone === "danger") return { bg: c.dangerSoft, fg: c.danger };
  if (tone === "success") return { bg: c.successSoft, fg: c.success };
  if (tone === "accent") return { bg: c.accentSoft, fg: c.accentText };
  return { bg: c.brandSoft, fg: c.brandText };
}

/** Slide-up sheet: backdrop tap or drag the handle down to close. */
function BottomSheet({ title, subtitle, leading, children }: { title?: string; subtitle?: string; leading?: ReactNode; children: (close: (after?: () => void) => void) => ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const close = useOverlayStore((s) => s.close);
  const y = useSharedValue(height);
  const fade = useSharedValue(0);

  useEffect(() => {
    y.set(withSpring(0, { damping: 22, stiffness: 220, mass: 0.8 }));
    fade.set(withTiming(1, { duration: 220 }));
  }, [y, fade]);

  const finish = () => settle(close);
  const dismiss = (after?: () => void) => {
    pendingAfter = after;
    fade.set(withTiming(0, OUT));
    y.set(withTiming(height, OUT, () => scheduleOnRN(finish)));
  };

  const drag = Gesture.Pan()
    .onUpdate((e) => {
      y.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) {
        fade.set(withTiming(0, OUT));
        y.set(withTiming(height, OUT, () => scheduleOnRN(finish)));
      } else y.set(withSpring(0, { damping: 22, stiffness: 260 }));
    });

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const backdrop = useAnimatedStyle(() => ({ opacity: fade.get() }));

  return (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Animated.View style={[{ position: "absolute", inset: 0, backgroundColor: c.overlay }, backdrop]}>
        <Pressable style={{ flex: 1 }} onPress={() => dismiss()} accessibilityLabel="Close" accessibilityRole="button" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[{ backgroundColor: c.bg, borderTopLeftRadius: radius.panel, borderTopRightRadius: radius.panel, borderCurve: "continuous", maxHeight: height * 0.86, paddingBottom: Math.max(insets.bottom, spacing.md) }, sheet]}
      >
        <GestureDetector gesture={drag}>
          <View style={{ paddingTop: spacing.sm, paddingHorizontal: spacing.mdl, paddingBottom: spacing.md, gap: spacing.xs }}>
            <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: c.borderStrong, marginBottom: spacing.md }} />
            {title && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
                {leading}
                <View style={{ flex: 1, gap: spacing.xxs }}>
                  <Text variant="title">{title}</Text>
                  {subtitle && (
                    <Text variant="subhead" tone="muted">
                      {subtitle}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => dismiss()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 16, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
                  <Icon name="close" size={13} color={c.textMuted} weight="bold" />
                </Pressable>
              </View>
            )}
          </View>
        </GestureDetector>
        {children(dismiss)}
      </Animated.View>
    </View>
  );
}

function SelectList({ o, close }: { o: Extract<Overlay, { kind: "select" }>; close: (after?: () => void) => void }) {
  const c = useColors();
  return (
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.sm }} bounces={false}>
      <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", overflow: "hidden" }}>
        {o.options.map((opt, i) => {
          const on = opt.value === o.value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                close(() => o.onSelect(opt.value));
              }}
            >
              {({ pressed }) => (
                <View>
                  {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: opt.leading ? 66 : spacing.md }} />}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, minHeight: 58, paddingVertical: spacing.sm, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
                    {opt.leading}
                    <View style={{ flex: 1, gap: spacing.xxs }}>
                      <Text variant="bodyStrong" style={opt.destructive ? { color: c.danger } : undefined}>
                        {opt.label}
                      </Text>
                      {opt.sub && (
                        <Text variant="caption" tone="muted">
                          {opt.sub}
                        </Text>
                      )}
                    </View>
                    {opt.trailing && (
                      <Text variant="subhead" tone="muted">
                        {opt.trailing}
                      </Text>
                    )}
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 0 : 1.5, borderColor: c.borderStrong, backgroundColor: on ? c.brand : "transparent", alignItems: "center", justifyContent: "center" }}>
                      {on && <Icon name="check" size={11} color={c.onBrand} weight="bold" />}
                    </View>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

/** Action menu (⋯): tap a row to close the sheet and run it. Destructive rows are red. */
function MenuList({ o, close }: { o: Extract<Overlay, { kind: "menu" }>; close: (after?: () => void) => void }) {
  const c = useColors();
  return (
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.sm }} bounces={false}>
      <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", overflow: "hidden" }}>
        {o.items.map((item, i) => (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityLabel={item.sub ? `${item.label}. ${item.sub}` : item.label}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              close(() => o.onSelect(item.value));
            }}
          >
            {({ pressed }) => (
              <View>
                {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: 66 }} />}
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, minHeight: 60, paddingVertical: spacing.sm, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: item.destructive ? c.dangerSoft : c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                    <Icon name={item.icon} size={17} color={item.destructive ? c.danger : c.text} />
                  </View>
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <Text variant="bodyStrong" style={item.destructive ? { color: c.danger } : undefined}>
                      {item.label}
                    </Text>
                    {item.sub && (
                      <Text variant="caption" tone="muted">
                        {item.sub}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

/** Centred card for confirmations and success notices (scale + fade). */
function Dialog({ o }: { o: Extract<Overlay, { kind: "confirm" | "notice" }> }) {
  const c = useColors();
  const close = useOverlayStore((s) => s.close);
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withSpring(1, { damping: 18, stiffness: 260 }));
    if (o.kind === "notice") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [v, o.kind]);
  const card = useAnimatedStyle(() => ({ opacity: Math.min(1, v.get()), transform: [{ scale: 0.92 + 0.08 * v.get() }] }));
  const back = useAnimatedStyle(() => ({ opacity: Math.min(1, v.get()) }));
  const finish = () => settle(close);
  const leave = (after?: () => void) => {
    pendingAfter = after;
    v.set(withTiming(0, { duration: 160 }, () => scheduleOnRN(finish)));
  };
  const tone = toneColors(c, o.tone ?? (o.kind === "confirm" && o.destructive ? "danger" : o.kind === "notice" ? "success" : "brand"));
  const actions =
    o.kind === "confirm"
      ? [
          { label: o.cancelLabel ?? "Cancel", tone: "secondary" as const, onPress: undefined },
          { label: o.confirmLabel, tone: o.destructive ? ("destructive" as const) : ("primary" as const), onPress: o.onConfirm },
        ]
      : (o.actions ?? [{ label: "Done", tone: "primary" as const }]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg }}>
      <Animated.View style={[{ position: "absolute", inset: 0, backgroundColor: c.overlay }, back]}>
        <Pressable style={{ flex: 1 }} onPress={() => o.kind === "notice" && leave()} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View accessibilityViewIsModal style={[{ width: "100%", maxWidth: 360, backgroundColor: c.bg, borderRadius: radius.panel, borderCurve: "continuous", padding: spacing.lg, gap: spacing.md, alignItems: "center" }, card]}>
        {o.icon && (
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: tone.bg, alignItems: "center", justifyContent: "center" }}>
            <Icon name={o.icon} size={28} color={tone.fg} />
          </View>
        )}
        <View style={{ gap: spacing.xs, alignItems: "center" }}>
          <Text variant="title" align="center">
            {o.title}
          </Text>
          {o.body && (
            <Text variant="body" tone="muted" align="center">
              {o.body}
            </Text>
          )}
        </View>
        <View style={{ alignSelf: "stretch", gap: spacing.sm, flexDirection: o.kind === "confirm" ? "row" : "column", marginTop: spacing.xs }}>
          {actions.map((a) => (
            <Button
              key={a.label}
              title={a.label}
              size="md"
              variant={a.tone === "destructive" ? "danger" : a.tone === "secondary" ? "secondary" : "primary"}
              style={o.kind === "confirm" ? { flex: 1 } : undefined}
              onPress={() => leave(a.onPress)}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

/** Mounted once in the root layout. On iOS it lives in a FullWindowOverlay (above native modals). */
export function OverlayHost() {
  const o = useOverlayStore((s) => s.current);
  if (!o) return null;
  const body =
    o.kind === "select" ? (
      <BottomSheet key={o.id} title={o.title} subtitle={o.subtitle}>
        {(close) => <SelectList o={o} close={close} />}
      </BottomSheet>
    ) : o.kind === "menu" ? (
      <BottomSheet key={o.id} title={o.title} subtitle={o.subtitle} leading={o.leading}>
        {(close) => <MenuList o={o} close={close} />}
      </BottomSheet>
    ) : o.kind === "sheet" ? (
      <BottomSheet key={o.id} title={o.title} subtitle={o.subtitle} leading={o.leading}>
        {(close) => o.content(close)}
      </BottomSheet>
    ) : (
      <Dialog key={o.id} o={o} />
    );
  const layer = <GestureHandlerRootView style={{ position: "absolute", inset: 0, zIndex: 900 }}>{body}</GestureHandlerRootView>;
  return Platform.OS === "ios" ? <FullWindowOverlay>{layer}</FullWindowOverlay> : layer;
}
