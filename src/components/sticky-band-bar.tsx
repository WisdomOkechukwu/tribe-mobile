import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, spacing } from "@/theme";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";

/** Height of the bar's row (the back button), below the status bar. */
export const BAR_ROW = 40;

/** Scroll position for a purple-band screen, fed to StickyBandBar. Spread `onScroll` onto an Animated.ScrollView. */
export function useBandScroll() {
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  return { y, onScroll };
}

/**
 * The back button (or the Tribe mark, when there's no back) and an optional right-hand action,
 * pinned to the top of a purple-band screen.
 * It floats over the band at rest; as soon as the page scrolls the bar fills in with the band
 * colour, so whatever scrolls up passes under it and never shows behind the button. The band itself keeps a
 * BAR_ROW-high gap where the button would have been.
 */
export function StickyBandBar({ y, onBack, leading, right, color = palette.purple[900] }: { y: SharedValue<number>; onBack?: () => void; /** shown instead of the back button (e.g. the Tribe mark) */ leading?: ReactNode; right?: ReactNode; color?: string }) {
  const insets = useSafeAreaInsets();
  // solid within the first few points of scroll: band text then slides under the bar, never behind the button
  const fill = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 16], [0, 1], "clamp") }));
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top + spacing.sm, paddingBottom: spacing.sm, paddingHorizontal: spacing.mdl }}>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color }, fill]} />
      <View pointerEvents="box-none" style={{ flexDirection: "row", alignItems: "center", minHeight: BAR_ROW }}>
        {!onBack && leading}
        {onBack && (
          <PressableScale accessibilityLabel="Back" onPress={onBack} hitSlop={6} style={{ width: BAR_ROW, height: BAR_ROW, borderRadius: BAR_ROW / 2, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="back" size={17} color={palette.white} />
          </PressableScale>
        )}
        <View style={{ flex: 1 }} />
        {right}
      </View>
    </View>
  );
}
