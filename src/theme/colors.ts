import { palette as p } from "./palette";

/**
 * Semantic colour roles — design system v2 ("Revolut-clean").
 * Neutral surfaces, ONE primary (brand purple) for actions/selection, orange only as a
 * highlight (dots, promos, Cashpoint/referral moments), green/red only for money up/down.
 * Dark mode is purple-black with surface lift instead of shadows.
 */
const light = {
  bg: "#F5F3F7",
  surface: "#FFFFFF",
  surfaceAlt: "#EFEBF3",
  sunken: "#EAE6EE",
  text: "#14101A",
  textMuted: "#6E6878",
  textSubtle: "#A29BAB",
  border: "rgba(20, 16, 26, 0.08)",
  borderStrong: "rgba(20, 16, 26, 0.16)",
  brand: p.purple[500],
  brandText: p.purple[500],
  brandSoft: "#F1E8F8",
  accent: p.orange[500],
  accentText: p.orange[700],
  accentSoft: "#FFF0E8",
  success: "#1E9A45",
  successSoft: "#E6F6EB",
  danger: "#E0322B",
  dangerSoft: "#FDECEB",
  warning: p.warning[500],
  warningSoft: "#FFF7DB",
  /** in-progress / pending states (amber that holds white text) */
  pending: "#E8A400",
  onBrand: p.white,
  /** promo / tag-card / hero art */
  card: p.purple[500],
  cardText: p.white,
  cardMuted: p.purple[100],
  tabBar: "#FFFFFF",
  overlay: "rgba(20, 3, 36, 0.45)",
};

export type ThemeColors = Record<keyof typeof light, string>;

const dark: ThemeColors = {
  bg: "#0B0612",
  surface: "#15101D",
  surfaceAlt: "#1D1626",
  sunken: "#120C19",
  text: "#F4F0F8",
  textMuted: "#A79FB3",
  textSubtle: "#6F6680",
  border: "rgba(255, 255, 255, 0.07)",
  borderStrong: "rgba(255, 255, 255, 0.14)",
  brand: "#8B3FD0",
  brandText: "#C9A6EC",
  brandSoft: "#25153A",
  accent: p.orange[400],
  accentText: p.orange[300],
  accentSoft: "#2E1A12",
  success: "#4CC774",
  successSoft: "#10281A",
  danger: "#FF6B63",
  dangerSoft: "#2E1214",
  warning: p.warning[300],
  warningSoft: "#2A2410",
  pending: "#F5B82E",
  onBrand: p.white,
  card: p.purple[700],
  cardText: p.white,
  cardMuted: p.purple[100],
  tabBar: "#0F0A16",
  overlay: "rgba(0, 0, 0, 0.6)",
};

export const schemes = { light, dark } as const;
