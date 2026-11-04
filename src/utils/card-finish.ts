import type { CardFinish, CardPattern, CardTheme } from "@/data/seed";
import type { CardDesignResource, CardDesignsResource } from "@/api/types";
import { CARD_PATTERNS, CARD_PRESETS, CARD_SWATCHES, CARD_THEME_ORDER, palette, type CardLook } from "@/theme";
import { bestInk, contrast, hexToHsl, hslToHex, mix, withAlpha } from "./color";

/**
 * Card finishes: a preset id ("midnight") or a user-made one ("custom:FF7A5C:waves"). Everything
 * that paints a card or tints a page around it goes through `cardLook()`, which never throws:
 * an unknown value (old data, a hand-typed link) falls back to Midnight.
 */

const PATTERN_IDS: readonly string[] = CARD_PATTERNS.map((p) => p.id);
const CUSTOM_RE = /^custom:([0-9a-fA-F]{6}):([a-z]+)$/;
const WHITE = palette.white;
const INK = palette.ink[900];

export const isPresetFinish = (v: unknown): v is CardTheme => typeof v === "string" && Object.prototype.hasOwnProperty.call(CARD_PRESETS, v);

const PRESET_RE = /^([a-z]+):([a-z]+)$/;

/** The pattern a preset wears unless you pick another (Midnight's own stripes count as "Stripes"). */
export function defaultPattern(theme: CardTheme): CardPattern {
  const p = CARD_PRESETS[theme].pattern;
  return p === "brand" ? "stripes" : p;
}

/** A preset wearing a pattern; its own pattern collapses back to the plain preset id. */
export function presetFinish(theme: CardTheme, pattern: CardPattern): CardFinish {
  return pattern === defaultPattern(theme) ? theme : `${theme}:${pattern}`;
}

/** The preset and pattern of a "sunset:dots" finish, or null. */
export function readPreset(f: unknown): { theme: CardTheme; pattern: CardPattern } | null {
  if (typeof f !== "string") return null;
  const m = PRESET_RE.exec(f);
  if (!m || !isPresetFinish(m[1]) || !PATTERN_IDS.includes(m[2])) return null;
  return { theme: m[1], pattern: m[2] as CardPattern };
}

/** Which pattern a finish shows (for pickers). */
export function patternOf(f: string): CardPattern {
  if (isPresetFinish(f)) return defaultPattern(f);
  return readPreset(f)?.pattern ?? readCustom(f)?.pattern ?? "plain";
}

/** The colour and pattern of a user-made finish, or null for presets / junk. */
export function readCustom(f: unknown): { hex: string; pattern: CardPattern } | null {
  if (typeof f !== "string") return null;
  const m = CUSTOM_RE.exec(f);
  if (!m || !PATTERN_IDS.includes(m[2])) return null;
  return { hex: `#${m[1].toUpperCase()}`, pattern: m[2] as CardPattern };
}

export function customFinish(hex: string, pattern: CardPattern): CardFinish {
  return `custom:${hex.replace("#", "").toUpperCase()}:${pattern}`;
}

/** Route params, persisted data and dev links → a valid finish (Midnight when unreadable). */
export function parseFinish(v: unknown): CardFinish {
  if (isPresetFinish(v)) return v;
  const p = readPreset(v);
  if (p) return presetFinish(p.theme, p.pattern);
  const c = readCustom(v);
  return c ? customFinish(c.hex, c.pattern) : "midnight";
}

// hue buckets for naming a slider colour ("Deep teal", "Soft pink")
const HUES: [number, string][] = [
  [14, "Red"],
  [40, "Orange"],
  [62, "Yellow"],
  [85, "Lime"],
  [150, "Green"],
  [182, "Teal"],
  [205, "Aqua"],
  [248, "Blue"],
  [272, "Indigo"],
  [312, "Violet"],
  [345, "Pink"],
  [361, "Red"],
];

/** A swatch's own name, or a plain description of the colour. */
export function colourName(hex: string) {
  const swatch = CARD_SWATCHES.find((s) => s.hex.toUpperCase() === hex.toUpperCase());
  if (swatch) return swatch.name;
  const { h, s, l } = hexToHsl(hex);
  if (s < 0.12) return l > 0.85 ? "Pearl" : l < 0.22 ? "Graphite" : "Grey";
  const hue = HUES.find(([max]) => h < max)?.[1] ?? "Red";
  return l >= 0.68 ? `Soft ${hue.toLowerCase()}` : l <= 0.34 ? `Deep ${hue.toLowerCase()}` : hue;
}

