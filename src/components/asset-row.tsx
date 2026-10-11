import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import type { Asset } from "@/data/assets";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { spacing, useColors } from "@/theme";
import { formatAsset, formatMoney, toDisplay } from "@/utils/format";
import { CoinIcon } from "./coin-icon";
import { Text } from "./text";

/** Wallet/Home asset row: coin/flag · name + price & 24h change · value + units. */
export function AssetRow({ a, onPress }: { a: Asset; onPress?: () => void }) {
  const c = useColors();
  const bal = useWalletStore((s) => s.balances[a.code]);
  const display = usePrefsStore((s) => s.display);
  const hidden = usePrefsStore((s) => s.hideBalances);
  const up = a.change24h >= 0;
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
          <View style={{ flex: 1, gap: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {a.name}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {crypto ? formatMoney(toDisplay(1, a.code, display), display) : a.code}
              {crypto && (
                <Text variant="caption" style={{ color: up ? c.success : c.danger }}>
                  {`  ${up ? "+" : ""}${a.change24h.toFixed(1)}%`}
                </Text>
              )}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 1, minWidth: 92 }}>
            <Text variant="amount" numberOfLines={1}>
              {hidden ? "•••••" : formatMoney(toDisplay(bal, a.code, display), display)}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {hidden ? "•••" : formatAsset(bal, a.code)}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
