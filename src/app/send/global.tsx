import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Field } from "@/components/field";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { COUNTRIES, type Country } from "@/data/countries";
import { DestinationTile } from "@/screens/send/shared";
import { useBeneficiariesStore } from "@/stores/use-beneficiaries-store";
import { useSendDraft } from "@/stores/use-send-draft";
import { spacing, useColors } from "@/theme";

/** "Where are you sending to?" (Send - Global currencies.png): recent and all destinations. */
export default function SendGlobal() {
  const c = useColors();
  const start = useSendDraft((s) => s.start);
  const beneficiaries = useBeneficiariesStore((s) => s.items);
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const all = COUNTRIES.filter((k) => k.iso !== "NG");
  const recentIsos = [...new Set(beneficiaries.map((b) => b.country).filter((x): x is string => !!x && x !== "NG"))].slice(0, 3);
  const recent = recentIsos.map((iso) => all.find((k) => k.iso === iso)).filter((k): k is Country => !!k);
  const shown = all.filter((k) => !term || k.name.toLowerCase().includes(term) || k.currency.toLowerCase().includes(term));
  const pick = (k: Country) => {
    start({ scope: "global", asset: k.currency, country: k.iso });
    router.push("/send/recipient");
  };
  const grid = (list: Country[]) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {list.map((k) => (
        <DestinationTile key={k.iso} code={k.flag} title={k.currency} sub={k.name} onPress={() => pick(k)} />
      ))}
    </View>
  );

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
        <View style={{ gap: spacing.sm }}>
          <Text variant="subhead" tone="muted">
            Recent destinations
          </Text>
          {grid(recent)}
        </View>
      )}
      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted">
          {term ? "Results" : "Available destinations"}
        </Text>
        {shown.length ? grid(shown) : <Text variant="body" tone="muted">We don&apos;t send to “{q}” yet.</Text>}
      </View>
    </FlowScreen>
  );
}