/** Darken (or lighten) a colour step by step until it reads as text on `page`. */
function readableOn(page: string, h: number, s: number, l: number, step: number) {
  let out = hslToHex({ h, s, l });
  for (let i = 0, ll = l; i < 16 && contrast(out, page) < 4.5; i++) {
    ll += step;
    out = hslToHex({ h, s, l: ll });
  }
  return out;
}

function derive(hex: string, pattern: CardPattern): CardLook {
  const bg = hex;
  const fg = bestInk(bg, WHITE, INK);
  const light = fg === INK;
  const { h, s, l } = hexToHsl(bg);
  const word = CARD_PATTERNS.find((p) => p.id === pattern)?.word;
  const ink =
    pattern === "plain"
      ? { line: withAlpha(WHITE, light ? 0.28 : 0.1), lineSoft: withAlpha("#000000", light ? 0.06 : 0.2) }
      : { line: withAlpha(fg, light ? 0.34 : 0.42), lineSoft: withAlpha(fg, light ? 0.15 : 0.2) };
  const page = { light: hslToHex({ h, s: Math.min(s, 0.55), l: 0.95 }), dark: hslToHex({ h, s: Math.min(s, 0.45), l: 0.07 }) };
  // the action colour is the card's own, darkened on light pages / lightened on dark ones until it reads
  const accent = { light: readableOn(page.light, h, s, l, -0.05), dark: readableOn(page.dark, h, Math.min(s, 0.75), Math.max(l, 0.62), 0.05) };
  return {
    name: word ? `${colourName(bg)} ${word}` : colourName(bg),
    bg,
    fg,
    sub: mix(bg, fg, 0.72),
    mark: fg,
    ...ink,
    swatch: [mix(bg, WHITE, 0.25), mix(bg, "#000000", 0.2)],
    shadow: `0 26px 44px -26px ${withAlpha(mix(bg, "#000000", 0.55), light ? 0.55 : 0.85)}`,
    pattern,
    light,
    page,
    accent,
    accentFg: { light: bestInk(accent.light, WHITE, INK), dark: bestInk(accent.dark, WHITE, INK) },
    soft: { light: hslToHex({ h, s: Math.min(s, 0.55), l: 0.88 }), dark: hslToHex({ h, s: Math.min(s, 0.4), l: 0.16 }) },
  };
}

/**
 * A preset in another pattern: same colours and page tints, the pattern's ink re-tuned (a plain
 * card gets a sheen; a preset that was plain gets lines in its own ink).
 */
function presetWith(theme: CardTheme, pattern: CardPattern): CardLook {
  const base = CARD_PRESETS[theme];
  const p = theme === "midnight" && pattern === "stripes" ? "brand" : pattern;
  if (p === base.pattern) return base;
  const word = CARD_PATTERNS.find((x) => x.id === pattern)?.word || "solid";
  const ink =
    p === "plain"
      ? { line: withAlpha(WHITE, base.light ? 0.45 : 0.08), lineSoft: withAlpha("#000000", base.light ? 0.06 : 0.25) }
      : base.pattern === "plain" || base.pattern === "brand"
        ? { line: withAlpha(base.fg, base.light ? 0.32 : 0.4), lineSoft: withAlpha(base.fg, base.light ? 0.14 : 0.18) }
        : { line: base.line, lineSoft: base.lineSoft };
  return { ...base, ...ink, pattern: p, name: `${base.name} ${word}` };
}

// slider drags make lots of finishes; keep the cache small
const cache = new Map<string, CardLook>();

/** Everything a finish paints. Never throws. */
export function cardLook(f?: string | null): CardLook {
  if (isPresetFinish(f)) return CARD_PRESETS[f];
  const preset = readPreset(f);
  const c = preset ? null : readCustom(f);
  if (!preset && !c) return CARD_PRESETS.midnight;
  const key = f as string;
  let look = cache.get(key);
  if (!look) {
    if (cache.size >= 64) cache.clear();
    look = preset ? presetWith(preset.theme, preset.pattern) : derive(c!.hex, c!.pattern);
    cache.set(key, look);
  }
  return look;
}

// ─── what the admin offers ──────────────────────────────────────────────

export type ThemeOption = { id: CardTheme; name: string };
export type PatternOption = { id: CardPattern; name: string };
export type SwatchOption = { name: string; hex: string };
/** The designs pickers offer, in the admin's order and with the admin's names. */
export type AvailableDesigns = { themes: ThemeOption[]; patterns: PatternOption[]; swatches: SwatchOption[] };

