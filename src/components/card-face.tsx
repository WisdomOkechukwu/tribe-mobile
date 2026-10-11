import { Image } from "expo-image";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { CardNetwork, CardTheme, VirtualCard } from "@/data/seed";
import { palette, radius, spacing, useTheme } from "@/theme";
import { Icon } from "./icon";
import { Stripes } from "./stripes";
import { Text } from "./text";

type Theme = { name: string; bg: string; fg: string; sub: string; mark: string; line: string; swatch: [string, string]; shadow: string };

/** Card finishes — Virtual Card.png's idea (a set of themes + subtle patterns) in Tribe colours. */
export const CARD_THEMES: Record<CardTheme, Theme> = {
  midnight: { name: "Midnight", bg: palette.purple[900], fg: "#ffffff", sub: palette.purple[100], mark: palette.orange[400], line: palette.purple[500], swatch: [palette.purple[700], palette.purple[900]], shadow: "0 26px 44px -26px rgba(44,5,72,0.9)" },
  sunset: { name: "Sunset", bg: palette.orange[500], fg: "#ffffff", sub: palette.orange[50], mark: "#ffffff", line: palette.orange[300], swatch: [palette.orange[300], palette.orange[600]], shadow: "0 26px 44px -26px rgba(181,70,23,0.85)" },
  onyx: { name: "Onyx", bg: "#1E1C21", fg: "#ffffff", sub: "#B9B6BF", mark: palette.purple[200], line: "#34313A", swatch: ["#4A4750", "#1E1C21"], shadow: "0 26px 44px -26px rgba(0,0,0,0.85)" },
  cream: { name: "Cream", bg: "#EFEBE1", fg: "#201F1F", sub: "#6F6E6E", mark: palette.purple[500], line: "#E0DACB", swatch: ["#F8F6F0", "#DDD6C6"], shadow: "0 26px 44px -26px rgba(60,50,30,0.45)" },
  lime: { name: "Lime", bg: "#BFEBA3", fg: "#14261A", sub: "#3D5A45", mark: palette.purple[700], line: "#AADF8A", swatch: ["#D6F6C2", "#9FDB7C"], shadow: "0 26px 44px -26px rgba(60,110,40,0.55)" },
  forest: { name: "Forest", bg: "#0C3B2C", fg: "#ffffff", sub: "#A9D4C2", mark: "#BFEBA3", line: "#145440", swatch: ["#1C5A44", "#0A2E22"], shadow: "0 26px 44px -26px rgba(5,40,28,0.85)" },
  sky: { name: "Sky", bg: "#5AC8FA", fg: "#062A47", sub: "#0E4A75", mark: "#062A47", line: "#2FAEEF", swatch: ["#9ADFFF", "#2FAEEF"], shadow: "0 26px 44px -26px rgba(20,100,160,0.55)" },
};

/** Swatch order on "Select a theme": the Virtual Card.png set first, then Tribe's own two. */
export const CARD_THEME_ORDER: CardTheme[] = ["onyx", "lime", "forest", "cream", "sky", "midnight", "sunset"];

type Pair = { light: string; dark: string };
/** How each finish tints the Cards pages: page background, the action colour and soft fills. */
const PAGE: Record<CardTheme, { page: Pair; accent: Pair; accentFg: Pair; soft: Pair }> = {
  midnight: { page: { light: "#F1E8F8", dark: "#170D24" }, accent: { light: palette.purple[500], dark: "#8B3FD0" }, accentFg: { light: "#ffffff", dark: "#ffffff" }, soft: { light: "#E4D3F2", dark: "#2A1840" } },
  sunset: { page: { light: "#FFF1E9", dark: "#21120B" }, accent: { light: palette.orange[500], dark: palette.orange[400] }, accentFg: { light: "#ffffff", dark: "#ffffff" }, soft: { light: "#FFDCC9", dark: "#3A1F12" } },
  onyx: { page: { light: "#EEEDF1", dark: "#0F0E12" }, accent: { light: "#1E1C21", dark: "#E9E7EE" }, accentFg: { light: "#ffffff", dark: "#1E1C21" }, soft: { light: "#DFDDE5", dark: "#24222A" } },
  cream: { page: { light: "#F7F3EA", dark: "#1A1813" }, accent: { light: "#6B5B3E", dark: "#C9B88F" }, accentFg: { light: "#ffffff", dark: "#1A1813" }, soft: { light: "#EAE2D0", dark: "#2E291F" } },
  lime: { page: { light: "#EEF9E5", dark: "#0F1A0C" }, accent: { light: "#3F8F2C", dark: "#8FD46E" }, accentFg: { light: "#ffffff", dark: "#0F1A0C" }, soft: { light: "#D6F1C4", dark: "#1D3317" } },
  forest: { page: { light: "#E7F2EC", dark: "#0A1712" }, accent: { light: "#0C3B2C", dark: "#7FD1AE" }, accentFg: { light: "#ffffff", dark: "#0A1712" }, soft: { light: "#CFE6DA", dark: "#16302A" } },
  sky: { page: { light: "#E8F6FE", dark: "#0A1620" }, accent: { light: "#0B6FB0", dark: "#7CCBF5" }, accentFg: { light: "#ffffff", dark: "#0A1620" }, soft: { light: "#CDEBFB", dark: "#15303F" } },
};

