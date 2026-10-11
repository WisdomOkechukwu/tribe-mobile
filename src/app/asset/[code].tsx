import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { CopyField, EmptyState, SectionHeader } from "@/components/bits";
import { Button } from "@/components/button";
import { CircleAction, CircleActionRow } from "@/components/circle-action";
import { CoinIcon } from "@/components/coin-icon";
import { Icon, type IconName } from "@/components/icon";
import { ListSection, RowIcon, SectionLink } from "@/components/list";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { TransactionList } from "@/components/transaction-row";
import { assetByCode, type Asset } from "@/data/assets";
import { guideSteps, type GuideKind } from "@/data/guides";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset, formatMoney, toDisplay } from "@/utils/format";

const GUIDES: { kind: GuideKind; icon: IconName; tint: "success" | "brand" | "accent" }[] = [
  { kind: "receive", icon: "receive", tint: "success" },
  { kind: "send", icon: "send", tint: "brand" },
  { kind: "swap", icon: "swap", tint: "accent" },
];

function open(a: Asset, kind: GuideKind) {
  if (kind === "receive") router.push({ pathname: "/receive/[code]", params: { code: a.code } });
  else if (kind === "send") router.push({ pathname: "/send", params: { code: a.code } });
  else router.push({ pathname: "/swap", params: { from: a.code } });
}

/** "How it works" — one section open at a time, steps inline (no sheet), with a CTA. */
function HowItWorks({ a }: { a: Asset }) {
  const c = useColors();
  const [openKind, setOpenKind] = useState<GuideKind | null>(null);
  const tint = { success: [c.successSoft, c.success], brand: [c.brandSoft, c.brandText], accent: [c.accentSoft, c.accentText] } as const;
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader title="How it works" />
      <Animated.View layout={LinearTransition.duration(220)} style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", overflow: "hidden" }}>
        {GUIDES.map((g, i) => {
          const on = openKind === g.kind;
          const [bg, fg] = tint[g.tint];
          return (
            <View key={g.kind}>
              {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: 66 }} />}
              <Pressable onPress={() => setOpenKind(on ? null : g.kind)} accessibilityRole="button" accessibilityState={{ expanded: on }} accessibilityLabel={`How to ${g.kind} ${a.code}`}>
                {({ pressed }) => (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, minHeight: 60, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
                    <RowIcon name={g.icon} tint={fg} bg={bg} />
                    <Text variant="bodyStrong" style={{ flex: 1 }}>
                      How to {g.kind} {a.code}
                    </Text>
                    <View style={{ transform: [{ rotate: on ? "180deg" : "0deg" }] }}>
                      <Icon name="chevronDown" size={13} color={c.textSubtle} weight="bold" />
                    </View>
                  </View>
                )}
              </Pressable>
              {on && (
                <Animated.View entering={FadeIn.duration(200)} style={{ paddingLeft: 66, paddingRight: spacing.md, paddingBottom: spacing.md, gap: spacing.smd }}>
                  {guideSteps(a, g.kind).map((step, n) => (
                    <View key={step} style={{ flexDirection: "row", gap: spacing.smd }}>
                      <View style={{ alignItems: "center" }}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                          <Text variant="caption" style={{ color: fg, fontFamily: "Poppins_600SemiBold" }}>
                            {n + 1}
                          </Text>
                        </View>
                      </View>
                      <Text variant="body" tone="muted" style={{ flex: 1, paddingTop: 1 }}>
                        {step}
                      </Text>
                    </View>
                  ))}
                  <Button title={`${g.kind[0].toUpperCase()}${g.kind.slice(1)} ${a.code}`} icon={g.icon} size="md" inline onPress={() => open(a, g.kind)} style={{ marginTop: spacing.xs }} />
                </Animated.View>
              )}
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

export default function AssetDetail() {
  const c = useColors();
  const { code } = useLocalSearchParams<{ code: string }>();
  const a = assetByCode(code);
  const balance = useWalletStore((s) => s.balances[a.code]);
  const isOpen = useWalletStore((s) => s.opened.includes(a.code));
  const all = useWalletStore((s) => s.transactions);
  const display = usePrefsStore((s) => s.display);
  const hidden = usePrefsStore((s) => s.hideBalances);
  const txs = all.filter((t) => t.asset === a.code || t.toAsset === a.code);
  const crypto = a.kind === "crypto";
  const up = a.change24h >= 0;

  return (
    <>
      <Stack.Screen options={{ title: a.name }} />
      <Screen>
        <View style={{ alignItems: "center", gap: spacing.xs, paddingTop: spacing.sm }}>
          <CoinIcon code={a.code} size={64} />
          <Text variant="subhead" tone="muted" style={{ marginTop: spacing.sm }}>
            {a.name} · {a.code}
          </Text>
          <Text variant="largeTitle" adjustsFontSizeToFit numberOfLines={1} style={{ fontVariant: ["tabular-nums"] }}>
            {hidden ? "•••••" : formatAsset(balance, a.code)}
          </Text>
          {!hidden && (crypto || a.code !== display) && (
            <Text variant="subhead" tone="muted">
              ≈ {formatMoney(toDisplay(balance, a.code, display), display)}
            </Text>
          )}
          {crypto && (
            <Text variant="subhead" style={{ color: up ? c.success : c.danger }}>
              1 {a.code} = {formatMoney(toDisplay(1, a.code, display), display)} · {up ? "+" : ""}
              {a.change24h.toFixed(1)}% today
            </Text>
          )}
        </View>

        {isOpen ? (
          <CircleActionRow>
            <CircleAction icon="receive" label="Receive" onPress={() => open(a, "receive")} />
            <CircleAction icon="send" label="Send" onPress={() => open(a, "send")} />
            <CircleAction icon="swap" label="Swap" primary onPress={() => open(a, "swap")} />
          </CircleActionRow>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Button title={`Open a ${a.code} account`} icon="plusCircle" onPress={() => router.push({ pathname: "/add-currency/[code]", params: { code: a.code } })} />
            <Text variant="caption" tone="muted" align="center">
              Free to open. Get local {a.name} details in minutes.
            </Text>
          </View>
        )}

        {!crypto && isOpen && a.account && (
          <ListSection title="Account details" action={<SectionLink label="Share" onPress={() => open(a, "receive")} />} inset={spacing.md}>
            {a.account.fields.slice(0, 2).map((f) => (
              <CopyField key={f.label} label={f.label} value={f.value} />
            ))}
          </ListSection>
        )}

        <HowItWorks a={a} />

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Activity" />
          {txs.length ? <TransactionList items={txs} /> : <EmptyState icon="history" title={`No ${a.code} activity yet`} body={`Receive or swap into ${a.name} and it'll show up here.`} />}
        </View>
      </Screen>
    </>
  );
}
