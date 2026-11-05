import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { Icon, type IconName } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { BAR_ROW, StickyBandBar, useBandScroll } from "@/components/sticky-band-bar";
import { Stripes } from "@/components/stripes";
import { Text } from "@/components/text";
import { TIER_INFO } from "@/services/kyc";
import { TIER_LIMITS, useSessionStore, type KycTier } from "@/stores/use-session-store";
import { reviewAge, tierState, type TierStateName, type VerifyTier } from "@/utils/kyc-state";
import { setupTasks, type SetupTask } from "@/utils/setup-flow";
import { fonts, palette, radius, spacing, useColors } from "@/theme";

const BAND = palette.purple[900];
const OVERLAP = spacing.lg;

type Row = { task: SetupTask; tier: VerifyTier | null; state: TierStateName; reason?: string; submittedAt?: string; afterTier?: number };

/** A task's state: the setup task's own when it carries one, else from done / wait; tiers fill in reason and dates from kyc-state. */
function rowFor(task: SetupTask): Row {
  const tier = task.id === "tier2" ? 2 : task.id === "tier3" ? 3 : task.id === "identity" ? 1 : null;
  const k = tier ? tierState(tier) : null;
  const state: TierStateName = task.state ?? (task.done ? "verified" : task.wait === "review" ? "in_review" : task.wait === "locked" ? "locked" : "available");
  return { task, tier, state, reason: task.reason ?? k?.reason, submittedAt: k?.submittedAt, afterTier: k?.afterTier };
}

const canOpen = (r: Row) => r.state === "available" || r.state === "needs_attention";
const timeLabel = (mins: number) => (mins < 1 ? "Takes 30 seconds" : `Takes about ${mins} min`);

/** One line under the title, saying exactly where the step stands. */
function subtitleFor(r: Row) {
  switch (r.state) {
    case "verified":
      return "Done";
    case "in_review":
      return r.submittedAt ? `In review, sent ${reviewAge(r.submittedAt)}` : "In review";
    case "needs_attention":
      return r.reason ? `Needs attention: ${r.reason}` : "Needs attention. Try again";
    case "locked":
      return r.afterTier ? `After Tier ${r.afterTier}` : (r.task.waitLabel ?? "Later");
    default:
      return r.tier && r.tier > 1 ? TIER_INFO[r.tier].unlocks : timeLabel(r.task.mins);
  }
}

/** Parse "₦5,000,000" for the ladder bars (display strings live in TIER_LIMITS). */
const naira = (v: string) => Number(v.replace(/[^\d]/g, "")) || 0;
const FLOOR = Math.log10(naira(TIER_LIMITS[0].daily));
const CEIL = Math.log10(naira(TIER_LIMITS[3].daily));
/** a tier's bar length: log scale, so Tier 1 still reads as a real step up from nothing */
const barFor = (tier: KycTier) => Math.max(0.16, (Math.log10(naira(TIER_LIMITS[tier].daily)) - FLOOR) / (CEIL - FLOOR));

/**
 * The one thing to do now, as a mission card: Midnight purple in both themes, the step's number
 * and time on the left, its own icon in rings on the right, and a white button named for the action.
 */
