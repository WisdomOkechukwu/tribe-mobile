import { useEffect, useId, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, Easing, makeMutable, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { radius, spacing, useColors } from "@/theme";
import { EmptyState } from "./bits";
import { Button } from "./button";
import { ListSection } from "./list";

/**
 * Loading placeholders shaped like the content they stand in for, so nothing jumps when data
 * arrives. They show only while a query is pending (see `@/api/queries`).
 */

// one sweep for every skeleton on screen, so the light passes across them together
const sweep = makeMutable(0);
let mounted = 0;
const SWEEP_MS = 1300;
/** the light band, as a share of the block's width (wide blocks get a proportionally wide band) */
const BAND = 0.6;

function useSweep(reduce: boolean) {
  useEffect(() => {
    if (reduce) return;
    if (mounted++ === 0) {
      sweep.set(0);
      sweep.set(withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) }), -1, false));
    }
    return () => {
      if (--mounted > 0) return;
      cancelAnimation(sweep);
      sweep.set(0);
    };
  }, [reduce]);
}

/** A block with a soft light sweeping across it (shimmer); Reduce Motion gets a still one. */
export function Skeleton({ width, height, radius: r = radius.xs, style }: { width: number | `${number}%`; height: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const reduce = useReducedMotion();
  useSweep(reduce);
  const w = useSharedValue(typeof width === "number" ? width : 0);
  // gradient ids must be unique per instance (web shares one SVG DOM)
  const gid = `shimmer-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const band = useAnimatedStyle(() => {
    const bw = Math.max(48, w.get() * BAND);
    return { width: bw, transform: [{ translateX: -bw + (w.get() + bw) * sweep.get() }] };
  });
  return (
    <View onLayout={(e) => w.set(e.nativeEvent.layout.width)} style={[{ width, height, borderRadius: r, backgroundColor: c.sunken, overflow: "hidden" }, style]}>
      {!reduce && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, bottom: 0, left: 0 }, band]}>
          <Svg width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={c.surface} stopOpacity={0} />
                <Stop offset="0.5" stopColor={c.surface} stopOpacity={0.9} />
                <Stop offset="1" stopColor={c.surface} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
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

/** Same footprint as BalanceHero: label · big number · the currency pill. */
export function BalanceHeroSkeleton() {
  return (
    <View accessible accessibilityLabel="Loading balance" style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm }}>
      <Skeleton width={110} height={16} />
      <View style={{ height: 52, justifyContent: "center" }}>
        <Skeleton width={210} height={40} radius={radius.input} />
      </View>
      <Skeleton width={76} height={27} radius={radius.full} />
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

/** Me › Devices: a phone icon, its name and when it was last seen. */
export function DeviceListSkeleton({ rows = 2, title }: { rows?: number; title?: string }) {
  return (
    <View accessible accessibilityLabel="Loading devices">
      <ListSection title={title}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingVertical: spacing.smd, paddingHorizontal: spacing.md, minHeight: 64 }}>
            <Skeleton width={38} height={38} radius={19} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Skeleton width={i === 0 ? "48%" : "58%"} height={14} />
              <Skeleton width="72%" height={10} />
            </View>
          </View>
        ))}
      </ListSection>
    </View>
  );
}

/** Card designer: the card, a row of finishes and a row of patterns. */
export function CardDesignsSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <View accessible accessibilityLabel="Loading designs" style={{ alignItems: "center", gap: spacing.lg }}>
      <CardFaceSkeleton width={cardWidth} />
      {[7, 5].map((n, row) => (
        <View key={row} style={{ alignSelf: "stretch", gap: spacing.sm }}>
          <Skeleton width={96} height={14} />
          <View style={{ flexDirection: "row", gap: spacing.smd }}>
            {Array.from({ length: n }, (_, i) => (
              <Skeleton key={i} width={row === 0 ? 44 : 64} height={44} radius={row === 0 ? 22 : radius.chip} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Biller logos in a row (bills): circle + name under it. */
export function BillerRowSkeleton({ count = 4, size = 52 }: { count?: number; size?: number }) {
  return (
    <View accessible accessibilityLabel="Loading providers" style={{ flexDirection: "row", gap: spacing.md }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ alignItems: "center", gap: spacing.xs }}>
          <Skeleton width={size} height={size} radius={size / 2} />
          <Skeleton width={size * 0.8} height={10} />
        </View>
      ))}
    </View>
  );
}

/** Gift-card faces in a grid (card aspect 1.6). */
export function BrandGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View accessible accessibilityLabel="Loading brands" style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.smd }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: "48%", aspectRatio: 1.6 }}>
          <Skeleton width="100%" height={200} radius={radius.chip} style={{ height: "100%" }} />
        </View>
      ))}
    </View>
  );
}

/** Saved recipients: avatars in a row with a name under each. */
export function BeneficiariesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View accessible accessibilityLabel="Loading beneficiaries" style={{ flexDirection: "row", gap: spacing.md }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ alignItems: "center", gap: spacing.xs, width: 64 }}>
          <Skeleton width={52} height={52} radius={26} />
          <Skeleton width={48} height={10} />
        </View>
      ))}
    </View>
  );
}

/** A query that failed: what happened and a retry. */
export function QueryError({ onRetry, title = "Couldn't load this", body = "Check your connection and try again." }: { onRetry: () => void; title?: string; body?: string }) {
  return <EmptyState icon="warning" title={title} body={body} action={<Button title="Try again" icon="refresh" variant="secondary" size="md" inline onPress={onRetry} />} />;
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
