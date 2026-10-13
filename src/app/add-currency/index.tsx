import { router } from "expo-router";
import { EmptyState, Note } from "@/components/bits";
import { CoinIcon } from "@/components/coin-icon";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { ASSETS } from "@/data/assets";
import { useWalletStore } from "@/stores/use-wallet-store";
import { useColors } from "@/theme";
import { guardWalletOpen, useWalletsUnlocked } from "@/utils/verification";

/** Open a new currency · step 1: pick one. NGN is always open, so it never appears here. */
export default function AddCurrency() {
  const c = useColors();
  const opened = useWalletStore((s) => s.opened);
  const available = ASSETS.filter((a) => a.code !== "NGN" && !opened.includes(a.code));
  const fiat = available.filter((a) => a.kind === "fiat");
  const crypto = available.filter((a) => a.kind === "crypto");
  const unlocked = useWalletsUnlocked();
  const open = (code: string) => guardWalletOpen(() => router.push({ pathname: "/add-currency/[code]", params: { code } }));
  const trailing = <Icon name={unlocked ? "plusCircle" : "lock"} size={unlocked ? 24 : 18} color={unlocked ? c.brand : c.textSubtle} />;

  return (
    <FlowScreen title="Add a currency">
      {available.length === 0 ? (
        <EmptyState icon="globe" title="You've got them all" body="Every currency we support is open on your account. More are coming soon." />
      ) : (
        <>
          {!unlocked && <Note icon="shield">Finish every verification step (BVN, NIN + selfie, ID + address) to open new wallets.</Note>}
          {fiat.length > 0 && (
            <ListSection title="Currencies" footer="Local account details, so people abroad can pay you like a local.">
              {fiat.map((a) => (
                <ListRow key={a.code} leading={<CoinIcon code={a.code} size={40} />} title={a.name} subtitle={`${a.code} · ${a.account?.label.replace(/^Your /, "") ?? "Account"}`} trailing={trailing} onPress={() => open(a.code)} />
              ))}
            </ListSection>
          )}
          {crypto.length > 0 && (
            <ListSection title="Crypto">
              {crypto.map((a) => (
                <ListRow key={a.code} leading={<CoinIcon code={a.code} size={40} />} title={a.name} subtitle={`${a.code} · ${a.networks?.map((n) => n.name.split(" ")[0]).join(", ")}`} trailing={trailing} onPress={() => open(a.code)} />
              ))}
            </ListSection>
          )}
          <Note icon="info">Your Naira account is always on, so it isn&apos;t listed. Opening is free and you can hide unused currencies any time.</Note>
        </>
      )}
    </FlowScreen>
  );
}
