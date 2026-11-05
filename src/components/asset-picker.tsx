import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { ASSETS_FIAT_FIRST, type AssetCode } from "@/data/assets";
import { overlay } from "@/stores/use-overlay-store";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { toast } from "@/stores/use-ui-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";
import { guardWalletOpen, useWalletsUnlocked } from "@/utils/verification";
import { CoinIcon } from "./coin-icon";
import { Field } from "./field";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Segmented } from "./segmented";
import { Text } from "./text";

type Tab = "all" | "crypto" | "fiat";
const POPULAR: AssetCode[] = ["BTC", "USDT", "ETH", "USD", "GBP"];

export type PickerOptions = {
  title?: string;
  value?: AssetCode;
  /** hide these codes (e.g. the asset on the other side when that's not allowed) */
  exclude?: AssetCode[];
  /** limit to one kind */
  only?: "crypto" | "fiat";
  /** show the "How to swap assets" tip */
  tip?: { id: string; title: string; points: string[] };
  onSelect: (code: AssetCode) => void;
};

function Picker({ o, close }: { o: PickerOptions; close: (after?: () => void) => void }) {
  const c = useColors();
  const balances = useWalletStore((s) => s.balances);
  const opened = useWalletStore((s) => s.opened);
  const openAccount = useWalletStore((s) => s.openAccount);
  const dismissed = usePrefsStore((s) => s.dismissedPromos);
  const dismiss = usePrefsStore((s) => s.dismissPromo);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>(o.only ?? "all");
  const [more, setMore] = useState(false);
  const term = q.trim().toLowerCase();
  const list = ASSETS_FIAT_FIRST.filter((a) => !o.exclude?.includes(a.code))
    .filter((a) => (tab === "all" ? true : a.kind === tab))
    .filter((a) => !term || a.code.toLowerCase().includes(term) || a.name.toLowerCase().includes(term));
  const showTip = o.tip && !dismissed.includes(o.tip.id);

  const unlocked = useWalletsUnlocked();
  const choose = (code: AssetCode) => {
    Haptics.selectionAsync().catch(() => {});
    // creating a wallet needs full verification — explain what's left instead
    if (!opened.includes(code) && !unlocked) return close(() => guardWalletOpen(() => {}));
    if (!opened.includes(code)) {
      openAccount(code);
      toast(`${code} wallet created`, "success");
    }
    close(() => o.onSelect(code));
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.sm, gap: spacing.md }}>
      <Field value={q} onChangeText={setQ} placeholder="Search by asset" autoCapitalize="none" leading={<Icon name="search" size={16} color={c.textMuted} />} returnKeyType="search" />

      {showTip && o.tip && (
        <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Icon name="info" size={15} color={c.brandText} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {o.tip.title}
            </Text>
            <PressableScale onPress={() => dismiss(o.tip!.id)} hitSlop={10} accessibilityLabel="Dismiss tip">
              <Icon name="close" size={12} color={c.textMuted} weight="bold" />
            </PressableScale>
          </View>
          {more ? (
            o.tip.points.map((p) => (
              <View key={p} style={{ flexDirection: "row", gap: spacing.sm }}>
                <Text variant="caption" tone="muted">
                  •
                </Text>
                <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                  {p}
                </Text>
              </View>
            ))
          ) : (
            <PressableScale onPress={() => setMore(true)} hitSlop={8} accessibilityRole="button" style={{ alignSelf: "flex-start" }}>
              <Text variant="subhead" tone="brand">
                Learn more
              </Text>
            </PressableScale>
          )}
        </View>
      )}

      {!term && !o.only && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="subhead" tone="muted">
            Popular
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {POPULAR.filter((code) => !o.exclude?.includes(code)).map((code) => {
              const on = code === o.value;
              return (
                <PressableScale key={code} onPress={() => choose(code)} accessibilityLabel={`Pick ${code}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6, paddingLeft: 6, paddingRight: spacing.smd, borderRadius: radius.full, backgroundColor: on ? c.brandSoft : c.surface, borderWidth: 1, borderColor: on ? c.brand : "transparent" }}>
                  <CoinIcon code={code} size={22} />
                  <Text variant="subhead">{code}</Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      )}

      {!o.only && (
        <Segmented<Tab>
          options={[
            { value: "all", label: "All assets" },
            { value: "crypto", label: "Crypto" },
            { value: "fiat", label: "Fiat" },
          ]}
          value={tab}
          onChange={setTab}
        />
      )}

      <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", overflow: "hidden" }}>
        {list.length === 0 && (
          <Text variant="body" tone="muted" align="center" style={{ padding: spacing.lg }}>
            No asset matches “{q}”.
          </Text>
        )}
        {list.map((a, i) => {
          const has = opened.includes(a.code);
          const on = a.code === o.value;
          return (
            <Pressable key={a.code} onPress={() => choose(a.code)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${a.name}${has ? `, balance ${formatAsset(balances[a.code], a.code)}` : ", not created yet"}`}>
              {({ pressed }) => (
                <View>
                  {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: 66 }} />}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, minHeight: 60, backgroundColor: pressed ? c.surfaceAlt : on ? c.brandSoft : "transparent" }}>
                    <CoinIcon code={a.code} size={38} />
                    <View style={{ flex: 1, gap: spacing.xxs }}>
                      <Text variant="bodyStrong">{a.code}</Text>
                      <Text variant="caption" tone="muted">
                        {a.name}
                      </Text>
                    </View>
                    {has ? (
                      <Text variant="subhead" tone="muted">
                        {formatAsset(balances[a.code], a.code)}
                      </Text>
                    ) : (
                      <Text variant="subhead" tone={unlocked ? "brand" : "muted"}>
                        {unlocked ? "Tap to create" : "Verify to create"}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

/**
 * Select asset (Swap.png): search, popular chips, All / Crypto / Fiat, balances — and wallets you
 * don't have yet show "Tap to create", which opens them on the spot.
 */
export function openAssetPicker(o: PickerOptions) {
  overlay.sheet({ title: o.title ?? "Select asset", content: (close) => <Picker o={o} close={close} /> });
}

export const SWAP_TIP = {
  id: "swap-tip",
  title: "How to swap assets",
  points: [
    "Pick what you pay with and what you want. Any asset to any asset: crypto, Naira, dollars, pounds or euros.",
    "Your rate is held for 30 seconds, then refreshes. The fee is 0.5% of what you pay.",
    "Swaps land in your wallet instantly and can't be reversed.",
  ],
};
