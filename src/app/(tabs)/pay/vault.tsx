import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { EmptyState } from "@/components/bits";
import { BillerThumb } from "@/components/brand-tiles";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { Icon, type IconName } from "@/components/icon";
import { ListSection } from "@/components/list";
import { PrivacyGuard } from "@/components/privacy-guard";
import { Screen } from "@/components/screen";
import { Stripes } from "@/components/stripes";
import { Text } from "@/components/text";
import { TokenSlip } from "@/components/token-slip";
import { billerById } from "@/data/catalog";
import type { VaultToken } from "@/data/seed";
import { useVaultStore } from "@/stores/use-vault-store";
import { useVaultTokens } from "@/api/queries";
import { QueryError, Skeleton } from "@/components/skeletons";
import { fonts, palette, radius, spacing, useColors } from "@/theme";
import { formatAsset, relativeDate } from "@/utils/format";

const PHED = billerById("phed");
const NOTCH = 18;

/** "2h ago", "just now", "8 Oct" — lower-cased so it reads mid-sentence. */
const when = (iso: string) => {
  const r = relativeDate(iso);
  return /^\d/.test(r) ? r : r[0].toLowerCase() + r.slice(1);
};

/** A token bought this recently types itself in (once) when the Vault opens. */
const FRESH_MS = 10 * 60 * 1000;

const STEPS: { icon: IconName; label: string }[] = [
  { icon: "copy", label: "Copy" },
  { icon: "bolt", label: "Type it in" },
  { icon: "check", label: "Tick it off" },
];