/** The selected card's colours for the page around it (light/dark aware). */
export function useCardPalette(theme: CardTheme) {
  const { scheme } = useTheme();
  const p = PAGE[theme];
  return { page: p.page[scheme], accent: p.accent[scheme], accentFg: p.accentFg[scheme], soft: p.soft[scheme] };
}

/** Mastercard circles or the VISA wordmark. */
export function NetworkMark({ network, color, size = 34 }: { network: CardNetwork; color: string; size?: number }) {
  if (network === "visa")
    return (
      <Text style={{ fontFamily: "BricolageGrotesque_800ExtraBold", fontSize: size * 0.62, lineHeight: size * 0.7, color, letterSpacing: 0.5, transform: [{ skewX: "-12deg" }] }} accessibilityLabel="Visa">
        VISA
      </Text>
    );
  const d = size * 0.62;
  return (
    <View accessible accessibilityLabel="Mastercard" style={{ flexDirection: "row" }}>
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: "#EB001B" }} />
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: "#F79E1B", marginLeft: -d * 0.38, opacity: 0.92 }} />
    </View>
  );
}

/** Round card token for lists and pair icons: the card's finish with its network mark. */
export function CardBadge({ theme, network, size = 40 }: { theme: CardTheme; network: CardNetwork; size?: number }) {
  const t = CARD_THEMES[theme];
  return (
    <View accessible accessibilityLabel={`${t.name} card`} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", borderWidth: theme === "cream" || theme === "lime" || theme === "sky" ? 1 : 0, borderColor: "rgba(0,0,0,0.08)" }}>
      <NetworkMark network={network} color={t.fg} size={size * 0.52} />
    </View>
  );
}

