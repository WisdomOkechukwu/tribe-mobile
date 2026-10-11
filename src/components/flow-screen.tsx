import { router, Stack } from "expo-router";
import type { ReactNode } from "react";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useColors } from "@/theme";
import { Icon } from "./icon";
import { KeyboardFrame } from "./keyboard-frame";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/**
 * Layout for every modal flow (send, swap, bills, gift cards, cashpoints, cards…): a NATIVE
 * stack header (Cancel · title · optional step), scrolling content and a sticky CTA.
 * First screen of a flow: `cancel="close"` (Cancel closes the whole modal — back() bubbles up
 * from the flow's stack). Later steps: `cancel="back"` keeps the native back chevron.
 */
export function FlowScreen({
  title,
  step,
  children,
  footer,
  scroll = true,
  cancel = "close",
  headerRight,
  padded = true,
}: {
  title: string;
  /** e.g. "Step 1 of 3" — shown under the title */
  step?: string;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  /** close = "Cancel" on the left · x = round ✕ on the right (standalone modals) · back = native chevron */
  cancel?: "close" | "x" | "back" | "none";
  headerRight?: () => ReactNode;
  padded?: boolean;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const pad = padded ? { paddingHorizontal: spacing.mdl } : null;
  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerShown: true,
          headerTitle: step
            ? () => (
                <View style={{ alignItems: "center" }}>
                  <Text variant="bodyStrong">{title}</Text>
                  <Text variant="caption" tone="muted" style={{ marginTop: -2 }}>
                    {step}
                  </Text>
                </View>
              )
            : undefined,
          headerLeft:
            cancel === "close"
              ? () => (
                  <PressableScale onPress={() => router.back()} hitSlop={12} accessibilityLabel="Cancel" style={Platform.OS === "web" ? { paddingHorizontal: spacing.md } : undefined}>
                    <Text variant="body" tone="brand">
                      Cancel
                    </Text>
                  </PressableScale>
                )
              : cancel === "none" || cancel === "x"
                ? () => null
                : undefined,
          headerBackVisible: cancel === "back",
          gestureEnabled: cancel !== "none",
          // the ✕ lives in the native header bar, where touches always land (not in a sheet's drag zone)
          headerRight:
            headerRight ??
            (cancel === "x"
              ? () => (
                  <PressableScale onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center", marginRight: Platform.OS === "web" ? spacing.md : 0 }}>
                    <Icon name="close" size={13} color={c.textMuted} weight="bold" />
                  </PressableScale>
                )
              : undefined),
        }}
      />
      <KeyboardFrame backgroundColor={c.bg}>
        {scroll ? (
          <ScrollView
            contentInsetAdjustmentBehavior="never"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={[{ paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg }, pad]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1, paddingTop: spacing.md, gap: spacing.lg }, pad]}>{children}</View>
        )}
        {footer && <View style={{ paddingHorizontal: spacing.mdl, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.md), gap: spacing.sm, backgroundColor: c.bg }}>{footer}</View>}
      </KeyboardFrame>
    </>
  );
}
