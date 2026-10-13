import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { CoinIcon } from "@/components/coin-icon";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { assetByCode, type AssetCode } from "@/data/assets";
import { countryByIso } from "@/data/countries";
import { useBeneficiariesStore, type Beneficiary } from "@/stores/use-beneficiaries-store";
import { overlay } from "@/stores/use-overlay-store";
import { useSendDraft, type SendScope } from "@/stores/use-send-draft";
import { radius, spacing, useColors } from "@/theme";

/** Start a send to a saved beneficiary: straight to the amount. */
export function sendToBeneficiary(b: Beneficiary) {
  const scope: SendScope = b.kind === "wallet" || assetByCode(b.asset).kind === "crypto" ? "crypto" : b.asset === "NGN" ? "local" : "global";
  const d = useSendDraft.getState();
  d.start({ scope, asset: b.asset, country: b.country });
  d.setRecipient({ kind: b.kind, name: b.name, handle: b.handle, channelId: b.channelId, network: b.network, details: b.details, beneficiaryId: b.id });
  router.push("/send/amount");
}

/** "USD ✓ · United States Dollar" — what the recipient gets (top of the recipient step). */
export function AssetHeader({ code, country }: { code: AssetCode; country?: string }) {
  const c = useColors();
  const a = assetByCode(code);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.smd }}>
      <CoinIcon code={code} size={40} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Text variant="bodyStrong">{code}</Text>
          <Icon name="checkCircle" size={13} color={c.text} />
        </View>
        <Text variant="caption" tone="muted">
          {a.name}
          {country ? ` · ${countryByIso(country).name}` : ""}
        </Text>
      </View>
    </View>
  );
}

function BeneficiaryList({ items, close, onPick }: { items: Beneficiary[]; close: (after?: () => void) => void; onPick: (b: Beneficiary) => void }) {
  const c = useColors();
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const list = items.filter((b) => !term || b.name.toLowerCase().includes(term) || b.handle.toLowerCase().includes(term));
  return (
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.sm, gap: spacing.md }}>
      <Field value={q} onChangeText={setQ} placeholder="Search beneficiaries" autoCapitalize="none" leading={<Icon name="search" size={16} color={c.textMuted} />} />
      <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", overflow: "hidden" }}>
        {list.length === 0 && (
          <Text variant="body" tone="muted" align="center" style={{ padding: spacing.lg }}>
            {items.length ? "No one matches that." : "No saved beneficiaries for this yet. Tick “Save to beneficiaries” after you send."}
          </Text>
        )}
        {list.map((b, i) => (
          <Pressable key={b.id} onPress={() => close(() => onPick(b))} accessibilityRole="button" accessibilityLabel={`${b.name}, ${b.handle}`}>
            {({ pressed }) => (
              <View>
                {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: 66 }} />}
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, minHeight: 60, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
                  <Avatar size={38} name={b.name} />
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {b.name}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {b.handle}
                    </Text>
                  </View>
                  <CoinIcon code={b.asset} size={22} />
                </View>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

/** Beneficiaries sheet (searchable), filtered to what fits this send. */
export function openBeneficiaries(filter: (b: Beneficiary) => boolean, onPick: (b: Beneficiary) => void) {
  const items = useBeneficiariesStore.getState().items.filter(filter);
  overlay.sheet({ title: "Beneficiaries", content: (close) => <BeneficiaryList items={items} close={close} onPick={onPick} /> });
}

/** Big tappable option ("Tribe user" / "External user") — selected gets the brand outline. */
export function ChoiceCard({ title, body, on, onPress }: { title: string; body: string; on: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <PressableScale onPress={onPress} accessibilityRole="radio" accessibilityLabel={title} accessibilityHint={body} accessibilityState={{ selected: on }} scaleTo={0.98} style={{ padding: spacing.md, borderRadius: radius.group, borderCurve: "continuous", backgroundColor: on ? c.brandSoft : c.surface, borderWidth: 1.5, borderColor: on ? c.brand : "transparent", gap: spacing.xs }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="bodyStrong" tone={on ? "brand" : "text"}>
          {title}
        </Text>
        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: on ? 6 : 1.5, borderColor: on ? c.brand : c.borderStrong, backgroundColor: c.surface }} />
      </View>
      <Text variant="caption" tone="muted">
        {body}
      </Text>
    </PressableScale>
  );
}

/** Country / asset tile for the destination grids. */
export function DestinationTile({ code, title, sub, onPress }: { code: AssetCode; title: string; sub: string; onPress: () => void }) {
  const c = useColors();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${title}, ${sub}`} style={{ width: "31.5%", backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.smd, gap: spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <CoinIcon code={code} size={30} />
        <Icon name="chevron" size={10} color={c.textSubtle} weight="bold" />
      </View>
      <View>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </PressableScale>
  );
}
