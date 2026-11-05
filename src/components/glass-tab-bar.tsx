import { BlurView } from "expo-blur";
import { Tabs, useSegments } from "expo-router";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useLayoutEffect, useState } from "react";
import {
  Animated as RNAnimated,
  Platform,
  Pressable,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarStore } from "@/stores/use-tab-bar-store";
import { motion, radius, spacing, useTheme } from "@/theme";
import { TabIcon, type TabIconName } from "./tab-icons";
import { Text } from "./text";

export const TABS = [
  { name: "(home)", href: "/", label: "Home", icon: "home" },
  { name: "wallet", href: "/wallet", label: "Wallet", icon: "wallet" },
  { name: "pay", href: "/pay", label: "Pay", icon: "pay" },
  { name: "cards", href: "/cards", label: "Cards", icon: "card" },
  { name: "me", href: "/me", label: "Me", icon: "me" },
] as const satisfies readonly {
  name: string;
  href: string;
  label: string;
  icon: TabIconName;
}[];

/** Height of the floating bar (without the home-indicator inset) — screens pad by this. */
export const GLASS_TAB_BAR_HEIGHT = 64;

/**
 * The bar shows only on the five tab roots (Home, Wallet, Pay, Cards, Me) and is gone on every
 * screen pushed inside a tab (Me → Edit, Pay → Vault…), so footers and keypads are never covered.
 * A root modal or screen on top of the tabs (a receipt, Send, Swap…) doesn't change which tab
 * page sits underneath, so the last answer is kept: recomputing there brought the bar back under
 * the modal on a pushed page, and it flashed away again when the modal closed.
 *
 * Mounted once (root layout) as a leaf: it alone re-renders on navigation and writes the answer
 * to `useTabBarStore`; the tab bar re-renders only when that boolean flips.
 */
export function TabBarDriver() {
  const segments = useSegments() as string[];
  const inTabs = segments[0] === "(tabs)";
  const live = inTabs && segments.length > 2;
  const setHidden = useTabBarStore((s) => s.setHidden);
  useLayoutEffect(() => {
    if (inTabs) setHidden(live);
  }, [inTabs, live, setHidden]);
  return null;
}

export const useTabBarHidden = () => useTabBarStore((s) => s.hidden);

type ButtonProps = { focused: boolean; label: string; icon: TabIconName; onPress: () => void; onLongPress: () => void };

function TabButton({ focused, label, icon, onPress, onLongPress }: ButtonProps) {
  const { colors: c } = useTheme();
  const pill = useAnimatedStyle(
    () => ({
      opacity: withSpring(focused ? 1 : 0, motion.spring),
      transform: [{ scale: withSpring(focused ? 1 : 0.6, motion.spring) }],
    }),
    [focused],
  );
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2, height: GLASS_TAB_BAR_HEIGHT - 12 }}
    >
      <Animated.View style={[{ position: "absolute", inset: 0, borderRadius: radius.full, backgroundColor: c.brandSoft }, pill]} />
      {/* idle = outline, selected = filled (punched out in the pill colour) */}
      <TabIcon name={icon} focused={focused} size={23} color={focused ? c.brandText : c.textMuted} cut={c.brandSoft} />
      <Text variant="caption" style={{ fontSize: 10.5, lineHeight: 13, fontFamily: focused ? "Poppins_600SemiBold" : "Poppins_500Medium", color: focused ? c.brandText : c.textMuted }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The floating frosted capsule itself — the navigator's custom `tabBar`. */
function GlassBar({ state, navigation }: BottomTabBarProps) {
  const { scheme, colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const hidden = useTabBarHidden();
  // RN Animated: starts where the route says (a deep link to a pushed page never shows it first)
  const [shown] = useState(() => new RNAnimated.Value(hidden ? 0 : 1));
  useLayoutEffect(() => {
    if (hidden) {
      // gone at once: sliding it away over the incoming screen showed it there for a moment
      shown.stopAnimation();
      shown.setValue(0);
      return;
    }
    RNAnimated.timing(shown, { toValue: 1, duration: 240, useNativeDriver: Platform.OS !== "web" }).start();
  }, [hidden, shown]);
  const glassFill = scheme === "dark" ? "rgba(28,20,38,0.72)" : "rgba(255,255,255,0.72)";

  return (
    <RNAnimated.View
      pointerEvents={hidden ? "none" : "box-none"}
      style={{
        position: "absolute",
        left: spacing.md,
        right: spacing.md,
        bottom: Math.max(insets.bottom - 6, spacing.smd),
        height: GLASS_TAB_BAR_HEIGHT,
        borderRadius: radius.full,
        overflow: "hidden",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
        borderWidth: 1,
        borderColor: scheme === "dark" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.9)",
        boxShadow: scheme === "dark" ? "0 18px 40px -12px rgba(0,0,0,0.7)" : "0 18px 40px -14px rgba(44,5,72,0.35), 0 2px 6px rgba(44,5,72,0.06)",
        backgroundColor: Platform.OS === "ios" ? "transparent" : glassFill,
        // web: real backdrop blur
        ...(Platform.OS === "web" ? ({ backdropFilter: "blur(24px) saturate(180%)" } as object) : null),
        opacity: shown,
        transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [GLASS_TAB_BAR_HEIGHT + 60, 0] }) }],
      }}
    >
      {Platform.OS === "ios" && <BlurView tint={scheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} intensity={80} style={{ position: "absolute", inset: 0 }} />}
      {Platform.OS === "ios" && <View pointerEvents="none" style={{ position: "absolute", inset: 0, backgroundColor: scheme === "dark" ? "rgba(21,16,29,0.35)" : "rgba(255,255,255,0.35)" }} />}
      {TABS.map((t) => {
        const route = state.routes.find((r) => r.name === t.name);
        if (!route) return null;
        const focused = state.routes[state.index]?.key === route.key;
        return (
          <TabButton
            key={t.name}
            label={t.label}
            icon={t.icon}
            focused={focused}
            onPress={() => {
              const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              // on the focused tab, the stack inside pops to its root (React Navigation's tabPress)
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
          />
        );
      })}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1, backgroundColor: c.surface, opacity: scheme === "dark" ? 0.15 : 0.9 }} />
    </RNAnimated.View>
  );
}

/**
 * Floating "liquid glass" tab bar for platforms without native Liquid Glass (iOS < 26, Android,
 * web): a frosted capsule hovering over content, as the custom bar of Expo Router's tab
 * navigator. (It used to be built on expo-router/ui's Tabs, which re-resolved every tab's link on
 * every navigation — ~15-20 ms before any new screen could render.) Tabs load lazily on first
 * visit and are never frozen: on Fabric a frozen tab loses its native views and comes back black.
 * iOS 26+ uses the real thing via NativeTabs.
 */
export function GlassTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false, lazy: true }} tabBar={(props) => <GlassBar {...props} />}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} />
      ))}
    </Tabs>
  );
}
