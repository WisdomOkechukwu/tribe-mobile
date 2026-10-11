import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AssetRow } from "@/components/asset-row";
import { EmptyState } from "@/components/bits";
import { CoinIcon } from "@/components/coin-icon";
import { Field } from "@/components/field";
import { Icon } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { ASSETS, NGN_PER_USD } from "@/data/assets";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { portfolioUsd, useWalletStore } from "@/stores/use-wallet-store";
import { spacing, useColors } from "@/theme";
import { formatMoney } from "@/utils/format";

type Kind = "fiat" | "crypto";

export default function Wallet() {
  const c = useColors();
  const [kind, setKind] = useState<Kind>("fiat");
  const [query, setQuery] = useState("");
  const balances = useWalletStore((s) => s.balances);
  const opened = useWalletStore((s) => s.opened);
  const display = usePrefsStore((s) => s.display);
  const hidden = usePrefsStore((s) => s.hideBalances);

  const q = query.trim().toLowerCase();
  const matches = (a: (typeof ASSETS)[number]) => !q || a.code.toLowerCase().startsWith(q) || a.name.toLowerCase().split(" ").some((w) => w.startsWith(q));
  const list = ASSETS.filter((a) => a.kind === kind && opened.includes(a.code) && matches(a)).sort((x, y) => balances[y.code] * y.usd - balances[x.code] * x.usd);
  const closed = ASSETS.filter((a) => a.kind === kind && !opened.includes(a.code) && matches(a));
  const total = portfolioUsd(balances);
  const kindTotal = ASSETS.filter((a) => a.kind === kind).reduce((s, a) => s + balances[a.code] * a.usd, 0);
  const show = (usd: number) => (hidden ? "•••••" : formatMoney(display === "USD" ? usd : usd * NGN_PER_USD, display));

  return (
    <Screen>
      <View style={{ gap: 2, paddingHorizontal: spacing.xs }}>
        <Text variant="subhead" tone="muted">
          Total value
        </Text>
        <Text variant="largeTitle" adjustsFontSizeToFit numberOfLines={1} style={{ fontVariant: ["tabular-nums"] }}>
          {show(total)}
        </Text>
      </View>

      <Segmented<Kind>
        value={kind}
        onChange={setKind}
        options={[
          { value: "fiat", label: "Cash" },
          { value: "crypto", label: "Crypto" },
        ]}
      />

      <Field value={query} onChangeText={setQuery} placeholder={kind === "crypto" ? "Search tokens" : "Search currencies"} leading={<Icon name="search" size={17} color={c.textSubtle} />} returnKeyType="search" clearButtonMode="while-editing" />

      {list.length > 0 ? (
        <ListSection title={kind === "crypto" ? "Crypto" : "Currencies"} action={<Text variant="subhead" tone="muted">{show(kindTotal)}</Text>}>
          {list.map((a) => (
            <AssetRow key={a.code} a={a} />
          ))}
        </ListSection>
      ) : (
        !closed.length && <EmptyState icon="search" title="No match" body={`Nothing called "${query}". More assets are on the way.`} />
      )}

      {closed.length > 0 && (
        <ListSection title="Open a new account" footer="Free to open. NGN is always on.">
          {closed.map((a) => (
            <ListRow
              key={a.code}
              leading={<CoinIcon code={a.code} size={40} />}
              title={a.name}
              subtitle={a.kind === "fiat" ? `${a.code} · ${a.account?.label.replace(/^Your /, "")}` : `${a.code} · ${a.networks?.length} networks`}
              trailing={<Icon name="plusCircle" size={24} color={c.brand} />}
              onPress={() => router.push({ pathname: "/add-currency/[code]", params: { code: a.code } })}
            />
          ))}
        </ListSection>
      )}

      <ListSection>
        <ListRow icon="globe" iconTint={c.brandText} iconBg={c.brandSoft} title="Add a currency" subtitle="Hold, receive and swap in more currencies" onPress={() => router.push("/add-currency")} />
        <ListRow icon="swap" iconTint={c.brandText} iconBg={c.brandSoft} title="Swap" subtitle="Anything for anything, at one clear rate" onPress={() => router.push("/swap")} />
      </ListSection>
    </Screen>
  );
}
