import type { CardPattern, CardTheme } from "@/data/seed";
import { palette } from "./palette";

type Pair = { light: string; dark: string };

/**
 * Everything a card finish paints: the face (bg, inks, pattern) and how it tints the pages
 * around it (page background, the action colour and soft fills, light/dark aware).
 * Presets live here; user-made finishes are derived in `utils/card-finish.ts`.
 */
export type CardLook = {
  name: string;
  bg: string;
  /** main ink (wordmark area, network, holder) */
  fg: string;
  /** quiet ink (holder name, expiry) */
  sub: string;
  /** the Tribe wordmark's tint */
  mark: string;
  /** pattern ink, strong and soft (Solid: the sheen and the shade) */
  line: string;
  lineSoft: string;
  swatch: [string, string];
  shadow: string;
  /** "brand" is Midnight's own logo stripes */
  pattern: CardPattern | "brand";
  /** a pale card: dark ink, and a hairline edge on light surfaces */
  light: boolean;
  page: Pair;
  accent: Pair;
  accentFg: Pair;
  soft: Pair;
};

/**
 * Tribe's seven finishes. Midnight keeps the logo stripes; the rest are quiet: one colour and a
 * single fine pattern (rings, dots, waves, pinstripe) or a plain "metal" sheen.
 */
export const CARD_PRESETS: Record<CardTheme, CardLook> = {
  midnight: {
    name: "Midnight",
    bg: palette.purple[900],
    fg: palette.white,
    sub: palette.purple[100],
    mark: palette.orange[400],
    line: palette.purple[500],
    lineSoft: palette.orange[500],
    swatch: [palette.purple[700], palette.purple[900]],
    shadow: "0 26px 44px -26px rgba(44,5,72,0.9)",
    pattern: "brand",
    light: false,
    page: { light: "#F1E8F8", dark: "#170D24" },
    accent: { light: palette.purple[500], dark: "#8B3FD0" },
    accentFg: { light: palette.white, dark: palette.white },
    soft: { light: "#E4D3F2", dark: "#2A1840" },
  },
  sunset: {
    name: "Sunset",
    bg: palette.orange[500],
    fg: palette.white,
    sub: palette.orange[50],
    mark: palette.white,
    line: "rgba(255,255,255,0.28)",
    lineSoft: "rgba(255,255,255,0.12)",
    swatch: [palette.orange[300], palette.orange[600]],
    shadow: "0 26px 44px -26px rgba(181,70,23,0.85)",
    pattern: "rings",
    light: false,
    page: { light: "#FFF1E9", dark: "#21120B" },
    accent: { light: palette.orange[500], dark: palette.orange[400] },
    accentFg: { light: palette.white, dark: palette.white },
    soft: { light: "#FFDCC9", dark: "#3A1F12" },
  },
  onyx: {
    name: "Onyx",
    bg: "#1E1C21",
    fg: palette.white,
    sub: "#B9B6BF",
    mark: palette.purple[200],
    line: "rgba(255,255,255,0.07)",
    lineSoft: "rgba(0,0,0,0.3)",
    swatch: ["#4A4750", "#1E1C21"],
    shadow: "0 26px 44px -26px rgba(0,0,0,0.85)",
    pattern: "plain",
    light: false,
    page: { light: "#EEEDF1", dark: "#0F0E12" },
    accent: { light: "#1E1C21", dark: "#E9E7EE" },
    accentFg: { light: palette.white, dark: "#1E1C21" },
    soft: { light: "#DFDDE5", dark: "#24222A" },
  },
  cream: {
    name: "Cream",
    bg: "#EFEBE1",
    fg: "#201F1F",
    sub: "#6F6E6E",
    mark: palette.purple[500],
    line: "rgba(255,255,255,0.62)",
    lineSoft: "rgba(60,50,30,0.07)",
    swatch: ["#F8F6F0", "#DDD6C6"],
    shadow: "0 26px 44px -26px rgba(60,50,30,0.45)",
    pattern: "plain",
    light: true,
    page: { light: "#F7F3EA", dark: "#1A1813" },
    accent: { light: "#6B5B3E", dark: "#C9B88F" },
    accentFg: { light: palette.white, dark: "#1A1813" },
    soft: { light: "#EAE2D0", dark: "#2E291F" },
  },
  lime: {
    name: "Lime",
    bg: "#BFEBA3",
    fg: "#14261A",
    sub: "#3D5A45",
    mark: palette.purple[700],
    line: "rgba(20,38,26,0.2)",
    lineSoft: "rgba(20,38,26,0.08)",
    swatch: ["#D6F6C2", "#9FDB7C"],
    shadow: "0 26px 44px -26px rgba(60,110,40,0.55)",
    pattern: "dots",
    light: true,
    page: { light: "#EEF9E5", dark: "#0F1A0C" },
    accent: { light: "#3F8F2C", dark: "#8FD46E" },
    accentFg: { light: palette.white, dark: "#0F1A0C" },
    soft: { light: "#D6F1C4", dark: "#1D3317" },
  },
  forest: {
    name: "Forest",
    bg: "#0C3B2C",
    fg: palette.white,
    sub: "#A9D4C2",
    mark: "#BFEBA3",
    line: "rgba(191,235,163,0.3)",
    lineSoft: "rgba(191,235,163,0.12)",
    swatch: ["#1C5A44", "#0A2E22"],
    shadow: "0 26px 44px -26px rgba(5,40,28,0.85)",
    pattern: "lines",
    light: false,
    page: { light: "#E7F2EC", dark: "#0A1712" },
    accent: { light: "#0C3B2C", dark: "#7FD1AE" },
    accentFg: { light: palette.white, dark: "#0A1712" },
    soft: { light: "#CFE6DA", dark: "#16302A" },
  },
  sky: {
    name: "Sky",
    bg: "#5AC8FA",
    fg: "#062A47",
    sub: "#0E4A75",
    mark: "#062A47",
    line: "rgba(255,255,255,0.55)",
    lineSoft: "rgba(255,255,255,0.24)",
    swatch: ["#9ADFFF", "#2FAEEF"],
    shadow: "0 26px 44px -26px rgba(20,100,160,0.55)",
    pattern: "waves",
    light: true,
    page: { light: "#E8F6FE", dark: "#0A1620" },
    accent: { light: "#0B6FB0", dark: "#7CCBF5" },
    accentFg: { light: palette.white, dark: "#0A1620" },
    soft: { light: "#CDEBFB", dark: "#15303F" },
  },
};

