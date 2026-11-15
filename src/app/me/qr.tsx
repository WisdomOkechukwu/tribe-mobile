import { router } from "expo-router";
import Animated, { Easing, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { openTagShare } from "@/components/share-cards";
import { TagPass } from "@/components/tag-pass";
import { Text } from "@/components/text";
import { useSessionStore } from "@/stores/use-session-store";
import { spacing } from "@/theme";

/** Your Tribe tag: the pass to show or share, then scanning someone else's. */
export default function TagQr() {
  const user = useSessionStore((s) => s.user);
  const reduce = useReducedMotion();
  const link = `tribe://pay/@${user.tag}`;
  const web = `https://tribe.africa/pay/${user.tag}`;
  const enter = (delay: number) => (reduce ? undefined : FadeInDown.delay(delay).duration(460).easing(Easing.out(Easing.cubic)));
  return (
    <Screen>
      <Animated.View entering={enter(0)}>
        <TagPass link={link} web={web} />
      </Animated.View>
      <Animated.View entering={enter(160)} style={{ gap: spacing.xs }}>
        <Text variant="caption" tone="muted" align="center" style={{ marginBottom: spacing.xs }}>
          Anyone on Tribe can scan it or tap the link to pay you.
        </Text>
        <Button title="Share my tag" icon="share" onPress={openTagShare} />
        <Button title="Scan someone else's code" icon="scan" variant="tertiary" onPress={() => router.push("/scan")} />
      </Animated.View>
    </Screen>
  );
}
