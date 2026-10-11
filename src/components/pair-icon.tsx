import type { ReactNode } from "react";
import { View } from "react-native";
import { useColors } from "@/theme";
import { CoinIcon } from "./coin-icon";

/**
 * Two-badge icon, Mastercard-style: the FROM asset (what paid) sits underneath at the back-left,
 * and the thing it became overlaps in front at the bottom-right — another coin for swaps, or a
 * biller logo / gift card mark (`front`) for bills and gift cards. A surface-coloured ring cuts
 * the overlap so both read clearly.
 */
export function PairIcon({ from, to, front, back, size = 40 }: { from: string; to?: string; front?: (size: number) => ReactNode; back?: (size: number) => ReactNode; size?: number }) {
  const c = useColors();
  const coin = Math.round(size * 0.78);
  const overlap = Math.round(coin * 0.42);
  const ring = Math.max(2, Math.round(coin * 0.07));
  return (
    <View accessible accessibilityLabel={to ? `${from} to ${to}` : `Paid with ${from}`} style={{ width: coin * 2 - overlap, height: size, justifyContent: "center" }}>
      <View style={{ position: "absolute", left: 0, top: 0, zIndex: 0 }}>{back ? back(coin) : <CoinIcon code={from} size={coin} />}</View>
      <View style={{ position: "absolute", left: coin - overlap, bottom: 0, zIndex: 1 }}>
        {front ? (
          <View style={{ padding: ring, backgroundColor: c.surface, borderRadius: 999 }}>{front(coin - ring)}</View>
        ) : (
          <CoinIcon code={to!} size={coin} ring={c.surface} />
        )}
      </View>
    </View>
  );
}
