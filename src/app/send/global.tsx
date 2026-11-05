import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { CountryFlag } from "@/components/country-flag";
import { Field } from "@/components/field";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { assetByCode } from "@/data/assets";
import { COUNTRIES, REGIONS, type Country } from "@/data/countries";
import { useBeneficiariesStore } from "@/stores/use-beneficiaries-store";
import { useSendDraft } from "@/stores/use-send-draft";
import { radius, spacing, useColors } from "@/theme";

/** The currency they'll receive, as a quiet code pill. */
function CodePill({ code }: { code: string }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs }}>
      <Text variant="subhead">{code}</Text>
    </View>
  );
}

/**
 * "Where are you sending to?" (Send - Global currencies.png): the places you've sent to lately as
 * a row of flags, then every destination grouped by region — each with its own flag and the
 * currency your recipient receives.
 */
export default function SendGlobal() {
  const c = useColors();
  const start = useSendDraft((s) => s.start);
  const beneficiaries = useBeneficiariesStore((s) => s.items);
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const all = COUNTRIES.filter((k) => k.iso !== "NG");
  const recentIsos = [...new Set(beneficiaries.map((b) => b.country).filter((x): x is string => !!x && x !== "NG"))].slice(0, 4);
  const recent = recentIsos.map((iso) => all.find((k) => k.iso === iso)).filter((k): k is Country => !!k);
  const shown = all.filter((k) => !term || k.name.toLowerCase().includes(term) || k.currency.toLowerCase().includes(term) || assetByCode(k.currency).name.toLowerCase().includes(term));
  const pick = (k: Country) => {
    start({ scope: "global", asset: k.currency, country: k.iso });
    router.push("/send/recipient");
  };

  return (
    <FlowScreen title="Global send" cancel="back">
      <View style={{ gap: spacing.xs }}>
        <Text variant="title">Where are you sending to?</Text>
        <Text variant="body" tone="muted">
          Choose the country and currency your recipient will receive.
        </Text>
      </View>
      <Field value={q} onChangeText={setQ} placeholder="Search country or currency" autoCapitalize="none" leading={<Icon name="search" size={16} color={c.textMuted} />} />

      {!term && recent.length > 0 && (
        <View style={{ gap: spacing.smd }}>
          <Text variant="headline" style={{ paddingHorizontal: spacing.xs }}>
            Recent
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} style={{ marginHorizontal: -spacing.mdl }} contentContainerStyle={{ paddingHorizontal: spacing.mdl, gap: spacing.smd }}>
            {recent.map((k) => (
              <PressableScale key={k.iso} onPress={() => pick(k)} accessibilityLabel={`Send ${k.currency} to ${k.name}`} style={{ width: 76, alignItems: "center", gap: spacing.sm }}>
                <View style={{ padding: 3, borderRadius: 32, backgroundColor: c.surface }}>
                  <CountryFlag iso={k.iso} size={52} />
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text variant="bodyStrong">{k.currency}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1} align="center" style={{ width: 76 }}>
                    {k.name}
                  </Text>
                </View>
              </PressableScale>
            ))}
          </ScrollView>
        </View>
      )}

      {REGIONS.map((region) => {
        const list = shown.filter((k) => k.region === region);
        if (!list.length) return null;
        return (
          <ListSection key={region} title={region}>
            {list.map((k) => (
              <ListRow
                key={k.iso}
                leading={<CountryFlag iso={k.iso} size={38} />}
                title={k.name}
                subtitle={assetByCode(k.currency).name}
                trailing={<CodePill code={k.currency} />}
                chevron
                accessibilityLabel={`${k.name}, receives ${assetByCode(k.currency).name}`}
                onPress={() => pick(k)}
              />
            ))}
          </ListSection>
        );
      })}
      {!shown.length && (
        <Text variant="body" tone="muted" align="center">
          We don&apos;t send to “{q.trim()}” yet.
        </Text>
      )}
    </FlowScreen>
  );
}