function UpNext({ row, step, of }: { row: Row; step: number | null; of: number }) {
  const { task, tier } = row;
  const raises = tier ? { from: TIER_LIMITS[(tier - 1) as KycTier].daily, to: TIER_LIMITS[tier].daily } : null;
  const ink = palette.purple[100];
  return (
    <View style={{ backgroundColor: palette.purple[700], borderRadius: radius.card, borderCurve: "continuous", padding: spacing.mdl, gap: spacing.md, overflow: "hidden", boxShadow: "0 22px 40px -26px rgba(44,5,72,0.9)" }}>
      {/* rings behind the icon: the step "landing" */}
      <View pointerEvents="none" style={{ position: "absolute", right: -46, top: -46, width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }} />
      <View pointerEvents="none" style={{ position: "absolute", right: -14, top: -14, width: 136, height: 136, borderRadius: 68, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }} />

      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="overline" style={{ color: palette.orange[300] }}>
            {row.state === "needs_attention" ? "Needs another try" : step ? `Up next · step ${step} of ${of}` : "Up next"}
          </Text>
          <Text variant="title" style={{ color: palette.white }}>
            {tier && tier > 1 ? `Unlock Tier ${tier}` : task.title}
          </Text>
        </View>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: palette.white, alignItems: "center", justifyContent: "center" }}>
            <Icon name={task.icon} size={20} color={palette.purple[700]} />
          </View>
        </View>
      </View>

      <Text variant="body" style={{ color: ink }}>
        {task.pitch}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <Chip icon="clock" label={task.mins < 1 ? "30 seconds" : `About ${task.mins} min`} />
        {raises ? <Chip icon="sparkles" label={`${raises.to} a day`} highlight /> : <Chip icon="sparkles" label={task.unlocks} />}
      </View>

      {row.state === "needs_attention" && row.reason && (
        <View style={{ flexDirection: "row", gap: spacing.sm, backgroundColor: "rgba(255,71,71,0.16)", borderRadius: radius.input, padding: spacing.smd }}>
          <Icon name="warning" size={14} color={palette.error[400]} />
          <Text variant="caption" style={{ flex: 1, color: palette.white }}>
            Last time: {row.reason}
          </Text>
        </View>
      )}

      <Button variant="white" title={row.state === "needs_attention" ? "Try again" : task.cta} onPress={() => router.push(task.href)} />
    </View>
  );
}

