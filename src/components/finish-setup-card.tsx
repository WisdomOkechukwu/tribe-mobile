import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { usePrefsStore } from "@/stores/use-prefs-store";
import type { SetupTask } from "@/utils/setup-flow";
import { fonts, palette, radius, spacing, useColors } from "@/theme";
import { Button } from "./button";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Stripes } from "./stripes";
import { Text } from "./text";

/** Remembered in prefs (alongside dismissed cards): the card is folded down to its header. */
const COLLAPSED = "setup-card-collapsed";

/** Progress as a ring with "1/4" in the middle. */
function Ring({ done, total, size = 48 }: { done: number; total: number; size?: number }) {
  const stroke = 4.5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={palette.orange[400]} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${(circ * done) / total} ${circ}`} />
      </Svg>
      <Text style={{ fontFamily: fonts.display, fontSize: 14, lineHeight: 17, color: palette.white }}>
        {done}/{total}
      </Text>
    </View>
  );
}

const minsLeft = (tasks: SetupTask[]) => Math.max(1, Math.round(tasks.filter((t) => !t.done).reduce((m, t) => m + t.mins, 0)));
const timeLabel = (mins: number) => (mins < 1 ? "30 sec" : `${mins} min`);

/**
 * Home's "Finish setup". Tap the header to fold it into one compact row (ring, what's next, a
 * small Continue) or open it up (the next task with a Continue button, then the whole list:
 * done steps ticked, the rest tappable). The fold is remembered. Each start chains through
 * whatever's left (utils/setup-flow.ts); nothing here blocks the app.
 */
export function FinishSetupCard({ tasks }: { tasks: SetupTask[] }) {
  const c = useColors();
  const collapsed = usePrefsStore((s) => s.dismissedPromos.includes(COLLAPSED));
  const fold = usePrefsStore((s) => s.dismissPromo);
  const unfold = usePrefsStore((s) => s.restorePromo);
  const done = tasks.filter((t) => t.done).length;
  const next = tasks.find((t) => !t.done);
  if (!next) return null;

  const toggle = () => {
    Haptics.selectionAsync().catch(() => {});
    if (collapsed) unfold(COLLAPSED);
    else fold(COLLAPSED);
  };
  const go = () => router.push(next.href);

  return (
    <Animated.View layout={LinearTransition.duration(220)} style={{ borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: c.surface }}>
      {/* header: tap it (or the chevron) to fold / unfold; Continue sits beside, not inside */}
      <View style={{ backgroundColor: palette.purple[900], paddingVertical: spacing.smd, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.smd, overflow: "hidden" }}>
        <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 56, overflow: "hidden", opacity: 0.55 }}>
          <Stripes band={8} gap={12} />
        </View>
        <Pressable onPress={toggle} accessibilityRole="button" accessibilityState={{ expanded: !collapsed }} accessibilityLabel={`Finish setup, ${done} of ${tasks.length} done. ${collapsed ? "Show" : "Hide"} details`} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.smd, opacity: pressed ? 0.85 : 1 })}>
          <Ring done={done} total={tasks.length} />
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text variant="bodyStrong" style={{ color: palette.white }}>
              Finish setup
            </Text>
            <Text variant="caption" numberOfLines={1} style={{ color: palette.purple[100] }}>
              {collapsed ? `Next: ${next.title}` : `About ${minsLeft(tasks)} min left · use Tribe meanwhile`}
            </Text>
          </View>
        </Pressable>
        {collapsed && (
          <PressableScale onPress={go} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Continue: ${next.title}`} style={{ backgroundColor: palette.white, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.sm }}>
            <Text variant="subhead" style={{ color: palette.purple[700] }}>
              Continue
            </Text>
          </PressableScale>
        )}
        <PressableScale onPress={toggle} hitSlop={8} accessibilityRole="button" accessibilityLabel={collapsed ? "Show setup details" : "Hide setup details"} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
          <View style={{ transform: [{ rotate: collapsed ? "0deg" : "180deg" }] }}>
            <Icon name="chevronDown" size={11} color={palette.white} weight="bold" />
          </View>
        </PressableScale>
      </View>

      {!collapsed && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} style={{ padding: spacing.md, gap: spacing.smd }}>
          {/* up next */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
              <Icon name={next.icon} size={17} color={c.onBrand} />
            </View>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="bodyStrong">{next.title}</Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {next.unlocks} · {timeLabel(next.mins)}
              </Text>
            </View>
            <Button title="Continue" size="sm" inline onPress={go} />
          </View>

          <View style={{ height: 1, backgroundColor: c.border }} />

          {/* the whole list: ticked when done, tappable when not */}
          <View>
            {tasks.map((t) => {
              const isNext = t.id === next.id;
              return (
                <PressableScale key={t.id} disabled={t.done} onPress={() => router.push(t.href)} scaleTo={0.98} accessibilityRole="button" accessibilityState={{ disabled: t.done }} accessibilityLabel={`${t.title}${t.done ? ", done" : ""}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingVertical: spacing.sm }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: t.done ? c.success : "transparent", borderWidth: t.done ? 0 : 1.5, borderColor: isNext ? c.brand : c.borderStrong }}>
                    {t.done && <Icon name="check" size={10} color="#fff" weight="bold" />}
                  </View>
                  <Text variant="subhead" tone={t.done ? "muted" : "text"} style={{ flex: 1, textDecorationLine: t.done ? "line-through" : "none" }}>
                    {t.title}
                  </Text>
                  {!t.done && (
                    <Text variant="caption" tone="muted">
                      {timeLabel(t.mins)}
                    </Text>
                  )}
                </PressableScale>
              );
            })}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}
