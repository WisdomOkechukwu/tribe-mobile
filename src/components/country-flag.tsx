import { Image } from "expo-image";
import { View } from "react-native";
import { countryByIso } from "@/data/countries";
import { useColors } from "@/theme";
import { CoinIcon } from "./coin-icon";

/** Countries whose own flag differs from their currency's (euro countries all pay in EUR). */
const OWN_FLAGS: Record<string, number> = {
  DE: require("@/assets/flags/de.png"),
  FR: require("@/assets/flags/fr.png"),
  IE: require("@/assets/flags/ie.png"),
  NL: require("@/assets/flags/nl.png"),
  ES: require("@/assets/flags/es.png"),
};

/**
 * A country's own flag, circular (PNG from flag-icons via scripts/make-flags.mjs). Everywhere a
 * country has its own currency, that's the currency flag CoinIcon already draws.
 */
export function CountryFlag({ iso, size = 40 }: { iso: string; size?: number }) {
  const c = useColors();
  const country = countryByIso(iso);
  const own = OWN_FLAGS[iso];
  if (!own) return <CoinIcon code={country.flag} size={size} />;
  return (
    <View accessible accessibilityLabel={country.name} style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: c.surfaceAlt }}>
      <Image source={own} contentFit="cover" style={{ width: "100%", height: "100%" }} />
      {/* hairline so pale flags keep an edge on light surfaces */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, borderRadius: size / 2, borderWidth: 1, borderColor: c.border }} />
    </View>
  );
}
