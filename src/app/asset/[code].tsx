import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { CopyField, EmptyState, SectionHeader } from "@/components/bits";
import { Button } from "@/components/button";
import { CircleAction, CircleActionRow } from "@/components/circle-action";
import { CoinIcon } from "@/components/coin-icon";
import { Glyph } from "@/components/glyphs";
import { Icon, type IconName } from "@/components/icon";
import { ListSection, SectionLink } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { TransactionList } from "@/components/transaction-row";
import { assetByCode, railsFor, type Asset } from "@/data/assets";
import { guideSteps, type GuideKind } from "@/data/guides";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { toast } from "@/stores/use-ui-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { fonts, palette, radius, spacing, useColors } from "@/theme";
import { formatAsset, formatMoney, toDisplay } from "@/utils/format";
import { guardWalletOpen, useWalletsUnlocked } from "@/utils/verification";

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
 * "How it works", Gen Z edition: a Receive / Send / Swap switch over three swipeable step cards
 * (big number, our own glyph, one punchy line), dots that follow the swipe, and the action
 * itself at the bottom. Dismiss with ✕ (remembered per currency); "How it works" on the
 * Activity header brings it back.
 */
function HowItWorks({ a, canMove }: { a: Asset; canMove: boolean }) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const dismiss = usePrefsStore((s) => s.dismissPromo);
  // nothing to send or swap yet → start with how to get money in
  const [kind, setKind] = useState<GuideKind>(canMove ? "swap" : "receive");
  const [page, setPage] = useState(0);
  const guide = GUIDES.find((g) => g.kind === kind)!;
  const steps = guideSteps(a, kind);
  const cardW = Math.round((width - spacing.md * 2 - spacing.md * 2) * 0.82);
  const snap = cardW + spacing.smd;
  // three looks for three steps: brand, soft, deep
  const looks = [
    { bg: c.brand, fg: c.onBrand, sub: "rgba(255,255,255,0.82)", chip: "rgba(255,255,255,0.18)" },
    { bg: c.brandSoft, fg: c.text, sub: c.textMuted, chip: c.surface },
    { bg: palette.purple[900], fg: palette.white, sub: palette.purple[100], chip: "rgba(255,255,255,0.12)" },
  ];

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} layout={LinearTransition.duration(220)} style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", paddingVertical: spacing.md, gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.smd, paddingHorizontal: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="overline" tone="brand">
            How it works
          </Text>
          <Text variant="headline">{a.code} in three taps</Text>
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

      <View style={{ paddingHorizontal: spacing.md }}>
        <Segmented<GuideKind>
          value={kind}
          onChange={(k) => {
            setKind(k);
            setPage(0);
          }}
          options={GUIDES.map((g) => ({ value: g.kind, label: g.label }))}
        />
      </View>

      <ScrollView
        key={kind}
        horizontal
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        snapToInterval={snap}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.smd }}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / snap))}
        onScrollEndDrag={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / snap))}
      >
        {steps.map((step, n) => {
          const look = looks[n % looks.length];
          return (
            <Animated.View key={step.title} entering={FadeIn.delay(n * 60).duration(220)} style={{ width: cardW, minHeight: 168, backgroundColor: look.bg, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, justifyContent: "space-between", gap: spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: look.fg, letterSpacing: -1 }}>{String(n + 1).padStart(2, "0")}</Text>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: look.chip, alignItems: "center", justifyContent: "center" }}>
                  <Glyph name={step.glyph} size={22} color={look.fg} />
                </View>
              </View>
              <View style={{ gap: spacing.xs }}>
                <Text variant="headline" style={{ color: look.fg }}>
                  {step.title}
                </Text>
                <Text variant="caption" style={{ color: look.sub }}>
                  {step.body}
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.xs }}>
        {steps.map((step, n) => (
          <View key={step.title} style={{ width: n === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: n === page ? c.brand : c.border }} />
        ))}
      </View>

      <View style={{ paddingHorizontal: spacing.md }}>
        <Button title={`${guide.label} ${a.code}`} icon={guide.icon} onPress={() => open(a, kind)} />
      </View>
    </Animated.View>
  );
}

const RECENT = 20;

export default function AssetDetail() {
  const c = useColors();
  const { code } = useLocalSearchParams<{ code: string }>();
  const a = assetByCode(code);
  const balance = useWalletStore((s) => s.balances[a.code]);
  const isOpen = useWalletStore((s) => s.opened.includes(a.code));
  const unlocked = useWalletsUnlocked();
  const all = useWalletStore((s) => s.transactions);
  const display = usePrefsStore((s) => s.display);
  const hidden = usePrefsStore((s) => s.hideBalances);
  const txs = all.filter((t) => t.asset === a.code || t.toAsset === a.code);
  const crypto = a.kind === "crypto";
  const up = a.change24h >= 0;
  const guideHidden = usePrefsStore((s) => s.dismissedPromos.includes(guideKey(a.code)));
  const restore = usePrefsStore((s) => s.restorePromo);
  const seeAll = () => router.push({ pathname: "/activity", params: { asset: a.code } }, { withAnchor: true });

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
            <CircleAction glyph="incoming" label="Receive" onPress={() => open(a, "receive")} />
            <CircleAction glyph="outgoing" label="Send" onPress={() => open(a, "send")} />
            <CircleAction icon="swap" label="Swap" primary onPress={() => open(a, "swap")} />
          </CircleActionRow>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Button
              title={unlocked ? `Open a ${a.code} account` : "Verify to open"}
              icon={unlocked ? "plusCircle" : "shield"}
              onPress={() => guardWalletOpen(() => router.push({ pathname: "/add-currency/[code]", params: { code: a.code } }))}
            />
            <Text variant="caption" tone="muted" align="center">
              {unlocked ? `Free to open. Get local ${a.name} details in minutes.` : "New wallets open once you're fully verified."}
            </Text>
          </View>
        )}

        {!crypto && isOpen && a.account && (
          <ListSection title="Account details" action={<SectionLink label="Share" onPress={() => open(a, "receive")} />} inset={spacing.md} footer={`Get paid by ${railsFor(a).map((r) => r.name).join(", ").replace(/, ([^,]*)$/, " or $1")}.`}>
            {a.account.fields.slice(0, 2).map((f) => (
              <CopyField key={f.label} label={f.label} value={f.value} />
            ))}
          </ListSection>
        )}

        {!guideHidden && <HowItWorks a={a} canMove={isOpen && balance > 0} />}

        <View style={{ gap: spacing.sm }}>
          {/* a hidden guide can always come back from here; "See all" moves under the list when both apply */}
          <SectionHeader
            title="Activity"
            action={guideHidden ? "How it works" : txs.length > RECENT ? "See all" : undefined}
            onAction={() => (guideHidden ? restore(guideKey(a.code)) : seeAll())}
          />
          {/* the latest few only — the full list lives in (virtualised) History */}
          {txs.length ? <TransactionList items={txs.slice(0, RECENT)} /> : <EmptyState icon="history" title={`No ${a.code} activity yet`} body={`Receive or swap into ${a.name} and it'll show up here.`} />}
          {guideHidden && txs.length > RECENT && (
            <PressableScale onPress={seeAll} accessibilityRole="button" style={{ alignSelf: "center", paddingVertical: spacing.xs }}>
              <Text variant="subhead" tone="brand">
                See all {a.code} activity
              </Text>
            </PressableScale>
          )}
        </View>
      </Screen>
    </>
  );
}
