import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { TileGrid } from "@/components/bits";
import { Field } from "@/components/field";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { ASSETS, type Asset } from "@/data/assets";
import { DestinationTile } from "@/screens/send/shared";
import { useSendDraft } from "@/stores/use-send-draft";
import { useWalletStore } from "@/stores/use-wallet-store";
import { spacing, useColors } from "@/theme";

/** "Select recipient's cryptocurrency" (Send - Cryptocurrency.png). */
export default function SendCrypto() {
  const c = useColors();
  const start = useSendDraft((s) => s.start);
  const balances = useWalletStore((s) => s.balances);
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const crypto = ASSETS.filter((a) => a.kind === "crypto");
  const held = crypto.filter((a) => balances[a.code] > 0).slice(0, 3);
  const shown = crypto.filter((a) => !term || a.code.toLowerCase().includes(term) || a.name.toLowerCase().includes(term));
  const pick = (a: Asset) => {
    start({ scope: "crypto", asset: a.code });
    router.push("/send/recipient");
  };
  const grid = (list: Asset[]) => (
    <TileGrid>
      {list.map((a) => (
        <DestinationTile key={a.code} code={a.code} title={a.code} sub={a.name} onPress={() => pick(a)} />
      ))}
    </TileGrid>
  );
  return (
    <FlowScreen title="Send crypto" cancel="back">
      <View style={{ gap: spacing.xs }}>
        <Text variant="title">Which crypto are you sending?</Text>
        <Text variant="body" tone="muted">
          Choose the crypto your recipient will receive. You can pay with any balance.
        </Text>
      </View>
      <Field value={q} onChangeText={setQ} placeholder="Search cryptocurrency" autoCapitalize="none" leading={<Icon name="search" size={16} color={c.textMuted} />} />
      {!term && held.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="subhead" tone="muted">
            In your wallet
          </Text>
          {grid(held)}
        </View>
      )}
      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted">
          {term ? "Results" : "All crypto"}
        </Text>
        {grid(shown)}
      </View>
    </FlowScreen>
  );
}
