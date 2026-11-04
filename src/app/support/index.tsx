import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { View } from "react-native";
import Animated, { Easing, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Shine } from "@/components/shine";
import { QueryError, SkeletonList } from "@/components/skeletons";
import { BAR_ROW, StickyBandBar, useBandScroll } from "@/components/sticky-band-bar";
import { Text } from "@/components/text";
import { useSupportLive, useTickets, type Ticket, type TicketStatus } from "@/api/support";
import { MarkDisc } from "@/screens/auth/shell";
import { TOPICS } from "@/screens/support/topics";
import { fonts, palette, radius, spacing, useColors } from "@/theme";
import { relativeDate } from "@/utils/format";

const BAND = palette.purple[900];
const OVERLAP = spacing.lg;
const LIME = "#C6EFA6";
const RESOLVED_SHOWN = 3;

/** Where a chat stands, as a small sticker: lime when Tribe replied (your move), quiet otherwise. */
function StatusSticker({ status }: { status: TicketStatus }) {
  const c = useColors();
  const look =
    status === "pending"
      ? { bg: LIME, fg: "#14261A", label: "Tribe replied" }
      : status === "open"
        ? { bg: c.surfaceAlt, fg: c.text, label: "Waiting" }
        : { bg: c.successSoft, fg: c.success, label: "Sorted" };
  return (
    <View style={{ transform: [{ rotate: status === "pending" ? "-4deg" : "0deg" }], backgroundColor: look.bg, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 }}>
      <Text variant="caption" style={{ fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: look.fg }}>
        {look.label}
      </Text>
    </View>
  );
}

/** A message bubble drawn as a die-cut sticker (white edge, tilted), for the band's little chat. */
function StickerBubble({ text, bg, fg, rotate, tail, shine, children }: { text: string; bg: string; fg: string; rotate: string; tail: "left" | "right"; shine?: boolean; children?: React.ReactNode }) {
  return (
    <View style={{ transform: [{ rotate }], alignSelf: tail === "right" ? "flex-end" : "flex-start", borderRadius: 20, boxShadow: "0 10px 20px -10px rgba(0,0,0,0.55)" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
          backgroundColor: bg,
          borderWidth: 3,
          borderColor: palette.white,
          borderRadius: 20,
          borderBottomRightRadius: tail === "right" ? 6 : 20,
          borderBottomLeftRadius: tail === "left" ? 6 : 20,
          paddingHorizontal: spacing.smd,
          paddingVertical: spacing.sm,
          overflow: "hidden",
        }}
      >
        {children}
        <Text style={{ fontFamily: fonts.semibold, fontSize: 13.5, lineHeight: 18, color: fg }}>{text}</Text>
        {shine && <Shine delay={900} every={3800} strength={0.55} />}
      </View>
    </View>
  );
}

/**
 * Help & chat. The band shows what this place is: a little chat, two message stickers, with the
 * line's live state under it. Below, a button that looks like the message box itself, topics as
 * small pills, then your chats (Tribe-replied first, then waiting), with resolved ones folded.
 * Replies arrive live over the support socket.
 */
