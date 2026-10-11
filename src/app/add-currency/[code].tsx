import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { FlowScreen } from "@/components/flow-screen";
import { Icon, type IconName } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { ChipRow, useChipText } from "@/components/sheet";
import { Text } from "@/components/text";
import { assetByCode } from "@/data/assets";
import { useInboxStore } from "@/stores/use-inbox-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { spacing, useColors } from "@/theme";

const PURPOSES = ["Getting paid", "Family & friends", "Saving", "Travel", "Business"];

/** Open a new currency · step 2: what you get, why you need it, consent → opened. */
export default function OpenCurrency() {
  const c = useColors();
  const chipText = useChipText();
  const { code } = useLocalSearchParams<{ code: string }>();
  const a = assetByCode(code);
  const openAccount = useWalletStore((s) => s.openAccount);
  const isOpen = useWalletStore((s) => s.opened.includes(a.code));
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [agreed, setAgreed] = useState(false);
  const [working, setWorking] = useState(false);
  const fiat = a.kind === "fiat";

  const perks: { icon: IconName; title: string; body: string }[] = fiat
    ? [
        { icon: "bank", title: "Your own account details", body: a.account?.fields.map((f) => f.label).join(" · ") ?? "Local details" },
        { icon: "receive", title: `Get paid in ${a.code}`, body: "From employers, clients, family and platforms." },
        { icon: "swap", title: "Swap any time", body: `Move between ${a.code}, Naira and crypto at one clear rate.` },
      ]
    : [
        { icon: "qr", title: `Your ${a.code} address`, body: `On ${a.networks?.map((n) => n.name).join(", ")}.` },
        { icon: "chart", title: "Live price & charts", body: "Track it next to the rest of your money." },
        { icon: "swap", title: "Swap any time", body: "Into Naira, dollars or other crypto." },
      ];

  const open = () => {
    setWorking(true);
    // Demo: a real build calls the partner bank / custody API here.
    setTimeout(() => {
      openAccount(a.code);
      useInboxStore.getState().push({ kind: "money", title: `${a.code} account open`, body: `Your ${a.name} ${fiat ? "account details are" : "address is"} ready to share.`, href: `/asset/${a.code}`, asset: a.code });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace({ pathname: "/add-currency/done", params: { code: a.code } });
    }, 1100);
  };

  return (
    <FlowScreen
      title={`Open ${a.code}`}
      cancel="back"
      footer={
        isOpen ? (
          <Button
            title={`Go to ${a.code}`}
            onPress={() => {
              if (router.canDismiss()) router.dismissAll();
              router.back();
              router.push({ pathname: "/asset/[code]", params: { code: a.code } });
            }}
          />
        ) : (
          <Button title={working ? "Setting up your account…" : `Open ${a.code} account`} loading={working} disabled={!agreed} onPress={open} />
        )
      }
    >
      <View style={{ alignItems: "center", gap: spacing.sm, paddingTop: spacing.sm }}>
        <CoinIcon code={a.code} size={72} />
        <Text variant="title" align="center">
          {a.name}
        </Text>
        <Text variant="body" tone="muted" align="center">
          {fiat ? "Free to open. Free to hold." : "Free to add. Network fees apply when you send."}
        </Text>
      </View>

      <ListSection title="What you get">
        {perks.map((p) => (
          <ListRow key={p.title} icon={p.icon} iconBg={c.brandSoft} iconTint={c.brandText} title={p.title} subtitle={p.body} />
        ))}
      </ListSection>

      {fiat && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
            What&apos;s it mainly for?
          </Text>
          <ChipRow
            options={PURPOSES}
            value={purpose}
            onChange={setPurpose}
            bleed={spacing.mdl}
            render={(p, on) => (
              <Text variant="subhead" style={{ color: chipText(on) }}>
                {p}
              </Text>
            )}
          />
        </View>
      )}

      {!isOpen && (
        <PressableScale scaleTo={0.98} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => setAgreed((v) => !v)} style={{ flexDirection: "row", gap: spacing.smd, alignItems: "flex-start", paddingHorizontal: spacing.xs }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: agreed ? c.brand : c.borderStrong, backgroundColor: agreed ? c.brand : "transparent", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
            {agreed && <Icon name="check" size={13} color="#fff" weight="bold" />}
          </View>
          <Text variant="caption" tone="muted" style={{ flex: 1 }}>
            {fiat ? `I agree to the ${a.account?.fields.find((f) => /bank/i.test(f.label))?.value ?? "partner bank"} account terms and confirm the money is mine.` : `I understand crypto prices move and ${a.code} sent on the wrong network can't be recovered.`}
          </Text>
        </PressableScale>
      )}
    </FlowScreen>
  );
}
