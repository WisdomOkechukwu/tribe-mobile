import { router } from "expo-router";
import { View } from "react-native";
import type { SetupTask } from "@/utils/setup-flow";
import { palette, radius, spacing } from "@/theme";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** One segment per step: filled when done, the current one half-lit. */
function Segments({ tasks, currentId }: { tasks: SetupTask[]; currentId: string }) {
  return (
    <View style={{ flexDirection: "row", gap: spacing.xs }}>
      {tasks.map((t) => (
        <View key={t.id} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: t.done ? palette.orange[400] : t.id === currentId ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.14)" }} />
      ))}
    </View>
  );
}

/**
 * Home's "Finish setup": a single link card. Progress segments, how much is left (or what's in
 * review), a chevron; the whole card opens Get set up (src/app/get-set-up.tsx), where the steps
 * live. Once the basics are done it reads "Unlock more" for Tiers 2 and 3. Hidden when all done.
 */
export function FinishSetupCard({ tasks }: { tasks: SetupTask[] }) {
  const basics = tasks.filter((t) => !t.later);
  const tiers = tasks.filter((t) => t.later);
  const basicsLeft = basics.some((t) => !t.done);
  // the first thing the user can actually do; a tier in review only leads when nothing else is left
  const next = tasks.find((t) => !t.done && !t.wait) ?? tasks.find((t) => !t.done);
  if (!next) return null;

  const counted = basicsLeft ? basics : tiers;
  const left = counted.filter((t) => !t.done).length;
  const title = basicsLeft ? "Finish setup" : "Unlock more";
  const tierNo = next.id === "tier2" ? 2 : next.id === "tier3" ? 3 : null;
  const line =
    next.wait === "review"
      ? `${tierNo ? `Tier ${tierNo}` : next.title} is in review`
      : basicsLeft
        ? `${left} ${left === 1 ? "thing" : "things"} left`
        : `Tier ${tierNo ?? 2} next`;

  return (
    <PressableScale
      onPress={() => router.push("/get-set-up")}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}. Open Get set up`}
      style={{ backgroundColor: palette.purple[900], borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.smd }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" style={{ color: palette.white }}>
            {title}
          </Text>
          <Text variant="caption" style={{ color: palette.purple[100] }}>
            {line}
          </Text>
        </View>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="chevron" size={12} color={palette.white} weight="bold" />
        </View>
      </View>
      <Segments tasks={counted} currentId={next.id} />
    </PressableScale>
  );
}
