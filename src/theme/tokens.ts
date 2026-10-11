import type { TextStyle } from "react-native";

/** 4-pt grid. 12 and 20 recur in this design, so they are named steps. */
export const spacing = { xxs: 2, xs: 4, sm: 8, smd: 12, md: 16, mdl: 20, lg: 24, xl: 32, xxl: 48 } as const;

/**
 * Shape language v2: grouped list sections 18, cards 22, inputs 14, pills/circles full.
 * Pair every non-circle radius with borderCurve: "continuous".
 */
export const radius = { xs: 8, input: 14, group: 18, chip: 14, card: 22, panel: 28, full: 9999 } as const;

export const fonts = {
  display: "BricolageGrotesque_800ExtraBold",
  displayBold: "BricolageGrotesque_700Bold",
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
} as const;

/**
 * Strict type scale. Bricolage ONLY for money and screen titles; Poppins for everything else.
 * Colour comes from <Text tone>. Legacy names (hero/display/heading/label/money) are kept as
 * aliases so older call sites map onto the same scale.
 */
const balance: TextStyle = { fontFamily: fonts.display, fontSize: 44, lineHeight: 50, letterSpacing: -1.6, fontVariant: ["tabular-nums"] };
const largeTitle = { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -1 } as const;
const title = { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 } as const;
const headline = { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24 } as const;
const subhead = { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 } as const;

export const type = {
  balance,
  largeTitle,
  title,
  headline,
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  subhead,
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: "uppercase" },
  amount: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22, fontVariant: ["tabular-nums"] },
  mono: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24, letterSpacing: 2, fontVariant: ["tabular-nums"] },
  /** loud caps for brand moments only (intro, auth band) — the app's take on the landing page's display caps */
  poster: { fontFamily: fonts.display, fontSize: 38, lineHeight: 40, letterSpacing: -1, textTransform: "uppercase" },
  // legacy aliases
  hero: balance,
  display: largeTitle,
  heading: headline,
  label: subhead,
  money: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22, fontVariant: ["tabular-nums"] },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Two elevation levels only. Dark mode leans on surface lift instead. */
export const shadows = {
  lift: "0 1px 2px rgba(20, 10, 30, 0.05), 0 6px 18px -10px rgba(20, 10, 30, 0.18)",
  pop: "0 20px 44px -18px rgba(44, 5, 72, 0.4)",
  float: "0 30px 60px -28px rgba(20, 0, 40, 0.55)",
} as const;

export const motion = {
  fast: 150,
  base: 250,
  slow: 420,
  spring: { damping: 18, stiffness: 240, mass: 0.7 },
  press: { damping: 20, stiffness: 450 },
} as const;
