import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useDevices } from "@/api/queries";
import type { Device } from "@/api/mappers";
import { Pill } from "@/components/bits";
import { Icon } from "@/components/icon";
import { ListSection } from "@/components/list";
import { ANDROID_GREEN, PlatformLogo } from "@/components/platform-logo";
import { Screen } from "@/components/screen";
import { DeviceListSkeleton, QueryError, Skeleton } from "@/components/skeletons";
import { Stripes } from "@/components/stripes";
import { Text } from "@/components/text";
import { fonts, palette, radius, spacing, useColors } from "@/theme";
import { relativeDate } from "@/utils/format";

const OS: Record<string, string> = { ios: "iOS", android: "Android", web: "Web" };

/** "2h ago", "just now", "8 Oct", lower-cased so it reads mid-sentence. */
const when = (iso: string) => {
  const r = relativeDate(iso);
  return /^\d/.test(r) ? r : r[0].toLowerCase() + r.slice(1);
};

/** Green dot with a ring that breathes out from it (still with Reduce Motion). */
function LiveDot() {
  const reduce = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!reduce) pulse.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
  }, [reduce, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 1.6 }] }));
  return (
    <View style={{ width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: ANDROID_GREEN }, ring]} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ANDROID_GREEN }} />
    </View>
  );
}

/** The phone you're holding: the brand card with its OS logo big on a tile, and the live dot. */
function ThisPhone({ d }: { d: Device }) {
  const os = OS[d.platform];
  return (
    <View style={{ backgroundColor: palette.purple[900], borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", padding: spacing.mdl, gap: spacing.md }}>
      <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "34%", overflow: "hidden" }}>
        <Stripes band={12} gap={16} colors={[palette.orange[500], palette.purple[500]]} opacity={0.85} />
      </View>

      <View style={{ width: 64, height: 64, borderRadius: 20, borderCurve: "continuous", backgroundColor: palette.purple[800], alignItems: "center", justifyContent: "center", transform: [{ rotate: "-6deg" }] }}>
        <PlatformLogo platform={d.platform} size={34} color={d.platform === "android" ? ANDROID_GREEN : palette.white} />
      </View>

      <View style={{ gap: spacing.xs, maxWidth: "66%" }}>
        <Text variant="overline" style={{ color: palette.orange[300] }}>
          You&apos;re here
        </Text>
        <Text variant="title" numberOfLines={2} style={{ color: palette.white }}>
          {d.model}
        </Text>
        {/* the model is already the title, so just the app */}
        <Text variant="caption" style={{ color: palette.purple[100] }}>
          {os ? `Tribe for ${os}` : d.detail}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: palette.purple[800], borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: spacing.smd }}>
          <LiveDot />
          <Text variant="caption" style={{ color: palette.white, fontFamily: fonts.semibold }}>
            Active now
          </Text>
        </View>
        {os && (
          <View style={{ backgroundColor: palette.purple[800], borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: spacing.smd }}>
            <Text variant="caption" style={{ color: palette.purple[100], fontFamily: fonts.semibold }}>
              {os} gang
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** A phone this account used before, logged out when a newer one signed in. */
function EarlierPhone({ d }: { d: Device }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, paddingVertical: spacing.smd, minHeight: 64 }}>
      <View style={{ width: 40, height: 40, borderRadius: 14, borderCurve: "continuous", backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
        <PlatformLogo platform={d.platform} size={20} color={d.platform === "android" ? ANDROID_GREEN : c.text} />
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {d.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {d.detail ? `${d.detail} · ` : ""}last seen {when(d.lastActive)}
        </Text>
      </View>
      <Pill label={d.status === "replaced" ? "Logged out" : d.status} tone="neutral" />
    </View>
  );
}

/**
 * Me › Devices (GET devices). Tribe works on ONE phone at a time: signing in on a new phone (after
 * an emailed code) signs the old one out, so the others listed here are history, not sessions.
 * This phone is the brand card (OS logo, live dot); earlier phones are a plain list.
 */
export default function Devices() {
  const c = useColors();
  const query = useDevices();
  const devices = query.data;
  const current = devices?.filter((d) => d.current) ?? [];
  const others = devices?.filter((d) => !d.current) ?? [];

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      {!devices ? (
        query.isError ? (
          <QueryError onRetry={() => void query.refetch()} />
        ) : (
          <>
            <Skeleton width="100%" height={220} radius={radius.card} />
            <DeviceListSkeleton title="Earlier phones" rows={2} />
          </>
        )
      ) : (
        <>
          {current.map((d) => (
            <ThisPhone key={d.id} d={d} />
          ))}

          {/* the one-phone rule, said once and plainly */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: c.brandSoft, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
            <Icon name="shield" size={20} color={c.brandText} />
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="bodyStrong">One phone, one Tribe</Text>
              <Text variant="caption" tone="muted">
                Sign in on a new phone and the old one gets logged out automatically.
              </Text>
            </View>
          </View>

          {others.length > 0 ? (
            <ListSection title="Earlier phones" footer="Don't recognise one? Change your password." inset={68}>
              {others.map((d) => (
                <EarlierPhone key={d.id} d={d} />
              ))}
            </ListSection>
          ) : (
            <Text variant="caption" tone="muted" align="center">
              Just this one so far. No other phone has used your account.
            </Text>
          )}
        </>
      )}
    </Screen>
  );
}
