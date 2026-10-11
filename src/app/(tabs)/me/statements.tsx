import { useState } from "react";
import { Share } from "react-native";
import { CoinIcon } from "@/components/coin-icon";
import { Icon } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { Screen } from "@/components/screen";
import { ChipRow, useChipText } from "@/components/sheet";
import { Text } from "@/components/text";
import { ASSETS_FIAT_FIRST, type AssetCode } from "@/data/assets";
import { useWalletStore } from "@/stores/use-wallet-store";
import { spacing, useColors } from "@/theme";

/** Monthly statements per account (mock list; sharing sends a summary line). */
export default function Statements() {
  const c = useColors();
  const chipText = useChipText();
  const opened = useWalletStore((s) => s.opened);
  const [code, setCode] = useState<AssetCode>("NGN");
  const a = ASSETS_FIAT_FIRST.find((x) => x.code === code)!;
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i - 1);
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  });

  return (
    <Screen>
      <ChipRow
        options={ASSETS_FIAT_FIRST.filter((x) => opened.includes(x.code)).map((x) => x.code)}
        value={code}
        onChange={setCode}
        bleed={spacing.md}
        render={(v, on) => (
          <>
            <CoinIcon code={v} size={20} />
            <Text variant="subhead" style={{ color: chipText(on) }}>
              {v}
            </Text>
          </>
        )}
      />
      <ListSection title={`${a.name} statements`} footer="Statements are PDFs your bank, embassy or landlord will accept.">
        {months.map((m) => (
          <ListRow key={m} icon="docLine" title={m} subtitle={`${a.code} account · PDF`} trailing={<Icon name="share" size={18} color={c.brandText} />} onPress={() => Share.share({ message: `Tribe ${a.code} statement — ${m}` })} />
        ))}
      </ListSection>
    </Screen>
  );
}
