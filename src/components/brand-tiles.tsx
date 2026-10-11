import { Image } from "expo-image";
import { View, type StyleProp, type ViewStyle } from "react-native";
import type { Biller, GiftBrand } from "@/data/catalog";
import { radius, spacing } from "@/theme";
import { Text } from "./text";

/** Biller logo as the tile itself (images have their background baked in). Name-on-colour underneath while loading. */
export function BillerThumb({ biller, size = 52 }: { biller: Biller; size?: number }) {
  return (
    <View
      accessible
      accessibilityLabel={biller.name}
      style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: biller.bg, alignItems: "center", justifyContent: "center" }}
    >
      <Text variant="caption" style={{ color: biller.fg, fontFamily: "BricolageGrotesque_800ExtraBold" }}>
        {biller.name}
      </Text>
      <Image source={biller.image} contentFit="cover" transition={120} style={{ position: "absolute", width: "100%", height: "100%" }} />
    </View>
  );
}

/** Brand mark on its colour (square) — for transaction rows and pickers. */
export function GiftMark({ brand, size = 44 }: { brand: GiftBrand; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand.bg, alignItems: "center", justifyContent: "center" }} accessible accessibilityLabel={brand.name}>
      {brand.mark ? (
        <Image source={brand.mark} tintColor={brand.fg} contentFit="contain" style={{ width: size * 0.5, height: size * 0.5 }} />
      ) : (
        <Text variant="caption" style={{ color: brand.fg, fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: size * 0.22 }}>
          {brand.wordmark}
        </Text>
      )}
    </View>
  );
}

/** Glossy gift card (as on the landing page): mark top-right, name bottom-left, "GIFT CARD" bottom-right. */
export function GiftCardFace({ brand, amount, width = 168, style }: { brand: GiftBrand; amount?: string; width?: number; style?: StyleProp<ViewStyle> }) {
  const big = width > 220;
  return (
    <View
      style={[
        { width, aspectRatio: 1.6, borderRadius: big ? radius.card : radius.chip, borderCurve: "continuous", overflow: "hidden", backgroundColor: brand.bg, padding: big ? spacing.lg : spacing.smd, justifyContent: "space-between" },
        style,
      ]}
    >
      {/* sheen */}
      <View pointerEvents="none" style={{ position: "absolute", top: "-40%", left: "30%", width: "35%", height: "180%", backgroundColor: "rgba(255,255,255,0.12)", transform: [{ rotate: "22deg" }] }} />
      <View style={{ alignItems: "flex-end" }}>
        {brand.mark ? (
          <Image source={brand.mark} tintColor={brand.fg} contentFit="contain" style={{ width: big ? 40 : 22, height: big ? 40 : 22 }} />
        ) : (
          <Text variant={big ? "title" : "bodyStrong"} style={{ color: brand.fg }}>
            {brand.wordmark}
          </Text>
        )}
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <View>
          <Text variant={big ? "heading" : "label"} style={{ color: brand.fg }}>
            {brand.name}
          </Text>
          {amount && (
            <Text variant={big ? "display" : "title"} style={{ color: brand.fg }}>
              {amount}
            </Text>
          )}
        </View>
        <Text variant="overline" style={{ color: brand.fg, opacity: 0.8, fontSize: big ? 11 : 8 }}>
          Gift card
        </Text>
      </View>
    </View>
  );
}
