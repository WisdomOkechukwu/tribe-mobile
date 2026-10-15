import * as Haptics from "expo-haptics";
import { useEffect, useState, type ReactNode } from "react";
import { useWindowDimensions, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const SPRING = { damping: 26, stiffness: 240, mass: 0.9, overshootClamping: true };

/**
 * A carousel of tab pages (Fiat | Crypto, History's categories): every tab is a page laid side by
 * side; dragging moves the real neighbour into view under your finger, and letting go snaps to
 * a page with a spring (a flick is enough). Tapping a tab elsewhere slides there the same way.
 * Only the current page and its neighbours are mounted. Horizontal-only, so pages still scroll.
 *
 * `fill`: pages fill the height (each page scrolls itself, e.g. a list). Otherwise the pager sits
 * inside a scroll view and is as tall as its tallest mounted page.
 * `bleed`: the parent's side padding, so pages slide edge to edge.
 */
export function SwipePager<T>({ options, value, onChange, renderPage, fill = false, bleed = 0 }: { options: readonly T[]; value: T; onChange: (v: T) => void; renderPage: (o: T) => ReactNode; fill?: boolean; bleed?: number }) {
  const { width: screen } = useWindowDimensions();
  const reduce = useReducedMotion();
  const [w, setW] = useState(screen);
  const index = Math.max(0, options.indexOf(value));
  const n = options.length;
  const x = useSharedValue(-index * w);

  // the tab changed (a swipe settled, or a tap on the segmented control / chips): slide there
  useEffect(() => {
    if (reduce) x.set(withTiming(-index * w, { duration: 0 }));
    else x.set(withSpring(-index * w, SPRING));
  }, [index, w, reduce, x]);

  const go = (target: number) => {
    if (target === index || target < 0 || target >= n) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(options[target]);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      // past the first or last page it resists, like the end of a carousel
      const edge = (index === 0 && e.translationX > 0) || (index === n - 1 && e.translationX < 0);
      x.set(-index * w + e.translationX * (edge ? 0.25 : 1));
    })
    .onEnd((e) => {
      const dir = e.translationX < 0 ? 1 : -1;
      const far = Math.abs(e.translationX) > w * 0.25 || Math.abs(e.velocityX) > 500;
      const target = Math.min(n - 1, Math.max(0, far ? index + dir : index));
      x.set(withSpring(-target * w, { ...SPRING, velocity: e.velocityX }));
      if (target !== index) scheduleOnRN(go, target);
    });

  const track = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={[{ overflow: "hidden", marginHorizontal: -bleed }, fill ? { flex: 1 } : null]}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ flexDirection: "row", width: w * n, alignItems: fill ? "stretch" : "flex-start" }, fill ? { flex: 1 } : null, track]}>
          {options.map((o, i) => (
            <View key={String(o)} style={[{ width: w, paddingHorizontal: bleed }, fill ? { flex: 1 } : null]}>
              {Math.abs(i - index) <= 1 ? renderPage(o) : null}
            </View>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
