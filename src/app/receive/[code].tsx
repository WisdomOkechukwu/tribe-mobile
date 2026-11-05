import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import { Pressable, Share, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { copyToClipboard, CopyField, Note } from "@/components/bits";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { Dropdown } from "@/components/dropdown";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { RowIcon, ListSection } from "@/components/list";
import { Text } from "@/components/text";
import { assetByCode, ASSETS_FIAT_FIRST, DEPOSIT_ADDRESSES, railsFor, type AssetCode } from "@/data/assets";
import { overlay } from "@/stores/use-overlay-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { palette, radius, spacing, useColors } from "@/theme";

/**
 * Receive: pick the currency, then how it's coming in — the network for crypto, the payment rail
 * for fiat (ACH / wire / SWIFT, Faster Payments / BACS, SEPA / SEPA Instant…) — and share the
 * details for exactly that rail.
 */
export default function Receive() {
  const c = useColors();
  const params = useLocalSearchParams<{ code: string }>();
  const tag = useSessionStore((s) => s.user.tag);
  const opened = useWalletStore((s) => s.opened);
  const [code, setCode] = useState<AssetCode>(assetByCode(params.code).code);
  const a = assetByCode(code);
  const [network, setNetwork] = useState(a.networks?.[0]?.id ?? "");
  const net = a.networks?.find((n) => n.id === network) ?? a.networks?.[0];
  const address = net ? (DEPOSIT_ADDRESSES[`${a.code}:${net.id}`] ?? "") : "";
  const crypto = a.kind === "crypto";
  const rails = railsFor(a);
  const [railId, setRailId] = useState(rails[0]?.id ?? "");
  const rail = rails.find((r) => r.id === railId) ?? rails[0];

  const pickCurrency = () =>
    overlay.select({
      title: "Receive",
      subtitle: "Which currency is coming in?",
      value: code,
      options: ASSETS_FIAT_FIRST.filter((x) => opened.includes(x.code)).map((x) => ({
        value: x.code,
        label: x.name,
        sub: x.kind === "crypto" ? `${x.code} · wallet address` : `${x.code} · ${railsFor(x).map((r) => r.name).join(", ")}`,
        leading: <CoinIcon code={x.code} size={36} />,
      })),
      onSelect: (v) => {
        const next = assetByCode(v);
        setCode(next.code);
        setNetwork(next.networks?.[0]?.id ?? "");
        setRailId(railsFor(next)[0]?.id ?? "");
      },
    });

  const pickNetwork = () =>
    overlay.select({
      title: "Network",
      subtitle: `Only send ${a.code} on the network you pick`,
      value: net?.id,
      options: (a.networks ?? []).map((n) => ({ value: n.id, label: n.name, sub: `Arrives ${n.eta.toLowerCase()}`, leading: <RowIcon name="link" tint={c.brandText} bg={c.brandSoft} /> })),
      onSelect: setNetwork,
    });

  const share = () =>
    crypto
      ? Share.share({ message: `My ${a.code} (${net?.name}) address on Tribe: ${address}` })
      : Share.share({ message: `My ${a.code} details for ${rail?.name} (Tribe)\n${(rail?.fields ?? []).map((f) => `${f.label}: ${f.value}`).join("\n")}` });

  return (
    <FlowScreen title="Receive" cancel="x" footer={<Button title={crypto ? "Share address" : "Share details"} icon="share" onPress={share} />}>
      <Dropdown label="Currency" value={a.name} sub={crypto ? `${a.code} · crypto` : `${a.code} · ${rails.length} way${rails.length > 1 ? "s" : ""} to get paid`} leading={<CoinIcon code={a.code} size={36} />} onPress={pickCurrency} />

      {crypto ? (
        <>
          <Dropdown label="Network" value={net?.name} sub={`Arrives ${net?.eta.toLowerCase()}`} leading={<RowIcon name="link" tint={c.brandText} bg={c.brandSoft} />} onPress={pickNetwork} />
          <View style={{ alignItems: "center", gap: spacing.smd, backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", paddingVertical: spacing.lg }}>
            <View style={{ padding: spacing.smd, backgroundColor: "#fff", borderRadius: radius.group }}>
              <QRCode value={address || "tribe"} size={180} color={palette.purple[900]} backgroundColor="#fff" />
              <View style={{ position: "absolute", top: "50%", left: "50%", padding: 4, backgroundColor: "#fff", borderRadius: 24, transform: [{ translateX: -22 }, { translateY: -22 }] }}>
                <CoinIcon code={a.code} size={36} />
              </View>
            </View>
            <Text variant="subhead" tone="muted">
              Scan to send {a.code} on {net?.name}
            </Text>
          </View>
          <ListSection inset={spacing.md}>
            <CopyField label={`Your ${a.code} address`} value={address} mono />
          </ListSection>
          <Note icon="warning" tone="warning">
            Only send {a.code} on {net?.name}. Another network or a different token sent to this address may be lost for good.
          </Note>
        </>
      ) : (
        <>
          {/* how it's coming in: every rail with its speed and fee, pick one */}
          <ListSection title="How it's coming in" inset={spacing.md + 22 + spacing.smd}>
            {rails.map((r) => {
              const on = r.id === rail?.id;
              const single = rails.length === 1;
              return (
                <Pressable
                  key={r.id}
                  disabled={single}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setRailId(r.id);
                  }}
                  accessibilityRole={single ? undefined : "radio"}
                  accessibilityState={single ? undefined : { selected: on }}
                  accessibilityLabel={`${r.name}, arrives ${r.eta}, ${r.fee === "Free" ? "free to receive" : r.fee}`}
                >
                  {({ pressed }) => (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, paddingVertical: spacing.smd, minHeight: 60, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
                      {single ? (
                        <Icon name="bank" size={20} color={c.text} />
                      ) : (
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 7 : 1.5, borderColor: on ? c.brand : c.borderStrong, backgroundColor: c.surface }} />
                      )}
                      <View style={{ flex: 1, gap: spacing.xxs }}>
                        <Text variant="bodyStrong">{r.name}</Text>
                        <Text variant="caption" tone="muted">
                          {r.eta}
                        </Text>
                      </View>
                      <Text variant="subhead" tone={r.fee === "Free" ? "success" : "muted"} style={{ flexShrink: 1, textAlign: "right" }} numberOfLines={2}>
                        {r.fee}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ListSection>
          {rail && (
            <ListSection inset={spacing.md} title={`${rail.name} details`}>
              {rail.fields.map((f) => (
                <CopyField key={f.label} label={f.label} value={f.value} />
              ))}
            </ListSection>
          )}
        </>
      )}

      <ListSection inset={spacing.md} footer="Tribe-to-Tribe transfers are instant and free, in any currency.">
        <CopyField label="Or share your Tribe tag" value={`@${tag}`} />
      </ListSection>
      {!crypto && <Note>Held with our licensed partner banks. Transfers usually land within minutes on working days.</Note>}
      {crypto && (
        <Button title="Copy address" variant="secondary" icon="copy" onPress={() => copyToClipboard(address, "Address copied")} />
      )}
    </FlowScreen>
  );
}
