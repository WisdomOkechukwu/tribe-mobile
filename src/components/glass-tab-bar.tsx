import { BlurView } from "expo-blur";
import { useSegments } from "expo-router";
import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabTriggerSlotProps,
} from "expo-router/ui";
import { forwardRef, useEffect, useState } from "react";
import {
  Animated as RNAnimated,
  Platform,
  Pressable,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnreadCount } from "@/stores/use-inbox-store";
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
 * The bar shows on each tab's root screen and slides away on screens pushed inside a tab
 * (Me → Edit, Pay → Vault…), so footers and keypads are never covered.
 */
export function useTabBarHidden() {
  const segments = useSegments() as string[];
  return segments[0] === "(tabs)" && segments.length > 2;
}

type ButtonProps = TabTriggerSlotProps & {
  label: string;
  icon: TabIconName;
  badge?: boolean;
};

const TabButton = forwardRef<View, ButtonProps>(function TabButton(
  { isFocused, label, icon, badge, ...props },
  ref,
) {
  const { colors: c } = useTheme();
  const pill = useAnimatedStyle(
    () => ({
      opacity: withSpring(isFocused ? 1 : 0, motion.spring),
      transform: [{ scale: withSpring(isFocused ? 1 : 0.6, motion.spring) }],
    }),
    [isFocused],
  );
  return (
    <Pressable
      ref={ref}
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused }}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        height: GLASS_TAB_BAR_HEIGHT - 12,
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            inset: 0,
            borderRadius: radius.full,
            backgroundColor: c.brandSoft,
          },
          pill,
        ]}
      />
      <View>
        {/* idle = outline, selected = filled (punched out in the pill colour) */}
        <TabIcon
          name={icon}
          focused={!!isFocused}
          size={23}
          color={isFocused ? c.brandText : c.textMuted}
          cut={c.brandSoft}
        />
        {badge && (
          <View
            style={{
              position: "absolute",
              top: -2,
              right: -4,
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: c.accent,
              borderWidth: 1.5,
              borderColor: c.surface,
            }}
          />
        )}
      </View>
      <Text
        variant="caption"
        style={{
          fontSize: 10.5,
          lineHeight: 13,
          fontFamily: isFocused ? "Poppins_600SemiBold" : "Poppins_500Medium",
          color: isFocused ? c.brandText : c.textMuted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
});

/**
 * Floating "liquid glass" tab bar for platforms without native Liquid Glass (iOS < 26, Android,
 * web): a frosted capsule hovering over content. iOS 26+ uses the real thing via NativeTabs.
 */
export function GlassTabs() {
  const { scheme, colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const unread = useUnreadCount();
  const hidden = useTabBarHidden();
  // RN Animated (not Reanimated): TabList's Slot only accepts a single style object.
  const [shown] = useState(() => new RNAnimated.Value(1));
  useEffect(() => {
    RNAnimated.timing(shown, {
      toValue: hidden ? 0 : 1,
      duration: 240,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [hidden, shown]);
  const glassFill =
    scheme === "dark" ? "rgba(28,20,38,0.72)" : "rgba(255,255,255,0.72)";
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      {/* TabTriggers must be direct children of TabList's child — expo-router/ui parses one level. */}
      <TabList asChild>
        <RNAnimated.View
          pointerEvents={hidden ? "none" : "auto"}
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
            borderColor:
              scheme === "dark"
                ? "rgba(255,255,255,0.10)"
                : "rgba(255,255,255,0.9)",
            boxShadow:
              scheme === "dark"
                ? "0 18px 40px -12px rgba(0,0,0,0.7)"
                : "0 18px 40px -14px rgba(44,5,72,0.35), 0 2px 6px rgba(44,5,72,0.06)",
            backgroundColor: Platform.OS === "ios" ? "transparent" : glassFill,
            // web: real backdrop blur
            ...(Platform.OS === "web"
              ? ({ backdropFilter: "blur(24px) saturate(180%)" } as object)
              : null),
            opacity: shown,
            transform: [
              {
                translateY: shown.interpolate({
                  inputRange: [0, 1],
                  outputRange: [GLASS_TAB_BAR_HEIGHT + 60, 0],
                }),
              },
            ],
          }}
        >
          {Platform.OS === "ios" && (
            <BlurView
              tint={
                scheme === "dark"
                  ? "systemChromeMaterialDark"
                  : "systemChromeMaterialLight"
              }
              intensity={80}
              style={{ position: "absolute", inset: 0 }}
            />
          )}
          {Platform.OS === "ios" && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor:
                  scheme === "dark"
                    ? "rgba(21,16,29,0.35)"
                    : "rgba(255,255,255,0.35)",
              }}
            />
          )}
          {TABS.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
              <TabButton
                label={t.label}
                icon={t.icon}
                badge={t.name === "(home)" && unread > 0}
              />
            </TabTrigger>
          ))}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 24,
              right: 24,
              height: 1,
              backgroundColor: c.surface,
              opacity: scheme === "dark" ? 0.15 : 0.9,
            }}
          />
        </RNAnimated.View>
      </TabList>
    </Tabs>
  );
}
