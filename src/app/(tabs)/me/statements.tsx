import { useState } from "react";
import { Note } from "@/components/bits";
import { CoinIcon } from "@/components/coin-icon";
import { Icon } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { Screen } from "@/components/screen";
import { ChipRow, useChipText } from "@/components/sheet";
import { Text } from "@/components/text";
import { ASSETS_FIAT_FIRST, type AssetCode } from "@/data/assets";
import { overlay } from "@/stores/use-overlay-store";
import { useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { spacing, useColors } from "@/theme";

/** Monthly statements per account, emailed as PDFs to the address on the account (mock list). */
export default function Statements() {
  const c = useColors();
  const chipText = useChipText();
  const opened = useWalletStore((s) => s.opened);
  const email = useSessionStore((s) => s.account?.email ?? s.user.email);
  const [code, setCode] = useState<AssetCode>("NGN");
  const a = ASSETS_FIAT_FIRST.find((x) => x.code === code)!;
  const send = (month: string) =>
    overlay.confirm({
      icon: "envelope",
      title: `Email your ${month} statement?`,
      body: `We'll send the ${a.code} statement as a PDF to ${email}. It usually arrives within a few minutes.`,
      confirmLabel: "Send to my email",
      onConfirm: () => toast(`Statement sent to ${email}`, "success"),
    });
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
      <Note icon="envelope">Statements are sent to your email ({email}) as PDFs your bank, embassy or landlord will accept.</Note>
      <ListSection title={`${a.name} statements`} footer="Tap a month to email it to yourself.">
        {months.map((m) => (
          <ListRow key={m} icon="docLine" title={m} subtitle={`${a.code} account · PDF by email`} trailing={<Icon name="envelope" size={18} color={c.brandText} />} onPress={() => send(m)} />
        ))}
      </ListSection>
    </Screen>
  );
}