function Chip({ icon, label, highlight }: { icon: IconName; label: string; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%", backgroundColor: highlight ? palette.orange[500] : "rgba(255,255,255,0.12)", borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 6 }}>
      <Icon name={icon} size={12} color={palette.white} />
      <Text variant="caption" numberOfLines={1} style={{ color: palette.white, flexShrink: 1 }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * The basics as a path: numbered stops joined by a line that turns green as steps get done.
 * The next stop is filled purple with a halo; finished stops tick; reviews wait in amber.
 */
function SetupPath({ rows, next }: { rows: Row[]; next?: Row }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", paddingVertical: spacing.sm }}>
      {rows.map((r, i) => {
        const current = r === next;
        const done = r.state === "verified";
        const last = i === rows.length - 1;
        const node =
          done ? { bg: c.success, fg: palette.white, icon: "check" as IconName }
          : r.state === "in_review" ? { bg: c.pending, fg: palette.white, icon: "clock" as IconName }
          : r.state === "needs_attention" ? { bg: c.danger, fg: palette.white, icon: "warning" as IconName }
          : current ? { bg: c.brand, fg: c.onBrand, icon: null }
          : { bg: c.surfaceAlt, fg: c.textMuted, icon: null };
        const open = canOpen(r);
        const body = (
          <View style={{ flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.md }}>
            {/* the stop and the line down to the next one */}
            <View style={{ width: 34, alignItems: "center" }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: current ? c.brandSoft : "transparent", alignItems: "center", justifyContent: "center", marginTop: spacing.smd }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: node.bg, alignItems: "center", justifyContent: "center" }}>
                  {node.icon ? (
                    <Icon name={node.icon} size={12} color={node.fg} weight="bold" />
                  ) : (
                    <Text variant="caption" style={{ color: node.fg, fontFamily: fonts.semibold }}>
                      {i + 1}
                    </Text>
                  )}
                </View>
              </View>
              {!last && <View style={{ flex: 1, width: 2, minHeight: 12, borderRadius: 1, backgroundColor: done ? c.success : c.border }} />}
            </View>
            <View style={{ flex: 1, paddingVertical: spacing.md, gap: 2, opacity: done ? 0.7 : 1 }}>
              <Text variant="bodyStrong" style={done ? { textDecorationLine: "line-through", color: c.textMuted } : undefined}>
                {r.task.title}
              </Text>
              <Text variant="caption" tone={r.state === "needs_attention" ? "danger" : "muted"}>
                {current && r.state === "available" ? `You're here · ${timeLabel(r.task.mins).toLowerCase()}` : subtitleFor(r)}
              </Text>
            </View>
            {open && (
              <View style={{ justifyContent: "center" }}>
                <Icon name="chevron" size={13} color={c.textSubtle} />
              </View>
            )}
          </View>
        );
        return open ? (
          <PressableScale key={r.task.id} scaleTo={0.98} onPress={() => router.push(r.task.href)} accessibilityRole="button" accessibilityLabel={`Step ${i + 1}: ${r.task.title}. ${subtitleFor(r)}`}>
            {body}
          </PressableScale>
        ) : (
          <View key={r.task.id} accessible accessibilityLabel={`Step ${i + 1}: ${r.task.title}. ${subtitleFor(r)}`}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Limits as a ladder: one row per tier with a bar as long as its daily limit (log scale), filled
 * for tiers you have, amber while one is in review, faint while locked. "You" marks your tier.
 */
function TierLadder({ rows, current }: { rows: Row[]; current: KycTier }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, gap: spacing.md }}>
      {rows.map((r) => {
        const tier = r.tier as VerifyTier;
        const have = r.state === "verified";
        const fill = have ? c.brand : r.state === "in_review" ? c.pending : r.state === "locked" ? c.surfaceAlt : c.brandSoft;
        const open = canOpen(r);
        const body = (
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: have ? c.brand : c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                {r.state === "locked" ? (
                  <Icon name="lock" size={11} color={c.textSubtle} />
                ) : (
                  <Text variant="caption" style={{ color: have ? c.onBrand : c.text, fontFamily: fonts.semibold }}>
                    {tier}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Text variant="bodyStrong">Tier {tier}</Text>
                  {tier === current && (
                    <View style={{ backgroundColor: c.accent, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 1 }}>
                      <Text variant="overline" style={{ color: palette.white, fontSize: 9 }}>
                        You
                      </Text>
                    </View>
                  )}
                </View>
                <Text variant="caption" tone={r.state === "needs_attention" ? "danger" : "muted"} numberOfLines={2}>
                  {TIER_INFO[tier].title}
                  {have ? "" : ` · ${subtitleFor(r)}`}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text variant="amount" tone={r.state === "locked" ? "muted" : "text"}>
                  {TIER_LIMITS[tier].daily}
                </Text>
                <Text variant="caption" tone="muted">
                  a day
                </Text>
              </View>
              {open && <Icon name="chevron" size={13} color={c.textSubtle} />}
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: c.sunken, overflow: "hidden" }}>
              <View style={{ width: `${barFor(tier) * 100}%`, height: "100%", borderRadius: 4, backgroundColor: fill }} />
            </View>
          </View>
        );
        return open ? (
          <PressableScale key={r.task.id} scaleTo={0.98} onPress={() => router.push(r.task.href)} accessibilityRole="button" accessibilityLabel={`Tier ${tier}, ${TIER_LIMITS[tier].daily} a day. ${subtitleFor(r)}`}>
            {body}
          </PressableScale>
        ) : (
          <View key={r.task.id} accessible accessibilityLabel={`Tier ${tier}, ${TIER_LIMITS[tier].daily} a day. ${have ? "Done" : subtitleFor(r)}`}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Get set up: everything left after sign-up, on one page (Home only shows a link card). The next
 * step sits on its own with one button; below it, a plain checklist says where every step and
 * tier stands. States come from the setup tasks and kyc-state, so a request in review can't be
 * opened again from here. The back button stays pinned while the page scrolls.
 */
export default function GetSetUp() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { y, onScroll } = useBandScroll();
  const session = useSessionStore();
  const tasks = setupTasks(session);
  const basics = tasks.filter((t) => !t.later).map(rowFor);
  const tiers = tasks.filter((t) => t.later).map(rowFor);
  const doneCount = basics.filter((r) => r.state === "verified").length;
  const basicsDone = doneCount === basics.length;
  const next = [...basics, ...tiers].find(canOpen);
  // Tier 1 is the identity step; the ladder shows it beside Tiers 2 and 3
  const ladder = [...basics, ...tiers].filter((r) => r.tier).sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0));
  const left = basics.filter((r) => r.state !== "verified" && r.state !== "in_review");
  const mins = Math.max(1, Math.round(left.reduce((m, r) => m + r.task.mins, 0)));
  const name = session.user.firstName;
  const enter = (i: number) => (reduce ? undefined : FadeInDown.delay(80 + i * 60).duration(320));
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const title = basicsDone ? "Level up" : "Get set up";
  const lede = basicsDone
    ? `You're all set${name ? `, ${name}` : ""}. Higher tiers raise your limits and unlock more, when you need them.`
    : `${doneCount} of ${basics.length} done. About ${mins} min left, and you can use Tribe in the meantime.`;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg }}>
        {/* pull-down bounce shows purple, not a gap above the band */}
        <View style={{ position: "absolute", top: -1000, left: 0, right: 0, height: 1000, backgroundColor: BAND }} />

        <View style={{ backgroundColor: BAND, overflow: "hidden", paddingTop: insets.top + spacing.sm + BAR_ROW + spacing.lg, paddingHorizontal: spacing.mdl, paddingBottom: OVERLAP + spacing.lg, gap: spacing.smd }}>
          <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "18%", overflow: "hidden", opacity: 0.55 }}>
            <Stripes band={8} gap={14} colors={[palette.orange[500], palette.purple[500]]} />
          </View>
          <Text variant="largeTitle" accessibilityRole="header" style={{ color: palette.white, paddingRight: "20%" }}>
            {title}
          </Text>
          <Text variant="body" style={{ color: palette.purple[100], paddingRight: "20%" }}>
            {lede}
          </Text>
          {!basicsDone && (
            <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs, paddingRight: "20%" }} accessible accessibilityRole="progressbar" accessibilityLabel={`${doneCount} of ${basics.length} done`}>
              {basics.map((r) => (
                <View key={r.task.id} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: r.state === "verified" ? palette.orange[400] : r.state === "in_review" ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.16)" }} />
              ))}
            </View>
          )}
        </View>

        <View style={{ marginTop: -OVERLAP, backgroundColor: c.bg, borderTopLeftRadius: radius.panel, borderTopRightRadius: radius.panel, borderCurve: "continuous", padding: spacing.mdl, paddingTop: spacing.lg, gap: spacing.lg }}>
          {next && (
            <Animated.View entering={enter(0)}>
              <UpNext row={next} step={basics.includes(next) ? basics.indexOf(next) + 1 : null} of={basics.length} />
            </Animated.View>
          )}

          {/* every basic step in order, done ones ticked in place */}
          <Animated.View entering={enter(1)} style={{ gap: spacing.sm }}>
            <Text variant="headline" style={{ paddingHorizontal: spacing.xs }}>
              {basicsDone ? "Your setup" : "Your path"}
            </Text>
            <SetupPath rows={basics} next={next} />
          </Animated.View>

          {ladder.length > 0 && (
            <Animated.View entering={enter(2)} style={{ gap: spacing.sm }}>
              <View style={{ paddingHorizontal: spacing.xs, gap: 2 }}>
                <Text variant="headline">Daily limits</Text>
                <Text variant="caption" tone="muted">
                  {basicsDone ? "Climb a tier when you need more." : "Optional. Climb a tier when you need more."}
                </Text>
              </View>
              <TierLadder rows={ladder} current={session.kycTier} />
            </Animated.View>
          )}

          <PressableScale onPress={() => router.push("/verify")} scaleTo={0.98} hitSlop={8} accessibilityRole="link" style={{ alignSelf: "center", paddingVertical: spacing.sm }}>
            <Text variant="subhead" tone="brand">
              See all limits
            </Text>
          </PressableScale>
        </View>
      </Animated.ScrollView>

      <StickyBandBar y={y} color={BAND} onBack={back} />
    </View>
  );
}