/** The screen's one brand moment: what's waiting, in kWh, and the three-step routine. */
function Summary({ waiting, kwh, loadedKwh }: { waiting: number; kwh: number; loadedKwh: number }) {
  return (
    <View style={{ backgroundColor: palette.purple[900], borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", padding: spacing.mdl, gap: spacing.md }}>
      <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "38%", overflow: "hidden" }}>
        <Stripes band={12} gap={16} colors={[palette.orange[500], palette.purple[500]]} opacity={0.85} />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="overline" style={{ color: palette.orange[300] }}>
          {waiting ? `${waiting} token${waiting > 1 ? "s" : ""} to load` : "All caught up"}
        </Text>
        <Text variant="balance" style={{ color: palette.white }}>
          {(waiting ? kwh : loadedKwh).toFixed(1)}
          <Text variant="title" style={{ color: palette.purple[100] }}>
            {" "}
            kWh
          </Text>
        </Text>
        <Text variant="caption" style={{ color: palette.purple[100], maxWidth: "62%" }}>
          {waiting ? "waiting for your meter" : "loaded so far. New PHED tokens land here the moment you pay."}
        </Text>
      </View>
      {waiting > 0 && (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {STEPS.map((s, i) => (
            <View key={s.label} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: palette.purple[800], borderRadius: radius.full, paddingVertical: 7, paddingHorizontal: spacing.sm }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: palette.white, alignItems: "center", justifyContent: "center" }}>
                <Text variant="caption" style={{ color: palette.purple[900], fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 }}>
                  {i + 1}
                </Text>
              </View>
              <Text variant="caption" numberOfLines={1} style={{ color: palette.white, fontFamily: fonts.semibold, flexShrink: 1 }}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * A token still to be typed into the meter, as a prepaid ticket: who/what on top, a tear line,
 * then the token typed onto a slip (TokenSlip: Plex Mono on a ruled line, tap to copy) and
 * "I've loaded it", which files it under Loaded. Static, except a fresh token's one-time type-on.
 */
function TokenTicket({ t }: { t: VaultToken }) {
  const c = useColors();
  const toggle = useVaultStore((s) => s.toggleLoaded);
  const paidWith = t.paidWith ?? "NGN";
  const naira = `₦${t.amount.toLocaleString()}`;
  const [fresh] = useState(() => Date.now() - new Date(t.bought).getTime() < FRESH_MS);
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, padding: spacing.md }}>
        <BillerThumb biller={PHED} size={42} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {t.provider}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            Bought {when(t.bought)}
          </Text>
        </View>
        {/* what it bought, and what it cost: in the balance that paid, with the naira beside it */}
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text variant="amount" style={{ fontSize: 20, lineHeight: 24 }}>
            {t.kwh} kWh
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <CoinIcon code={paidWith} size={14} />
            <Text variant="subhead">{paidWith === "NGN" ? naira : formatAsset(t.paid ?? t.amount, paidWith)}</Text>
          </View>
          {paidWith !== "NGN" && (
            <Text variant="caption" tone="muted">
              ≈ {naira}
            </Text>
          )}
        </View>
      </View>

      {/* tear line: dashed rule with a notch cut from each edge */}
      <View style={{ height: NOTCH, justifyContent: "center" }}>
        <View style={{ marginHorizontal: NOTCH, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: c.border }} />
        <View style={{ position: "absolute", left: -NOTCH / 2, width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, backgroundColor: c.bg }} />
        <View style={{ position: "absolute", right: -NOTCH / 2, width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, backgroundColor: c.bg }} />
      </View>

      <View style={{ padding: spacing.md, paddingTop: spacing.xs, gap: spacing.smd }}>
        <TokenSlip token={t.token} rows={[["Meter", t.meter]]} typeOn={fresh} />

        <Pressable onPress={() => toggle(t.id)} accessibilityRole="button" accessibilityLabel={`Mark ${t.kwh} kWh token as loaded`}>
          {({ pressed }) => (
            <View style={{ height: 48, borderRadius: radius.full, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm, backgroundColor: c.brand, opacity: pressed ? 0.85 : 1 }}>
              <Icon name="check" size={15} color={c.onBrand} weight="bold" />
              <Text variant="bodyStrong" style={{ color: c.onBrand }}>
                I&apos;ve loaded it
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/** A token already on the meter: one line with its last digits (to tell them apart) and Undo. */
function LoadedToken({ t }: { t: VaultToken }) {
  const c = useColors();
  const toggle = useVaultStore((s) => s.toggleLoaded);
  const last4 = t.token.replace(/\s/g, "").slice(-4);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, paddingVertical: spacing.smd, minHeight: 64 }}>
      <View>
        <BillerThumb biller={PHED} size={40} />
        <View style={{ position: "absolute", right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, backgroundColor: c.success, borderWidth: 2, borderColor: c.surface, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={9} color={c.onBrand} weight="bold" />
        </View>
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {t.kwh} kWh · •••• {last4}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          Meter {t.meter} · loaded {when(t.loadedOn!)}
        </Text>
      </View>
      <Pressable onPress={() => toggle(t.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Undo: mark ${t.kwh} kWh token as not loaded`}>
        {({ pressed }) => (
          <View style={{ backgroundColor: pressed ? c.border : c.surfaceAlt, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 6 }}>
            <Text variant="subhead">Undo</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

/**
 * Every electricity token, saved. Oldest first (load them in order), each as a ticket you copy,
 * type in and tick off; ticked tokens move to Loaded with Undo. Tokens filed with "I'm loading it
 * now" on the result card land straight in Loaded. Deliberately static: no layout/press animation,
 * no filter tabs (it mirrors the landing page's vault). The one exception is a fresh token's
 * one-time type-on (TokenSlip).
 */
export default function Vault() {
  const c = useColors();
  const query = useVaultTokens();
  const tokens = query.data ?? [];
  const waiting = tokens.filter((t) => !t.loadedOn).sort((a, b) => a.bought.localeCompare(b.bought));
  const loaded = tokens.filter((t) => !!t.loadedOn).sort((a, b) => b.loadedOn!.localeCompare(a.loadedOn!));
  const kwh = waiting.reduce((s, t) => s + t.kwh, 0);
  const loadedKwh = loaded.reduce((s, t) => s + t.kwh, 0);
  const buy = () => router.push({ pathname: "/bill/[id]", params: { id: PHED.id } });

  // static like the rest of the vault: plain blocks where the summary and tickets go
  if (!query.data) {
    return (
      <Screen>
        {query.isError ? (
          <QueryError onRetry={() => query.refetch()} />
        ) : (
          <>
            <Skeleton width="100%" height={120} radius={radius.card} />
            <Skeleton width={90} height={18} />
            <Skeleton width="100%" height={150} radius={radius.card} />
            <Skeleton width="100%" height={150} radius={radius.card} />
          </>
        )}
      </Screen>
    );
  }

  if (!tokens.length) {
    return (
      <Screen>
        <EmptyState icon="vault" title="No tokens yet" body="Buy PHED electricity and every token is saved here, so you never lose one." action={<Button title="Buy electricity" icon="bolt" inline onPress={buy} />} />
      </Screen>
    );
  }

  return (
    <Screen>
      <PrivacyGuard />
      <Summary waiting={waiting.length} kwh={kwh} loadedKwh={loadedKwh} />

      {waiting.length > 0 && (
        <View style={{ gap: spacing.smd }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: spacing.xs }}>
            <Text variant="headline">To load</Text>
            <Text variant="caption" tone="muted">
              Oldest first
            </Text>
          </View>
          {waiting.map((t, i) => (
            <TokenTicket key={t.id} t={t} />
          ))}
        </View>
      )}

      {loaded.length > 0 && (
        <ListSection title="Loaded">
          {loaded.map((t) => (
            <LoadedToken key={t.id} t={t} />
          ))}
        </ListSection>
      )}

      <Pressable onPress={buy} accessibilityRole="button" accessibilityLabel="Buy electricity">
        {({ pressed }) => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: pressed ? c.surfaceAlt : c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="bolt" size={19} color={c.brandText} />
            </View>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="bodyStrong">Running low?</Text>
              <Text variant="caption" tone="muted">
                Buy PHED units. The token lands here instantly.
              </Text>
            </View>
            <Icon name="chevron" size={13} color={c.textSubtle} />
          </View>
        )}
      </Pressable>
    </Screen>
  );
}
