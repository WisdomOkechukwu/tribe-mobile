import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { CopyField, EmptyState, SectionHeader } from "@/components/bits";
import { Button } from "@/components/button";
import { CircleAction, CircleActionRow } from "@/components/circle-action";
import { CoinIcon } from "@/components/coin-icon";
import { Icon, type IconName } from "@/components/icon";
import { ListSection, SectionLink } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { TransactionList } from "@/components/transaction-row";
import { assetByCode, type Asset } from "@/data/assets";
import { guideSteps, type GuideKind } from "@/data/guides";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { toast } from "@/stores/use-ui-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { fonts, radius, spacing, useColors } from "@/theme";
import { formatAsset, formatMoney, toDisplay } from "@/utils/format";

const GUIDES: { kind: GuideKind; label: string; icon: IconName }[] = [
  { kind: "receive", label: "Receive", icon: "receive" },
  { kind: "send", label: "Send", icon: "send" },
  { kind: "swap", label: "Swap", icon: "swap" },
];

function open(a: Asset, kind: GuideKind) {
  if (kind === "receive") router.push({ pathname: "/receive/[code]", params: { code: a.code } });
  else if (kind === "send") router.push({ pathname: "/send", params: { code: a.code } });
  else router.push({ pathname: "/swap", params: { from: a.code } });
}

/** Dismissal key per currency, kept with the other dismissed cards in prefs. */
const guideKey = (code: string) => `guide:${code}`;

/**
 * "How it works": one card with a Receive / Send / Swap switch, the steps as a numbered
 * timeline and the action itself at the bottom. Dismiss with ✕ (remembered per currency);
 * "How it works" on the Activity header brings it back. Replaces three stacked accordions.
 */
function HowItWorks({ a, canMove }: { a: Asset; canMove: boolean }) {
  const c = useColors();
  const dismiss = usePrefsStore((s) => s.dismissPromo);
  // nothing to send or swap yet → start with how to get money in
  const [kind, setKind] = useState<GuideKind>(canMove ? "swap" : "receive");
  const guide = GUIDES.find((g) => g.kind === kind)!;
  const steps = guideSteps(a, kind);
  const dot = 26;

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} layout={LinearTransition.duration(220)} style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.smd }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="overline" tone="brand">
            How it works
          </Text>
          <Text variant="headline">Getting started with {a.code}</Text>
        </View>
        <PressableScale
          onPress={() => {
            dismiss(guideKey(a.code));
            toast("Guide hidden. Tap How it works to bring it back.");
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss guide"
          style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="close" size={12} color={c.textMuted} weight="bold" />
        </PressableScale>
      </View>

      <Segmented<GuideKind> value={kind} onChange={setKind} options={GUIDES.map((g) => ({ value: g.kind, label: g.label }))} />

      <Animated.View key={kind} entering={FadeIn.duration(200)} style={{ gap: 0 }}>
        {steps.map((step, n) => {
          const last = n === steps.length - 1;
          return (
            <View key={step} style={{ flexDirection: "row", gap: spacing.smd }}>
              <View style={{ alignItems: "center", width: dot }}>
                <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
                  <Text variant="caption" tone="brand" style={{ fontFamily: fonts.semibold }}>
                    {n + 1}
                  </Text>
                </View>
                {/* timeline rail between steps */}
                {!last && <View style={{ flex: 1, width: 2, borderRadius: 1, backgroundColor: c.border, marginVertical: 4 }} />}
              </View>
              <Text variant="body" style={{ flex: 1, paddingTop: 2, paddingBottom: last ? 0 : spacing.md }}>
                {step}
              </Text>
            </View>
          );
        })}
      </Animated.View>

      <Button title={`${guide.label} ${a.code}`} icon={guide.icon} onPress={() => open(a, kind)} />
    </Animated.View>
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
  const guideHidden = usePrefsStore((s) => s.dismissedPromos.includes(guideKey(a.code)));
  const restore = usePrefsStore((s) => s.restorePromo);

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

        {!guideHidden && <HowItWorks a={a} canMove={isOpen && balance > 0} />}

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Activity" action={guideHidden ? "How it works" : undefined} onAction={() => restore(guideKey(a.code))} />
          {txs.length ? <TransactionList items={txs} /> : <EmptyState icon="history" title={`No ${a.code} activity yet`} body={`Receive or swap into ${a.name} and it'll show up here.`} />}
        </View>
      </Screen>
    </>
  );
}
