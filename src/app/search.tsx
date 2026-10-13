import { router, type Href } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { EmptyState } from "@/components/bits";
import { CoinIcon } from "@/components/coin-icon";
import { Field } from "@/components/field";
import { FlowScreen } from "@/components/flow-screen";
import { Icon, type IconName } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { TransactionGroup } from "@/components/transaction-row";
import { ASSETS } from "@/data/assets";
import { BILLERS, GIFT_BRANDS } from "@/data/catalog";
import { openAddMoneySheet } from "@/screens/home/sheets";
import { useWalletStore } from "@/stores/use-wallet-store";
import { spacing, useColors } from "@/theme";
import { guardWalletOpen, openCardCreation } from "@/utils/verification";

const ACTIONS: { title: string; keywords: string; icon: IconName; href?: Href; run?: () => void }[] = [
  { title: "Send money", keywords: "send transfer pay tag bank", icon: "send", href: "/send" },
  { title: "Swap currencies", keywords: "swap convert exchange", icon: "swap", href: "/swap" },
  { title: "Add money", keywords: "add deposit fund top up", icon: "add", run: openAddMoneySheet },
  { title: "Recurring bills", keywords: "recurring auto renew schedule subscription bills", icon: "repeat", href: "/pay/recurring" },
  { title: "Scan to pay", keywords: "scan qr camera pay", icon: "scan", href: "/scan" },
  { title: "Generate a Cashpoint", keywords: "cashpoint code cash 12 digit", icon: "cashpoint", href: "/cashpoint" },
  { title: "Redeem a Cashpoint", keywords: "cashpoint redeem code", icon: "cashpoint", href: { pathname: "/cashpoint", params: { mode: "redeem" } } },
  { title: "Get a virtual card", keywords: "card virtual dollar new create", icon: "card", run: openCardCreation },
  { title: "Open a new currency", keywords: "currency account open new gbp eur kes ghs cad", icon: "globe", run: () => guardWalletOpen(() => router.push("/add-currency")) },
  { title: "Token Vault", keywords: "token vault electricity light phed meter", icon: "vault", href: "/pay/vault" },
  { title: "Invite friends", keywords: "invite referral friends reward", icon: "people", href: "/me/invite" },
  { title: "Change PIN", keywords: "pin security password change", icon: "key", href: "/me/change-pin" },
  { title: "Your QR code", keywords: "qr scan tag code", icon: "qr", href: "/me/qr" },
];

/** Search across assets, actions, billers, gift cards and transactions. */
export default function Search() {
  const c = useColors();
  const [q, setQ] = useState("");
  const transactions = useWalletStore((s) => s.transactions);
  const term = q.trim().toLowerCase();
  const has = (s: string) => s.toLowerCase().includes(term);
  const go = (href?: Href, run?: () => void) => {
    router.back();
    if (href) router.push(href, { withAnchor: true });
    else if (run) setTimeout(run, 250);
  };

  const assets = term ? ASSETS.filter((a) => has(a.name) || has(a.code)) : [];
  const actions = term ? ACTIONS.filter((a) => has(a.title) || a.keywords.includes(term)) : ACTIONS.slice(0, 5);
  const billers = term ? BILLERS.filter((b) => has(b.name)) : [];
  const gifts = term ? GIFT_BRANDS.filter((g) => has(g.name)) : [];
  const txs = term ? transactions.filter((t) => has(t.title) || has(t.subtitle)).slice(0, 6) : [];
  const nothing = term && !assets.length && !actions.length && !billers.length && !gifts.length && !txs.length;

  return (
    <FlowScreen title="Search">
      <Field value={q} onChangeText={setQ} placeholder="Assets, people, bills, actions" autoFocus returnKeyType="search" clearButtonMode="while-editing" leading={<Icon name="search" size={17} color={c.textSubtle} />} />
      {nothing ? (
        <EmptyState icon="search" title="No results" body={`Nothing matches "${q}". Try a currency, a biller or a name.`} />
      ) : (
        <View style={{ gap: spacing.lg }}>
          {assets.length > 0 && (
            <ListSection title="Assets">
              {assets.map((a) => (
                <ListRow key={a.code} leading={<CoinIcon code={a.code} size={38} />} title={a.name} subtitle={a.code} onPress={() => go({ pathname: "/asset/[code]", params: { code: a.code } })} />
              ))}
            </ListSection>
          )}
          {actions.length > 0 && (
            <ListSection title={term ? "Actions" : "Quick actions"}>
              {actions.map((a) => (
                <ListRow key={a.title} icon={a.icon} iconBg={c.brandSoft} iconTint={c.brandText} title={a.title} onPress={() => go(a.href, a.run)} />
              ))}
            </ListSection>
          )}
          {(billers.length > 0 || gifts.length > 0) && (
            <ListSection title="Pay">
              {billers.map((b) => (
                <ListRow key={b.id} icon="bolt" iconBg={c.warningSoft} title={`Pay ${b.name}`} onPress={() => go({ pathname: "/bill/[id]", params: { id: b.id } })} />
              ))}
              {gifts.map((g) => (
                <ListRow key={g.id} icon="gift" iconBg={c.brandSoft} iconTint={c.brandText} title={`${g.name} gift card`} onPress={() => go({ pathname: "/gift/[id]", params: { id: g.id } })} />
              ))}
            </ListSection>
          )}
          {txs.length > 0 && <TransactionGroup items={txs} />}
        </View>
      )}
    </FlowScreen>
  );
}
