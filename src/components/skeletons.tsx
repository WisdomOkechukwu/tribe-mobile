import { useEffect, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, makeMutable, useAnimatedStyle, useReducedMotion, withRepeat, withTiming } from "react-native-reanimated";
import { radius, spacing, useColors } from "@/theme";
import { EmptyState } from "./bits";
import { Button } from "./button";
import { ListSection } from "./list";

/**
 * Loading placeholders shaped like the content they stand in for, so nothing jumps when data
 * arrives. They show only while a query is pending (see `@/api/queries`); preview them with
 * `dev?action=latency&ms=1500`.
 */

// one pulse for every skeleton on screen, so they breathe in step (and only one animation runs)
const pulse = makeMutable(0.55);
let mounted = 0;

function usePulse(reduce: boolean) {
  useEffect(() => {
    if (reduce) return;
    if (mounted++ === 0) pulse.set(withRepeat(withTiming(1, { duration: 750 }), -1, true));
    return () => {
      if (--mounted > 0) return;
      cancelAnimation(pulse);
      pulse.set(0.55);
    };
  }, [reduce]);
}

/** A pulsing block; Reduce Motion gets a still one. */
export function Skeleton({ width, height, radius: r = radius.xs, style }: { width: number | `${number}%`; height: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const reduce = useReducedMotion();
  usePulse(reduce);
  const anim = useAnimatedStyle(() => ({ opacity: reduce ? 0.8 : pulse.get() }));
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: c.sunken }, anim, style]} />;
}

/** Stands in for a TransactionRow / AssetRow: circle · two lines · amount. */
export function SkeletonRow() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingVertical: spacing.smd, paddingHorizontal: spacing.md, minHeight: 64 }}>
      <View style={{ width: 56, alignItems: "center" }}>
        <Skeleton width={40} height={40} radius={20} />
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Skeleton width="62%" height={14} />
        <Skeleton width="40%" height={10} />
      </View>
      <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
        <Skeleton width={68} height={14} />
        <Skeleton width={44} height={10} />
      </View>
    </View>
  );
}

/** A ListSection of skeleton rows; pass the real `title` so the header doesn't jump. */
export function SkeletonList({ rows = 5, title, style }: { rows?: number; title?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessible accessibilityLabel="Loading" style={style}>
      <ListSection title={title} inset={spacing.md + 56 + spacing.smd}>
        {Array.from({ length: rows }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </ListSection>
    </View>
  );
}

/** Same footprint as BalanceHero: label · big number · the two pills. */
export function BalanceHeroSkeleton() {
  return (
    <View accessible accessibilityLabel="Loading balance" style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm }}>
      <Skeleton width={110} height={16} />
      <View style={{ height: 52, justifyContent: "center" }}>
        <Skeleton width={210} height={40} radius={radius.input} />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Skeleton width={76} height={27} radius={radius.full} />
        <Skeleton width={104} height={27} radius={radius.full} />
      </View>
    </View>
  );
}

/** A virtual card's outline at the card's aspect ratio. */
export function CardFaceSkeleton({ width }: { width: number }) {
  return <Skeleton width={width} height={Math.round(width / 1.586)} radius={Math.min(radius.card, width * 0.065)} />;
}

/** Square tiles in rows (vault tokens, shortcut grids). */
export function TileGridSkeleton({ count = 6, columns = 3, height = 96 }: { count?: number; columns?: number; height?: number }) {
  return (
    <View accessible accessibilityLabel="Loading" style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: `${100 / columns - 3}%` }}>
          <Skeleton width="100%" height={height} radius={radius.chip} />
        </View>
      ))}
    </View>
  );
}

/** A query that failed: what happened and a retry. */
export function QueryError({ onRetry, title = "Couldn't load this" }: { onRetry: () => void; title?: string }) {
  return <EmptyState icon="warning" title={title} body="Check your connection and try again." action={<Button title="Try again" icon="refresh" variant="secondary" size="md" inline onPress={onRetry} />} />;
}

/**
 * Renders a query's data, its skeleton while it first loads, or a retry if that load failed.
 * Data already shown stays up when a later refetch fails.
 */
export function Loaded<T>({ query, skeleton, children }: { query: { data: T | undefined; isError: boolean; refetch: () => unknown }; skeleton: ReactNode; children: (data: T) => ReactNode }) {
  if (query.data !== undefined) return children(query.data);
  if (query.isError) return <QueryError onRetry={() => query.refetch()} />;
  return skeleton;
}