/** Order on the Finish step: Tribe's own two first (brand), then light → dark. */
export const CARD_THEME_ORDER: CardTheme[] = ["midnight", "sunset", "lime", "sky", "cream", "forest", "onyx"];

/** "Make your own": the curated colours (any other hue comes from the slider). */
export const CARD_SWATCHES: { name: string; hex: string }[] = [
  { name: "Coral", hex: "#FF7A5C" },
  { name: "Rose", hex: "#F4A6C0" },
  { name: "Berry", hex: "#A3245E" },
  { name: "Cherry", hex: "#C8102E" },
  { name: "Butter", hex: "#F7D774" },
  { name: "Mint", hex: "#9BE3C4" },
  { name: "Teal", hex: "#0E7C74" },
  { name: "Ocean", hex: "#1E4FD8" },
  { name: "Lilac", hex: "#C7B3F5" },
  { name: "Plum", hex: "#5A2A82" },
  { name: "Sand", hex: "#D9C2A0" },
  { name: "Slate", hex: "#4A5568" },
];

/** The patterns on offer, with the word used in a custom finish's name ("Coral waves"). */
export const CARD_PATTERNS: { id: CardPattern; label: string; word: string }[] = [
  { id: "plain", label: "Solid", word: "" },
  { id: "lines", label: "Pinstripe", word: "pinstripe" },
  { id: "waves", label: "Waves", word: "waves" },
  { id: "dots", label: "Dots", word: "dots" },
  { id: "rings", label: "Rings", word: "rings" },
  { id: "stripes", label: "Stripes", word: "stripes" },
  { id: "grid", label: "Grid", word: "grid" },
  { id: "diamonds", label: "Diamonds", word: "diamonds" },
  { id: "orbits", label: "Orbits", word: "orbits" },
  { id: "contours", label: "Contours", word: "contours" },
];

/** Shades for the hue slider: the same hue as a pastel, a full colour or a deep one. */
export const CUSTOM_SHADES = {
  light: { label: "Light", s: 0.75, l: 0.8 },
  rich: { label: "Rich", s: 0.7, l: 0.52 },
  deep: { label: "Deep", s: 0.6, l: 0.26 },
} as const;
export type CustomShade = keyof typeof CUSTOM_SHADES;

/** The glass Apple Pay / Google Pay pill on a card face (pale cards get a brighter frost). */
export const CARD_GLASS = {
  light: { fill: "rgba(255,255,255,0.46)", border: "rgba(255,255,255,0.8)", highlight: "rgba(255,255,255,0.9)" },
  dark: { fill: "rgba(255,255,255,0.14)", border: "rgba(255,255,255,0.3)", highlight: "rgba(255,255,255,0.55)" },
  sheen: palette.white,
} as const;