export default function Support() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { y, onScroll } = useBandScroll();
  const tickets = useTickets();
  const live = useSupportLive((s) => s.live);
  const [showAllResolved, setShowAllResolved] = useState(false);
  const all = tickets.data ?? [];
  // your move first (Tribe replied), then waiting on Tribe; most recent activity first within each
  const rank: Record<TicketStatus, number> = { pending: 0, open: 1, resolved: 2 };
  const going = all.filter((t) => t.status !== "resolved").sort((a, b) => rank[a.status] - rank[b.status] || b.updatedAt.localeCompare(a.updatedAt));
  const done = all.filter((t) => t.status === "resolved");
  const shownDone = showAllResolved ? done : done.slice(0, RESOLVED_SHOWN);
  const enter = (i: number) => (reduce ? undefined : FadeInDown.delay(80 + i * 70).duration(360).easing(Easing.out(Easing.cubic)));
  const open = (t: Ticket) => router.push({ pathname: "/support/[id]", params: { id: t.id } });
  const row = (t: Ticket) => (
    <ListRow
      key={t.id}
      leading={
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.status === "pending" ? c.brandSoft : c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
          <Icon name={t.transactionId ? "link" : "chatLine"} size={16} color={t.status === "pending" ? c.brandText : c.textMuted} />
        </View>
      }
      title={t.subject}
      subtitle={t.transactionId ? `With a transaction, ${relativeDate(t.updatedAt).toLowerCase()}` : relativeDate(t.updatedAt)}
      trailing={<StatusSticker status={t.status} />}
      onPress={() => open(t)}
      accessibilityLabel={`${t.subject}. ${t.status === "pending" ? "Tribe replied" : t.status === "open" ? "Waiting on Tribe" : "Resolved"}`}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg }}>
        <View style={{ position: "absolute", top: -1000, left: 0, right: 0, height: 1000, backgroundColor: BAND }} />

        {/* the band: a headline and a little chat in stickers, what this screen is for */}
        <View style={{ backgroundColor: BAND, overflow: "hidden", paddingTop: insets.top + spacing.sm + BAR_ROW + spacing.md, paddingHorizontal: spacing.mdl, paddingBottom: OVERLAP + spacing.lg, gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="poster" accessibilityRole="header" maxFontSizeMultiplier={1.2} style={{ color: palette.white, fontSize: 32, lineHeight: 34 }}>
              {"Talk to\n"}
              <Text variant="poster" style={{ fontSize: 32, lineHeight: 34, color: palette.orange[400] }}>
                Tribe.
              </Text>
            </Text>
            <Text variant="body" style={{ color: palette.purple[100] }}>
              Real people on the Tribe team. Ask anything, we reply right here.
            </Text>
          </View>

          <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ gap: spacing.sm, paddingHorizontal: spacing.xs }}>
            <StickerBubble text="my transfer hasn't landed" bg={palette.white} fg={palette.purple[700]} rotate="-3deg" tail="right" />
            <StickerBubble text="on it, checking now" bg={LIME} fg="#14261A" rotate="2.5deg" tail="left" shine>
              <MarkDisc size={22} />
            </StickerBubble>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: live ? palette.success[300] : palette.purple[200] }} />
            <Text variant="caption" style={{ color: palette.white }}>
              {live ? "Live: replies show up instantly" : "Connecting…"}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: -OVERLAP, backgroundColor: c.bg, borderTopLeftRadius: radius.panel, borderTopRightRadius: radius.panel, borderCurve: "continuous", padding: spacing.mdl, paddingTop: spacing.lg, gap: spacing.lg }}>
          {/* the way in looks like the message box it opens */}
          <Animated.View entering={enter(0)} style={{ gap: spacing.smd }}>
            <PressableScale
              onPress={() => router.push("/support/new")}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel="Start a chat"
              style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surface, borderRadius: radius.full, borderWidth: 1.5, borderColor: c.brand, paddingLeft: spacing.md, paddingRight: 6, paddingVertical: 6 }}
            >
              <Text variant="body" tone="muted" style={{ flex: 1 }}>
                What&apos;s up? Tell us here
              </Text>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
                <Icon name="paperplane" size={16} color={c.onBrand} />
              </View>
            </PressableScale>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {TOPICS.map((t) => (
                <PressableScale
                  key={t.id}
                  onPress={() => router.push({ pathname: "/support/new", params: { topic: t.id } })}
                  scaleTo={0.96}
                  accessibilityRole="button"
                  accessibilityLabel={`Start a chat about ${t.label}`}
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: c.surface, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.sm }}
                >
                  <Icon name={t.icon} size={13} color={c.brandText} />
                  <Text variant="subhead">{t.label}</Text>
                </PressableScale>
              ))}
            </View>
          </Animated.View>

          {tickets.isPending ? (
            <SkeletonList rows={3} />
          ) : tickets.isError ? (
            <QueryError onRetry={() => tickets.refetch()} />
          ) : (
            <>
              <Animated.View entering={enter(1)}>
                <ListSection title="Your chats" inset={66}>
                  {going.length ? going.map(row) : [<ListRow key="none" icon="chatLine" title="Nothing open" subtitle="Start a chat above whenever you need us." />]}
                </ListSection>
              </Animated.View>
              {done.length > 0 && (
                <Animated.View entering={enter(2)} style={{ gap: spacing.sm }}>
                  <ListSection title="Sorted" inset={66}>
                    {shownDone.map(row)}
                  </ListSection>
                  {done.length > RESOLVED_SHOWN && (
                    <PressableScale onPress={() => setShowAllResolved((v) => !v)} hitSlop={8} accessibilityRole="button" style={{ alignSelf: "center", paddingVertical: spacing.xs }}>
                      <Text variant="subhead" tone="brand">
                        {showAllResolved ? "Show fewer" : `Show all ${done.length}`}
                      </Text>
                    </PressableScale>
                  )}
                </Animated.View>
              )}
            </>
          )}
        </View>
      </Animated.ScrollView>

      <StickyBandBar y={y} color={BAND} onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
    </View>
  );
}
