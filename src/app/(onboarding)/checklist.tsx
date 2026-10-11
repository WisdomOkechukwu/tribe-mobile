import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Button } from "@/components/button";
import { Icon, type IconName } from "@/components/icon";
import { Text } from "@/components/text";
import { BASE_NEEDS, WORLDS, type Need } from "@/data/worlds";
import { OnboardingShell } from "@/screens/onboarding/shell";
import { useSessionStore } from "@/stores/use-session-store";
import { useSignupStore } from "@/stores/use-signup-store";
import { radius, spacing, useColors } from "@/theme";

const ROWS: Record<Need, { icon: IconName; title: string; sub: string; href: "/phone" | "/bvn" | "/know-you" }> = {
  phone: { icon: "phone", title: "Phone number verification", sub: "A quick code by SMS", href: "/phone" },
  identity: { icon: "idcard", title: "Personal identity verification", sub: "Your BVN, matched to your name", href: "/bvn" },
  profile: { icon: "people", title: "About your money", sub: "Six quick questions for your global accounts", href: "/know-you" },
};

function Row({ need, done, enabled }: { need: Need; done: boolean; enabled: boolean }) {
  const c = useColors();
  const r = ROWS[need];
  return (
    <Pressable onPress={enabled && !done ? () => router.push(r.href) : undefined} accessibilityRole="button" accessibilityState={{ checked: done, disabled: !enabled }} accessibilityLabel={`${r.title}${done ? ", done" : ""}`}>
      {({ pressed }) => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, padding: spacing.md, backgroundColor: pressed ? c.surfaceAlt : c.surface, opacity: enabled || done ? 1 : 0.5 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: done ? c.successSoft : c.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name={r.icon} size={17} color={done ? c.success : c.brandText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{r.title}</Text>
            <Text variant="caption" tone="muted">
              {done ? "Done" : r.sub}
            </Text>
          </View>
          {done ? (
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.success, alignItems: "center", justifyContent: "center" }}>
              <Icon name="check" size={12} color="#fff" weight="bold" />
            </View>
          ) : enabled ? (
            <Text variant="subhead" tone="brand">
              Verify
            </Text>
          ) : (
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: c.borderStrong }} />
          )}
        </View>
      )}
    </Pressable>
  );
}

/** "Almost there…" (SBU.png): only what the chosen world needs. Phone is required; the rest can wait. */
export default function Checklist() {
  const c = useColors();
  const world = useSignupStore((s) => s.world);
  const phone = useSignupStore((s) => s.phoneVerified);
  const identity = useSignupStore((s) => s.identityVerified);
  const profile = useSignupStore((s) => s.profileDone);
  const tier = useSessionStore((s) => s.kycTier);
  const hasPin = useSessionStore((s) => s.pin !== null);
  const needs = world ? WORLDS[world].needs : BASE_NEEDS;
  const done: Record<Need, boolean> = { phone, identity: identity || tier >= 1, profile };
  const allDone = needs.every((n) => done[n]);
  const next = () => router.push(hasPin ? "/lock-intro" : "/pin-intro");

  return (
    <OnboardingShell
      icon="checklist"
      title="Almost there…"
      subtitle="Just a few things before we connect you to the world, financially."
      footer={
        <>
          <Button title="Continue" disabled={!phone} onPress={next} />
          {phone && !allDone && <Button title="I'll finish this later" variant="tertiary" onPress={next} />}
          {world && WORLDS[world].note && (
            <Text variant="caption" tone="muted" align="center">
              {WORLDS[world].note}
            </Text>
          )}
        </>
      }
    >
      <View style={{ borderRadius: radius.group, borderCurve: "continuous", overflow: "hidden", backgroundColor: c.surface }}>
        {needs.map((n, i) => (
          <View key={n}>
            {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: 66 }} />}
            {/* phone first; the rest unlock once it's verified */}
            <Row need={n} done={done[n]} enabled={n === "phone" || phone} />
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}
