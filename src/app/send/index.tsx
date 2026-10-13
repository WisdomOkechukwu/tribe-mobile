import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { Avatar } from "@/components/avatar";
import { CoinIcon } from "@/components/coin-icon";
import { FlowScreen } from "@/components/flow-screen";
import { ListRow, ListSection, RowIcon } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { assetByCode } from "@/data/assets";
import { sendToBeneficiary } from "@/screens/send/shared";
import { useBeneficiariesStore } from "@/stores/use-beneficiaries-store";
import { useSendDraft, type SendScope } from "@/stores/use-send-draft";
import { radius, spacing, useColors } from "@/theme";

/**
 * Send (Send boards' first sheet): choose the currency your recipient will receive —
 * Naira, a global currency, or crypto — or tap someone you've paid before.
 */
export default function SendStart() {
  const c = useColors();
  const params = useLocalSearchParams<{ code?: string }>();
  const start = useSendDraft((s) => s.start);
  const saved = useBeneficiariesStore((s) => s.items).slice(0, 6);

  // /send?code=X (from an asset's page) skips the choice
  useEffect(() => {
    if (!params.code) return;
    const a = assetByCode(params.code);
    start({ scope: a.kind === "crypto" ? "crypto" : a.code === "NGN" ? "local" : "global", asset: a.code });
    router.push("/send/recipient");
  }, [params.code, start]);

  const go = (scope: SendScope) => {
    if (scope === "local") {
      start({ scope, asset: "NGN", country: "NG" });
      router.push("/send/recipient");
    } else router.push(scope === "global" ? "/send/global" : "/send/crypto");
  };

  return (
    <FlowScreen title="Send">
      <View style={{ gap: spacing.xs }}>
        <Text variant="title">Who&apos;s getting paid?</Text>
        <Text variant="body" tone="muted">
          Choose the currency your recipient will receive.
        </Text>
      </View>
      <ListSection>
        <ListRow leading={<RowIcon glyph="naira" bg={c.brandSoft} tint={c.brandText} size={40} />} title="Naira" subtitle="To any Nigerian bank or Tribe user" onPress={() => go("local")} chevron />
        <ListRow leading={<RowIcon glyph="globe" bg={c.brandSoft} tint={c.brandText} size={40} />} title="Global currencies" subtitle="USD, GBP, EUR and more by ACH, SWIFT, SEPA, mobile money…" onPress={() => go("global")} chevron />
        <ListRow leading={<RowIcon glyph="crypto" bg={c.brandSoft} tint={c.brandText} size={40} />} title="Cryptocurrencies" subtitle="BTC, ETH, USDT, USDC and SOL to any wallet" onPress={() => go("crypto")} chevron />
      </ListSection>

      {saved.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
            Pay again
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {saved.map((b) => (
              <PressableScale key={b.id} onPress={() => sendToBeneficiary(b)} accessibilityLabel={`Send to ${b.name}, ${b.handle}`} style={{ width: "31.5%", alignItems: "center", gap: spacing.sm, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", paddingVertical: spacing.md, paddingHorizontal: spacing.sm }}>
                <View>
                  <Avatar size={44} name={b.name} />
                  <View style={{ position: "absolute", right: -4, bottom: -4, borderRadius: 11, borderWidth: 2, borderColor: c.surface }}>
                    <CoinIcon code={b.asset} size={18} />
                  </View>
                </View>
                <Text variant="subhead" numberOfLines={1}>
                  {b.kind === "wallet" ? b.name : b.name.split(" ")[0]}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {b.handle}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>
      )}
    </FlowScreen>
  );
}