const FALLBACK_DESIGNS: AvailableDesigns = {
  themes: CARD_THEME_ORDER.map((id) => ({ id, name: CARD_PRESETS[id].name })),
  patterns: CARD_PATTERNS.map((p) => ({ id: p.id, name: p.label })),
  swatches: CARD_SWATCHES,
};

const byOrder = (a: CardDesignResource, b: CardDesignResource) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);

/**
 * GET /card-designs → what the pickers show: enabled designs whose keys this app can paint,
 * sorted as the admin sorted them (unknown keys are skipped). Before the catalogue has ever
 * loaded (or when it's empty) the app's own lists stand in.
 */
export function availableDesigns(catalog: CardDesignsResource | null | undefined): AvailableDesigns {
  if (!catalog) return FALLBACK_DESIGNS;
  const on = (list: CardDesignResource[] | null | undefined) => (list ?? []).filter((d) => d.enabled).sort(byOrder);
  const themes = on(catalog.themes).flatMap((d): ThemeOption[] => (isPresetFinish(d.finish) ? [{ id: d.finish, name: d.name || CARD_PRESETS[d.finish].name }] : []));
  const patterns = on(catalog.patterns).flatMap((d): PatternOption[] => (d.pattern && PATTERN_IDS.includes(d.pattern) ? [{ id: d.pattern as CardPattern, name: d.name }] : []));
  const swatches = on(catalog.swatches).flatMap((d): SwatchOption[] => (d.hex_color && /^#?[0-9a-fA-F]{6}$/.test(d.hex_color) ? [{ name: d.name, hex: `#${d.hex_color.replace("#", "").toUpperCase()}` }] : []));
  // nothing usable at all (empty or never seeded): don't leave the customer with an empty picker
  if (!themes.length && !patterns.length) return FALLBACK_DESIGNS;
  return { themes: dedupe(themes, (t) => t.id), patterns: dedupe(patterns, (p) => p.id), swatches: dedupe(swatches, (s) => s.hex) };
}

function dedupe<T>(list: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  return list.filter((x) => !seen.has(key(x)) && !!seen.add(key(x)));
}

/** The patterns a preset may wear: the enabled ones, plus its own (a bare preset is always valid). */
export function patternsFor(theme: CardTheme, avail: AvailableDesigns): PatternOption[] {
  const own = defaultPattern(theme);
  if (avail.patterns.some((p) => p.id === own)) return avail.patterns;
  return [{ id: own, name: CARD_PATTERNS.find((p) => p.id === own)?.label ?? own }, ...avail.patterns];
}

/** Would the API accept this finish now? (mirrors the server: theme on, pattern on; a bare theme implies its own pattern) */
export function isFinishOffered(f: string, avail: AvailableDesigns): boolean {
  if (isPresetFinish(f)) return avail.themes.some((t) => t.id === f);
  const preset = readPreset(f);
  if (preset) return avail.themes.some((t) => t.id === preset.theme) && patternsFor(preset.theme, avail).some((p) => p.id === preset.pattern);
  const custom = readCustom(f);
  return !!custom && avail.patterns.some((p) => p.id === custom.pattern);
}

/** A finish's name with the admin's wording ("Sunset dots", "Coral waves"); falls back to cardLook(). */
export function finishName(f: string, avail: AvailableDesigns): string {
  const look = cardLook(f);
  const patternWord = (p: CardPattern) => avail.patterns.find((x) => x.id === p)?.name.toLowerCase();
  const preset = isPresetFinish(f) ? { theme: f, pattern: defaultPattern(f) } : readPreset(f);
  if (preset) {
    const base = avail.themes.find((t) => t.id === preset.theme)?.name ?? CARD_PRESETS[preset.theme].name;
    if (preset.pattern === defaultPattern(preset.theme)) return base;
    return `${base} ${preset.pattern === "plain" ? "solid" : (patternWord(preset.pattern) ?? CARD_PATTERNS.find((x) => x.id === preset.pattern)?.word ?? "")}`.trim();
  }
  const custom = readCustom(f);
  if (!custom) return look.name;
  const colour = avail.swatches.find((s) => s.hex === custom.hex)?.name ?? colourName(custom.hex);
  return custom.pattern === "plain" ? colour : `${colour} ${patternWord(custom.pattern) ?? CARD_PATTERNS.find((x) => x.id === custom.pattern)?.word ?? ""}`.trim();
}