/** Subtle per-theme pattern, drawn across the whole card. */
function Pattern({ theme, w, h }: { theme: CardTheme; w: number; h: number }) {
  const t = CARD_THEMES[theme];
  if (theme === "midnight")
    return (
      <View style={{ position: "absolute", right: -30, top: -40, width: "72%", height: "160%", overflow: "hidden", opacity: 0.9 }}>
        <Stripes band={20} gap={9} count={10} colors={[palette.purple[500], palette.orange[500]]} />
      </View>
    );
  if (theme === "sky")
    // bow-tie triangles meeting in the middle (Virtual Card.png's blue finish)
    return (
      <Svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
        <Path d={`M0 ${h * 0.12} L${w * 0.5} ${h * 0.5} L0 ${h * 0.88} Z`} fill={t.line} opacity={0.55} />
        <Path d={`M${w} ${h * 0.12} L${w * 0.5} ${h * 0.5} L${w} ${h * 0.88} Z`} fill={t.line} opacity={0.55} />
        <Path d={`M${w * 0.18} 0 L${w * 0.5} ${h * 0.5} L${w * 0.82} 0 Z`} fill="#ffffff" opacity={0.16} />
        <Path d={`M${w * 0.18} ${h} L${w * 0.5} ${h * 0.5} L${w * 0.82} ${h} Z`} fill="#ffffff" opacity={0.16} />
      </Svg>
    );
  const paths: string[] = [];
  if (theme === "sunset" || theme === "onyx" || theme === "forest") {
    // rays from the bottom-left corner
    for (let i = 0; i <= 22; i++) {
      const a = (i / 22) * (Math.PI / 2);
      paths.push(`M0 ${h} L${Math.cos(a) * w * 1.6} ${h - Math.sin(a) * w * 1.6}`);
    }
  } else if (theme === "lime") {
    // interlocking chevrons
    for (let y = -10; y < h + 20; y += 18) for (let x = -20; x < w + 20; x += 36) paths.push(`M${x} ${y + 9} l9 -9 l9 9 l9 -9 M${x + 9} ${y + 18} l0 -9`);
  } else {
    // cream: soft waves
    for (let y = 8; y < h + 20; y += 16) paths.push(`M-10 ${y} q${w / 8} -10 ${w / 4} 0 t${w / 4} 0 t${w / 4} 0 t${w / 4} 0 t${w / 4} 0`);
  }
  return (
    <Svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
      {paths.map((d, i) => (
        <Path key={i} d={d} stroke={t.line} strokeWidth={theme === "lime" ? 2 : 1.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {theme === "cream" && <Circle cx={w * 0.86} cy={h * 0.1} r={h * 0.5} fill="#ffffff" opacity={0.35} />}
    </Svg>
  );
}

function Wordmark({ color, size = 15 }: { color: string; size?: number }) {
  return (
    // TribeLogo.png carries the wordmark itself, tinted to the card's ink
    <Image source={require("@/assets/brand/tribe-logo.png")} tintColor={color} contentFit="contain" style={{ width: size * 2.6, height: size * 2.6 }} accessibilityLabel="Tribe" />
  );
}

type FaceCard = Pick<VirtualCard, "theme" | "network" | "number" | "last4" | "expiry" | "cvv" | "frozen" | "holder"> & { label?: string };

/** Landscape card (Cards tab, reviews): wordmark + network on top, masked number + holder below. */
export function VirtualCardFace({ card, revealed = false, width = 340, style }: { card: FaceCard; revealed?: boolean; width?: number; style?: StyleProp<ViewStyle> }) {
  const t = CARD_THEMES[card.theme];
  const h = width / 1.586;
  const masked = `${card.number.slice(0, 4) || "5399"}  ****  ****  ${card.last4}`;
  return (
    <View
      accessible
      accessibilityLabel={`${t.name} ${card.network} card ending ${card.last4}${card.frozen ? ", frozen" : ""}`}
      style={[{ width, height: h, borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: t.bg, padding: spacing.mdl, justifyContent: "space-between", boxShadow: t.shadow }, style]}
    >
      <Pattern theme={card.theme} w={width} h={h} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark color={t.mark} />
        <NetworkMark network={card.network} color={t.fg} />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: width * 0.05, letterSpacing: 1.6, color: t.fg, fontVariant: ["tabular-nums"] }}>{revealed ? card.number : masked}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 11, letterSpacing: 1, color: t.sub }}>{(card.holder || "Card holder").toUpperCase()}</Text>
          <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 11, letterSpacing: 1, color: t.sub }}>{revealed ? `${card.expiry} · CVV ${card.cvv}` : card.expiry}</Text>
        </View>
      </View>
      {card.frozen && (
        <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(214,226,240,0.55)", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="snowflake" size={26} color="#3A6EA5" />
          </View>
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: "#1F3550" }}>Frozen</Text>
        </View>
      )}
    </View>
  );
}

/** Portrait card for the theme carousel (Virtual Card.png "Select a theme"). */
export function VirtualCardPortrait({ theme, network, width = 200 }: { theme: CardTheme; network: CardNetwork; width?: number }) {
  const t = CARD_THEMES[theme];
  const h = width * 1.586;
  return (
    <View accessible accessibilityLabel={`${t.name} card`} style={{ width, height: h, borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: t.bg, boxShadow: t.shadow }}>
      <Pattern theme={theme} w={width} h={h} />
      {/* wordmark runs down the right edge, number down the left — like a card held upright */}
      <View style={{ position: "absolute", right: -h * 0.18 + 26, top: h * 0.22, transform: [{ rotate: "90deg" }] }}>
        <Wordmark color={t.mark} size={16} />
      </View>
      <View style={{ position: "absolute", left: 18 - h * 0.17, top: h * 0.3, transform: [{ rotate: "90deg" }] }}>
        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, letterSpacing: 2, color: t.sub }}>5399 **** **** ****</Text>
      </View>
      <View style={{ position: "absolute", right: 18, bottom: 22 }}>
        <NetworkMark network={network} color={t.fg} size={36} />
      </View>
    </View>
  );
}
