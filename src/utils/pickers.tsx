import { CoinIcon } from "@/components/coin-icon";
import { Icon } from "@/components/icon";
import { View } from "react-native";
import type { Appearance } from "@/stores/use-prefs-store";
import { useColors } from "@/theme";
import { overlay } from "@/stores/use-overlay-store";
import type { DisplayCurrency } from "./format";

/** Shared custom pickers (all render through the overlay host — never the system sheet). */
export function pickDisplayCurrency(value: DisplayCurrency, onPick: (v: DisplayCurrency) => void) {
  overlay.select({
    title: "Show balances in",
    value,
    options: [
      { value: "NGN", label: "Nigerian Naira", sub: "₦ · NGN", leading: <CoinIcon code="NGN" size={36} /> },
      { value: "USD", label: "US Dollar", sub: "$ · USD", leading: <CoinIcon code="USD" size={36} /> },
    ],
    onSelect: (v) => onPick(v as DisplayCurrency),
  });
}

function Glyph({ name }: { name: "appearance" | "moon" | "sun" }) {
  const c = useColors();
  return (
    <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: c.brandSoft }}>
      <Icon name={name} size={17} color={c.brandText} />
    </View>
  );
}

export function pickAppearance(value: Appearance, onPick: (v: Appearance) => void) {
  overlay.select({
    title: "Appearance",
    value,
    options: [
      { value: "system", label: "Match system", sub: "Follows your phone's setting", leading: <Glyph name="appearance" /> },
      { value: "light", label: "Light", leading: <Glyph name="sun" /> },
      { value: "dark", label: "Dark", leading: <Glyph name="moon" /> },
    ],
    onSelect: (v) => onPick(v as Appearance),
  });
}
