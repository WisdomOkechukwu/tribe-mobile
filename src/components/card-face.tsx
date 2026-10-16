import { Image } from "expo-image";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import type { CardNetwork, VirtualCard } from "@/data/seed";
import { motion, palette, radius, spacing, useTheme, type CardLook } from "@/theme";
import { cardLook } from "@/utils/card-finish";
import { Icon } from "./icon";
import { PairIcon } from "./pair-icon";
import { WalletPill } from "./pay-mark";
import { Stripes } from "./stripes";
import { Text } from "./text";

export { cardLook } from "@/utils/card-finish";

/** The selected card's colours for the page around it (light/dark aware; works for custom finishes). */
export function useCardPalette(theme: string) {
  const { scheme } = useTheme();
  const l = cardLook(theme);
  return { page: l.page[scheme], accent: l.accent[scheme], accentFg: l.accentFg[scheme], soft: l.soft[scheme] };
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

/** Round card token for lists and pair icons: the card's colour with its network mark. */
export function CardBadge({ theme, network, size = 40 }: { theme: string; network: CardNetwork; size?: number }) {
  const look = cardLook(theme);
  return (
    <View accessible accessibilityLabel={`${look.name} card`} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: look.bg, alignItems: "center", justifyContent: "center", borderWidth: look.light ? 1 : 0, borderColor: "rgba(0,0,0,0.08)" }}>
      <NetworkMark network={network} color={look.fg} size={size * 0.52} />
    </View>
  );
}

/**
 * Money moving between a balance and a card, Mastercard-style: `out` (funding, paying for a new
 * card) puts the paying coin/flag at the back and the card in front; `in` (withdrawing) puts the
 * card at the back and the coin it lands in up front.
 */
export function CardPairIcon({ theme, network, asset, direction = "out", size = 40 }: { theme: string; network: CardNetwork; asset: string; direction?: "out" | "in"; size?: number }) {
  if (direction === "out") return <PairIcon from={asset} front={(s) => <CardBadge theme={theme} network={network} size={s} />} size={size} />;
  return <PairIcon from="card" back={(s) => <CardBadge theme={theme} network={network} size={s} />} to={asset} size={size} />;
}

// Patterns are drawn once, in a fixed 340×214 box stretched to the card (no gradients → no SVG ids).
const VW = 340;
const VH = 214;

// Pinstripe: hairlines leaning like the logo's bands, fading in towards the right
const PINSTRIPES = ["", "", ""];
for (let x = 92; x <= VW + 8; x += 9) PINSTRIPES[x < 170 ? 0 : x < 250 ? 1 : 2] += `M${x} ${VH}L${x + 134} 0`;

// Waves: six slow S-curves across the lower half
let WAVES = "";
for (let i = 0; i < 6; i++) {
  const y = 108 + 19 * i;
  const a = 24 * (1 - 0.1 * i);
  WAVES += `M-10 ${y}C80 ${y - a} 170 ${y + a} 260 ${y}S350 ${y - a / 2} 360 ${y - a / 2}`;
}

