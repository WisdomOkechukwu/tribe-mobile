import { View } from "react-native";
import type { Transaction } from "@/data/seed";
import { useColors } from "@/theme";
import { CoinIcon } from "./coin-icon";
import { Icon } from "./icon";
import { PairIcon } from "./pair-icon";

/**
 * A send's art, with a small red up-arrow badge (the mirror of an incoming payment's green
 * down-arrow). A plain send is the coin it was sent in; a converted send (BTC paid, the recipient
 * got naira) is the swap pair, what paid underneath and what they got in front. Who it went to is
 * the row's title, so the art doesn't repeat it. `ring` is the colour the badge is cut out of
 * (the surface behind the art).
 */
export function SendArt({ tx, size = 40, ring }: { tx: Transaction; size?: number; ring?: string }) {
  const c = useColors();
  const badge = Math.round(size * 0.45);
  const border = Math.max(2, Math.round(size * 0.05));
  const out = Math.round(size * 0.075);
  const converted = !!tx.toAsset && tx.toAsset !== tx.asset;
  return (
    <View accessible accessibilityLabel={converted ? `Sent ${tx.asset} as ${tx.toAsset}` : `Sent ${tx.asset}`}>
      {converted ? <PairIcon from={tx.asset} to={tx.toAsset} size={size} /> : <CoinIcon code={tx.asset} size={size} />}
      <View style={{ position: "absolute", right: -out, bottom: -out, width: badge, height: badge, borderRadius: badge / 2, backgroundColor: c.danger, borderWidth: border, borderColor: ring ?? c.surface, alignItems: "center", justifyContent: "center" }}>
        <Icon name="send" size={Math.round(badge * 0.5)} color={c.onBrand} weight="bold" />
      </View>
    </View>
  );
}
