import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useAccounts } from "@/api/queries";
import type { Asset } from "@/data/assets";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { spacing, useColors } from "@/theme";
import { formatAsset, formatMoney, toDisplay } from "@/utils/format";
import { useRatesVersion } from "@/api/live-rates";
import { changeToday, hasRates, rateReady } from "@/utils/rates";
import { CoinIcon } from "./coin-icon";
import { Skeleton } from "./skeletons";
import { Text } from "./text";

/** Wallet/Home asset row: coin/flag · name + price & 24h change · value + units. */
export function AssetRow({ a, onPress }: { a: Asset; onPress?: () => void }) {
  const c = useColors();
  const bal = useAccounts().data?.balances[a.code] ?? 0;
  const display = usePrefsStore((s) => s.display);
  const hidden = usePrefsStore((s) => s.hideBalances);
  const v = useRatesVersion();
  // no server rate yet: the value waits (skeleton) and the price / change stay hidden
  const priced = rateReady(a.code, v) && hasRates(v);
  const change = changeToday(a.code, v);
  const up = (change ?? 0) >= 0;
  const crypto = a.kind === "crypto";
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        if (onPress) onPress();
        else router.push({ pathname: "/asset/[code]", params: { code: a.code } });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${a.name}, ${hidden ? "hidden" : formatAsset(bal, a.code)}`}
    >
      {({ pressed }) => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, paddingVertical: spacing.smd, minHeight: 64, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
          <CoinIcon code={a.code} size={40} />
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {a.name}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {crypto ? formatMoney(toDisplay(1, a.code, display, v), display) : a.code}
              {crypto && change !== undefined && (
                <Text variant="caption" style={{ color: up ? c.success : c.danger }}>
                  {`  ${up ? "+" : ""}${change.toFixed(1)}%`}
                </Text>
              )}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: spacing.xxs, minWidth: 92 }}>
            {hidden || priced ? (
              <Text variant="amount" numberOfLines={1}>
                {hidden ? "•••••" : formatMoney(toDisplay(bal, a.code, display, v), display)}
              </Text>
            ) : (
              <Skeleton width={72} height={16} style={{ marginVertical: 2 }} />
            )}
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {hidden ? "•••" : formatAsset(bal, a.code)}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
