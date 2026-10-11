import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Note } from "@/components/bits";
import { NetworkMark } from "@/components/card-face";
import { FlowScreen } from "@/components/flow-screen";
import { ListRow, ListSection } from "@/components/list";
import type { CardNetwork, CardTheme } from "@/data/seed";
import { useSessionStore } from "@/stores/use-session-store";
import { useColors } from "@/theme";

const TYPES: { network: CardNetwork; title: string; body: string }[] = [
  { network: "mastercard", title: "Mastercard", body: "Globally accepted and best for shopping & subscriptions." },
  { network: "visa", title: "Visa card", body: "Globally accepted and best for travel & everyday spending." },
];

/** New card · 2: Mastercard or Visa. Tier 2 is checked here, inline. */
export default function CardType() {
  const c = useColors();
  const { theme = "midnight" } = useLocalSearchParams<{ theme?: CardTheme }>();
  const tier = useSessionStore((s) => s.kycTier);
  const pick = (network: CardNetwork) => router.push({ pathname: tier >= 2 ? "/card-new/details" : "/card-new/verify", params: { theme, network } });

  return (
    <FlowScreen title="Select card type" step="Step 2 of 3" cancel="back">
      <ListSection title="Cards available to you">
        {TYPES.map((t) => (
          <ListRow
            key={t.network}
            leading={
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                <NetworkMark network={t.network} color={c.text} size={24} />
              </View>
            }
            title={t.title}
            subtitle={t.body}
            onPress={() => pick(t.network)}
          />
        ))}
      </ListSection>
      {tier < 2 && <Note icon="shield">Cards need Tier 2 verification (NIN + a quick selfie). It takes about two minutes, right after you choose.</Note>}
    </FlowScreen>
  );
}