// Dots: a bold halftone (offset rows) pouring out of the top-right corner, fading towards the holder name
let DOTS = "";
for (let row = 0, y = 4; y <= VH + 6; y += 12, row++)
  for (let x = VW + 4 - (row % 2) * 7; x >= 60; x -= 14) {
    const r = 5.2 * (1 - Math.hypot(VW - x, y * 1.25) / 300);
    if (r >= 0.6) DOTS += `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  }

// Rings: ripples spreading from the bottom-right corner
const RINGS = Array.from({ length: 6 }, (_, i) => ({ r: 46 + 36 * i, opacity: 1 - i * 0.1 }));

// Grid: graph paper over the right side in five fading bands, with a few cells filled in like pixels
const CELL = 22;
const GRID_X = VW - CELL * 10;
const GRID = Array.from({ length: 5 }, (_, band) => {
  const x0 = GRID_X + band * CELL * 2;
  const x1 = Math.min(x0 + CELL * 2, VW);
  let d = "";
  for (let x = x0; x < x1; x += CELL) d += `M${x} 0V${VH}`;
  for (let y = 0; y <= VH; y += CELL) d += `M${x0} ${y}H${x1}`;
  return d;
});
const GRID_FILL = [[9, 0], [8, 1], [9, 2], [7, 0], [6, 2], [8, 3], [9, 5], [5, 1], [7, 4], [4, 0]]
  .map(([col, row]) => `M${GRID_X + col * CELL} ${row * CELL}h${CELL}v${CELL}h${-CELL}z`)
  .join("");

// Diamonds: a light lattice of crossing diagonals across the whole card
let DIAMONDS = "";
for (let x = -VH; x <= VW; x += 26) DIAMONDS += `M${x} 0L${x + VH} ${VH}M${x} ${VH}L${x + VH} 0`;

// Orbits: off-centre circles drifting from the top-right, one small "planet" on the third
const ORBITS = Array.from({ length: 5 }, (_, i) => ({ cx: 300 - i * 14, cy: 26 + i * 10, r: 38 + 36 * i, opacity: 1 - i * 0.12 }));
const PLANET = { cx: ORBITS[2].cx - ORBITS[2].r * Math.cos(0.5), cy: ORBITS[2].cy + ORBITS[2].r * Math.sin(0.5) };

// Contours: a topographic hill rising from the bottom edge
const CONTOUR_C = { x: 210, y: VH - 6 };
const CONTOURS = Array.from({ length: 7 }, (_, i) => ({ rx: 30 + 27 * i, ry: 18 + 18 * i, opacity: 1 - i * 0.08 }));

// --- the playful set (Sparkles, Daisies, Hearts, Zigzag) ---
// Each one is loudest top-right and thins out towards the holder name, like the fine patterns.

// Sparkles: four-point stars (concave sides), big to tiny
const SPARKLES = [
  [298, 56, 36],
  [234, 130, 17],
  [326, 162, 21],
  [190, 44, 13],
  [166, 184, 16],
  [122, 102, 9],
  [274, 198, 10],
  [238, 70, 8],
  [334, 104, 9],
  [146, 30, 6],
]
  .map(([x, y, r]) => `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`)
  .join("");

// Daisies: six round petals around a hollow centre (the centre is painted in the card colour)
const DAISIES = [
  { x: 296, y: 50, r: 56, rot: 10 },
  { x: 210, y: 170, r: 38, rot: 30 },
  { x: 336, y: 182, r: 30, rot: 0 },
  { x: 172, y: 62, r: 21, rot: 20 },
  { x: 118, y: 206, r: 22, rot: 15 },
].map((d) => ({
  ...d,
  petals: Array.from({ length: 6 }, (_, i) => {
    const a = ((d.rot + i * 60) * Math.PI) / 180;
    return { cx: d.x + Math.cos(a) * d.r * 0.58, cy: d.y + Math.sin(a) * d.r * 0.58, deg: d.rot + i * 60 };
  }),
}));

// Hearts: a few filled, a few outlined, all slightly off-kilter
const heart = (x: number, y: number, s: number) =>
  `M${x} ${y + 0.4 * s}C${x - 0.95 * s} ${y - 0.2 * s} ${x - 0.5 * s} ${y - 0.95 * s} ${x} ${y - 0.42 * s}C${x + 0.5 * s} ${y - 0.95 * s} ${x + 0.95 * s} ${y - 0.2 * s} ${x} ${y + 0.4 * s}Z`;
const HEARTS = [
  { x: 292, y: 66, s: 56, rot: -14, fill: true },
  { x: 212, y: 164, s: 36, rot: 12, fill: false },
  { x: 332, y: 178, s: 28, rot: -6, fill: true },
  { x: 178, y: 52, s: 22, rot: 18, fill: false },
  { x: 136, y: 190, s: 17, rot: -10, fill: true },
  { x: 250, y: 112, s: 14, rot: 6, fill: false },
];

// Zigzag: chunky chevrons over the right side (clear of the holder name), strong and soft in turn
const ZIGZAGS = Array.from({ length: 6 }, (_, i) => {
  const y = 22 + i * 34;
  const x0 = 136 + (i % 3) * 16;
  let d = `M${x0} ${y}`;
  for (let x = x0, up = true; x < VW + 14; x += 16, up = !up) d += `L${x + 16} ${up ? y - 12 : y}`;
  return d;
});

/** A finish's pattern, filling the card behind everything else. */
function CardPatternArt({ look, width, height }: { look: CardLook; width: number; height: number }) {
  const k = width / VW;
  // strokes scale with the viewBox, so a 72pt thumb drew 0.2pt hairlines: keep every line ≥ ~1pt on screen
  const w = (sw: number) => sw * Math.max(1, 1 / (sw * k));
  if (look.pattern === "brand" || look.pattern === "stripes") {
    const brand = look.pattern === "brand";
    return (
      <View pointerEvents="none" style={{ position: "absolute", right: -30 * k, top: -40 * k, width: "72%", height: "160%", overflow: "hidden", opacity: brand ? 0.9 : 1 }}>
        <Stripes band={(brand ? 20 : 15) * k} gap={(brand ? 9 : 8) * k} count={brand ? 10 : 9} colors={brand ? [palette.purple[500], palette.orange[500]] : [look.line, look.lineSoft]} />
      </View>
    );
  }
  return (
    <Svg pointerEvents="none" width={width} height={height} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" style={{ position: "absolute", left: 0, top: 0 }}>
      {look.pattern === "plain" && (
        <>
          <Circle cx={300} cy={10} r={170} fill={look.line} />
          <Circle cx={20} cy={240} r={130} fill={look.lineSoft} />
        </>
      )}
      {look.pattern === "lines" && PINSTRIPES.map((d, i) => <Path key={i} d={d} stroke={look.line} strokeWidth={w(1.4)} opacity={0.55 + i * 0.225} fill="none" />)}
      {look.pattern === "waves" && <Path d={WAVES} stroke={look.line} strokeWidth={w(1.9)} fill="none" strokeLinecap="round" />}
      {look.pattern === "dots" && <Path d={DOTS} fill={look.line} />}
      {look.pattern === "grid" && (
        <G>
          <Path d={GRID_FILL} fill={look.lineSoft} />
          {GRID.map((d, i) => (
            <Path key={i} d={d} stroke={look.line} strokeWidth={w(1.4)} opacity={0.14 + i * 0.215} fill="none" />
          ))}
        </G>
      )}
      {look.pattern === "diamonds" && <Path d={DIAMONDS} stroke={look.line} strokeWidth={w(1.2)} opacity={0.85} fill="none" />}
      {look.pattern === "orbits" && (
        <G>
          {ORBITS.map((o) => (
            <Circle key={o.r} cx={o.cx} cy={o.cy} r={o.r} stroke={look.line} strokeWidth={w(1.7)} opacity={o.opacity} fill="none" />
          ))}
          <Circle cx={PLANET.cx} cy={PLANET.cy} r={6} fill={look.line} />
        </G>
      )}
      {look.pattern === "contours" && (
        // a hill rising from the bottom edge, clear of the wordmark and the wallet pill
        <G transform={`rotate(-12 ${CONTOUR_C.x} ${CONTOUR_C.y})`}>
          {CONTOURS.map((k) => (
            <Ellipse key={k.rx} cx={CONTOUR_C.x} cy={CONTOUR_C.y} rx={k.rx} ry={k.ry} stroke={look.line} strokeWidth={w(1.6)} opacity={k.opacity} fill="none" />
          ))}
        </G>
      )}
      {look.pattern === "sparkles" && <Path d={SPARKLES} fill={look.line} />}
      {look.pattern === "daisies" &&
        DAISIES.map((d) => (
          <G key={d.x}>
            {d.petals.map((p) => (
              <Ellipse key={p.deg} cx={p.cx} cy={p.cy} rx={d.r * 0.4} ry={d.r * 0.24} transform={`rotate(${p.deg} ${p.cx} ${p.cy})`} fill={look.line} />
            ))}
            {/* the card colour hides where the petals meet, then a soft eye */}
            <Circle cx={d.x} cy={d.y} r={d.r * 0.3} fill={look.bg} />
            <Circle cx={d.x} cy={d.y} r={d.r * 0.3} fill={look.lineSoft} stroke={look.line} strokeWidth={w(1.4)} />
          </G>
        ))}
      {look.pattern === "hearts" &&
        HEARTS.map((h) => (
          <Path key={h.x} d={heart(h.x, h.y, h.s)} transform={`rotate(${h.rot} ${h.x} ${h.y})`} fill={h.fill ? look.line : "none"} stroke={h.fill ? "none" : look.line} strokeWidth={w(2.2)} strokeLinejoin="round" />
        ))}
      {look.pattern === "zigzag" && ZIGZAGS.map((d, i) => <Path key={i} d={d} stroke={i % 2 ? look.lineSoft : look.line} strokeWidth={w(6)} strokeLinejoin="miter" fill="none" />)}
      {look.pattern === "rings" && (
        <G>
          <Circle cx={330} cy={VH} r={46} fill={look.lineSoft} />
          {RINGS.map((ring) => (
            <Circle key={ring.r} cx={330} cy={VH} r={ring.r} stroke={look.line} strokeWidth={w(2)} opacity={ring.opacity} fill="none" />
          ))}
        </G>
      )}
    </Svg>
  );
}

function Wordmark({ color, size = 15 }: { color: string; size?: number }) {
  return (
    // TribeLogo.png carries the wordmark itself, tinted to the card's ink
    <Image source={require("@/assets/brand/tribe-logo.png")} tintColor={color} contentFit="contain" style={{ width: size * 2.6, height: size * 2.6 }} accessibilityLabel="Tribe" />
  );
}

/** A mini card (switcher rows, wallet list, pattern chips): the finish and, optionally, its network. */
export function CardThumb({ theme, network, width = 48 }: { theme: string; network?: CardNetwork; width?: number }) {
  const look = cardLook(theme);
  const h = Math.round(width / 1.586);
  return (
    <View style={{ width, height: h, borderRadius: Math.max(4, width * 0.1), borderCurve: "continuous", overflow: "hidden", backgroundColor: look.bg, borderWidth: look.light ? 1 : 0, borderColor: "rgba(0,0,0,0.08)" }}>
      <CardPatternArt look={look} width={width} height={h} />
      {network && (
        <View style={{ position: "absolute", right: width * 0.08, bottom: h * 0.12 }}>
          <NetworkMark network={network} color={look.fg} size={width * 0.26} />
        </View>
      )}
    </View>
  );
}

/** Real cards are ~86mm wide; past this the face reads as a poster (iPad, wide sheets), so callers' widths are capped. */
export const MAX_FACE_W = 400;

type FaceCard = Pick<VirtualCard, "theme" | "network"> & Partial<Pick<VirtualCard, "holder" | "number" | "last4" | "expiry" | "cvv" | "frozen" | "inWallet">>;

const faceLabel = (card: FaceCard, look: CardLook) =>
  `${look.name} ${card.network === "visa" ? "Visa" : "Mastercard"} card${card.last4 && /\d/.test(card.last4) ? ` ending ${card.last4}` : ""}${card.frozen ? ", frozen" : ""}`;

/** Card face geometry, all scaled from a 340pt-wide card. */
function faceMetrics(requested: number) {
  const width = Math.min(requested, MAX_FACE_W);
  const k = width / VW;
  const pad = Math.round(20 * k);
  const mark = 15 * k;
  const pillH = Math.max(16, Math.round(28 * k));
  return { width, height: width / 1.586, k, pad, mark, pillH, pillTop: pad + (mark * 2.6 - pillH) / 2 };
}

/**
 * Landscape card: Tribe wordmark top-left, the phone's wallet (Apple Pay / Google Pay) top-right,
 * holder bottom-left, network bottom-right. The number never shows on the face, except on
 * Card details with `revealed` (that screen guards against screenshots).
 */
function Face({ card, revealed, metrics, look, pill, decorative, style }: { card: FaceCard; revealed: boolean; metrics: ReturnType<typeof faceMetrics>; look: CardLook; pill: boolean; decorative?: boolean; style?: StyleProp<ViewStyle> }) {
  const { width, height, k, pad, mark, pillH, pillTop } = metrics;
  const numberSize = width * 0.05;
  const small = width < 220;
  const meta = { fontFamily: "Poppins_500Medium", fontSize: Math.max(9, 11 * k), lineHeight: Math.max(12, 15 * k), letterSpacing: 1, color: look.sub } as const;
  // revealed details: a soft shadow keeps them legible over patterns (Midnight's stripes)
  // (dark ink on pale finishes gets a pale halo, never a dark blur)
  const shade = { textShadowColor: look.light ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: look.light ? 2 : 3 } as const;
  const label = { fontFamily: "Poppins_500Medium", fontSize: Math.max(7, 8.5 * k), lineHeight: Math.max(9, 11 * k), letterSpacing: 1.2, color: look.sub, ...shade } as const;
  const value = { fontFamily: "Poppins_600SemiBold", fontSize: Math.max(10, 13 * k), lineHeight: Math.max(13, 17 * k), letterSpacing: 0.8, color: look.fg, fontVariant: ["tabular-nums" as const], ...shade };
  return (
    <View
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : faceLabel(card, look)}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "auto"}
      style={[{ width, height, borderRadius: Math.min(radius.card, width * 0.065), borderCurve: "continuous", overflow: "hidden", backgroundColor: look.bg, padding: pad, justifyContent: "space-between", boxShadow: look.shadow }, style]}
    >
      <CardPatternArt look={look} width={width} height={height} />
      <View style={{ flexDirection: "row" }}>
        <Wordmark color={look.mark} size={mark} />
      </View>
      {pill && width >= 150 && (
        <View style={{ position: "absolute", top: pillTop, right: pad }}>
          <WalletPill look={look} height={pillH} added={!!card.inWallet} />
        </View>
      )}
      {revealed ? (
        <>
          {/* the number and the details as one block at the foot: even gaps, read left to right */}
          <View style={{ gap: 14 * k }}>
            <View style={{ flexDirection: "row", gap: 14 * k }}>
              {(card.number ?? "").split(" ").map((g, i) => (
                <Text key={`${g}-${i}`} selectable style={{ fontFamily: "Poppins_600SemiBold", fontSize: numberSize * 1.08, lineHeight: Math.round(numberSize * 1.45), letterSpacing: 1.6, color: look.fg, fontVariant: ["tabular-nums"], ...shade }}>
                  {g}
                </Text>
              ))}
            </View>
          {/* labelled columns, like a real card: holder · expires · CVV, network on the right */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 22 * k }}>
            <View style={{ flexShrink: 1, gap: 2 }}>
              <Text style={label}>CARDHOLDER</Text>
              <Text numberOfLines={1} style={value}>
                {(card.holder || "Card holder").toUpperCase()}
              </Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={label}>EXPIRES</Text>
              <Text selectable style={value}>
                {card.expiry}
              </Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={label}>CVV</Text>
              <Text selectable style={value}>
                {card.cvv}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            <NetworkMark network={card.network} color={look.fg} size={34 * k} />
          </View>
          </View>
        </>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>{!small && !!card.holder && <Text style={meta}>{card.holder.toUpperCase()}</Text>}</View>
          <NetworkMark network={card.network} color={look.fg} size={34 * k} />
        </View>
      )}
      {card.frozen && (
        <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(214,226,240,0.55)", alignItems: "center", justifyContent: "center", gap: spacing.xs }}>
          <View style={{ width: 52 * k, height: 52 * k, borderRadius: 26 * k, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="snowflake" size={26 * k} color="#3A6EA5" />
          </View>
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: Math.max(11, 13 * k), color: "#1F3550" }}>Frozen</Text>
        </View>
      )}
    </View>
  );
}

/**
 * The Cards tab's live card: the whole face opens Card details, and the glass Apple Pay / Google
 * Pay pill on it opens Wallet & payments. Both are real buttons for VoiceOver (a pressable
 * wrapper would have swallowed the pill).
 */
function InteractiveFace({ card, metrics, look, style, onPress, onWalletPress }: { card: FaceCard; metrics: ReturnType<typeof faceMetrics>; look: CardLook; style?: StyleProp<ViewStyle>; onPress: () => void; onWalletPress?: () => void }) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const live = !!onWalletPress && !card.frozen;
  return (
    <Animated.View style={[pressStyle, style]}>
      <Face card={card} revealed={false} metrics={metrics} look={look} pill={!live} decorative />
      <Pressable
        onPressIn={() => {
          if (!reduce) scale.set(withSpring(0.98, motion.press));
        }}
        onPressOut={() => scale.set(withSpring(1, motion.press))}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${faceLabel(card, look)}. Card details`}
        style={{ position: "absolute", inset: 0, borderRadius: radius.card }}
      />
      {live && (
        <View style={{ position: "absolute", top: metrics.pillTop, right: metrics.pad }}>
          <WalletPill look={look} height={metrics.pillH} added={!!card.inWallet} onPress={onWalletPress} />
        </View>
      )}
    </Animated.View>
  );
}

/**
 * Landscape card (Cards tab, card creation, reviews). `revealed` (Card details only) shows the
 * number, expiry and CVV; `onPress` / `onWalletPress` make it the Cards tab's live card.
 */
export function VirtualCardFace({
  card,
  revealed = false,
  width = 340,
  style,
  onPress,
  onWalletPress,
  pill = true,
}: {
  card: FaceCard;
  revealed?: boolean;
  width?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onWalletPress?: () => void;
  /** false hides the Apple Pay / Google Pay mark (busy art like the intro fan) */
  pill?: boolean;
}) {
  const look = cardLook(card.theme);
  const metrics = faceMetrics(width);
  if (onPress) return <InteractiveFace card={card} metrics={metrics} look={look} style={style} onPress={onPress} onWalletPress={onWalletPress} />;
  return <Face card={card} revealed={revealed} metrics={metrics} look={look} pill={pill} style={style} />;
}
