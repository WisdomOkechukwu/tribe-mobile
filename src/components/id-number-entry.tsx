import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Linking, useWindowDimensions, View } from "react-native";
import { toast } from "@/stores/use-ui-store";
import { fonts, radius, spacing, useColors } from "@/theme";
import { Icon } from "./icon";
import { useCompactPad } from "./keypad-field";
import { NumberPad } from "./pin-pad";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** Read as 3 · 4 · 4. */
const GROUPS = [3, 4, 4];
/** faint example digits in the empty slots, so the number's shape shows before you type */
const GHOST = "22198765432";
/** the USSD code that reads a BVN back on the line linked to your bank */
const BVN_USSD = "*565*0#";

/**
 * BVN / NIN entry, the same language as the phone step: one card with the number big, one slot
 * per digit (typed in full ink, the rest as faint examples, an underline under the next one), a
 * live status line, and Paste in the card's corner. Typed on our keypad, never the system
 * keyboard; the pad fills whatever room is left. BVN also offers a tap-to-dial *565*0#.
 */
export function IdNumberEntry({
  label,
  value,
  onChange,
  length = 11,
  help,
  error,
  disabled = false,
  compactPad,
}: {
  label: "BVN" | "NIN" | string;
  value: string;
  onChange: (v: string) => void;
  length?: number;
  help?: string;
  /** shown in red under the number (the help line stays) */
  error?: string;
  disabled?: boolean;
  /** force the short keypad (screens with a band and a footer above/below it) */
  compactPad?: boolean;
}) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const autoCompact = useCompactPad();
  const compact = compactPad ?? autoCompact;
  const [room, setRoom] = useState(0);
  const full = value.length === length;
  const left = length - value.length;
  const slot = Math.min(compact ? 22 : 25, Math.floor((width - spacing.mdl * 2 - spacing.md * 2 - (GROUPS.length - 1) * 10) / length));
  const ends = GROUPS.reduce<number[]>((acc, g) => [...acc, (acc.at(-1) ?? 0) + g], []);

  const paste = async () => {
    const digits = (await Clipboard.getStringAsync().catch(() => "")).replace(/\D/g, "");
    if (digits.length >= length) {
      onChange(digits.slice(0, length));
      toast(`${label} pasted`);
    } else toast(`No ${length}-digit ${label} on your clipboard`, "danger");
  };

  // before the first digit the status line carries the help (where to find the number), so nothing repeats below
  const status = error ?? (full ? `All ${length} digits in` : value ? `${left} more digit${left === 1 ? "" : "s"}` : label === "BVN" || !help ? `Your ${length}-digit ${label}` : help);
  const statusTone = error ? "danger" : full ? "success" : "muted";

  return (
    <View style={{ gap: compact ? spacing.smd : spacing.md, flexGrow: 1 }}>
      <View
        accessible
        accessibilityLabel={`${label}, ${value.length} of ${length} digits entered`}
        style={{
          backgroundColor: c.surface,
          borderRadius: radius.card,
          borderCurve: "continuous",
          padding: spacing.md,
          paddingTop: spacing.smd,
          gap: compact ? spacing.sm : spacing.md,
          borderWidth: 1.5,
          borderColor: error ? c.danger : disabled ? "transparent" : c.brand,
          boxShadow: error || disabled ? undefined : "0 0 0 4px rgba(105,13,172,0.12)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name="shield" size={13} color={c.brandText} />
          </View>
          <Text variant="overline" tone="muted">
            Your {label}
          </Text>
          <View style={{ flex: 1 }} />
          {!disabled && (
            <PressableScale onPress={paste} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Paste ${label}`} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.brandSoft, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 6 }}>
              <Icon name="copy" size={12} color={c.brandText} />
              <Text variant="subhead" tone="brand">
                Paste
              </Text>
            </PressableScale>
          )}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "center" }}>
          {Array.from({ length }, (_, i) => {
            const ch = value[i];
            const next = !disabled && i === value.length;
            return (
              <View key={i} style={{ width: slot, marginRight: ends.includes(i + 1) && i < length - 1 ? 10 : 0, alignItems: "center", gap: 4 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: slot * 1.15, lineHeight: slot * 1.4, color: ch ? c.text : c.textSubtle, opacity: ch ? 1 : 0.35, fontVariant: ["tabular-nums"] }}>{ch ?? GHOST[i % GHOST.length]}</Text>
                <View style={{ width: slot - 5, height: 3, borderRadius: 2, backgroundColor: next ? c.brand : "transparent" }} />
              </View>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {full && !error && <Icon name="checkCircle" size={12} color={c.success} />}
          <Text variant="caption" tone={statusTone} align="center">
            {status}
          </Text>
        </View>
      </View>

      {/* BVN has a code to dial; anything else carries its help in the card */}
      {label === "BVN" ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, flexWrap: "wrap" }}>
          <Text variant="caption" tone="muted">
            Don&apos;t know your BVN?
          </Text>
          <PressableScale
            onPress={() => Linking.openURL(`tel:${encodeURIComponent(BVN_USSD)}`).catch(() => toast(`Dial ${BVN_USSD} on the line linked to your bank`))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Dial ${BVN_USSD} to get your BVN`}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surface, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 6 }}
          >
            <Icon name="phone" size={12} color={c.brandText} />
            <Text variant="subhead">Dial {BVN_USSD}</Text>
          </PressableScale>
        </View>
      ) : null}

      {!disabled && (
        // measures the room it has and sizes the keys to fill it (four rows), so the pad is big
        // where there's space and still fits on small phones
        <View style={{ flexGrow: 1, flexShrink: 1, justifyContent: "center", paddingBottom: spacing.lg }} onLayout={(e) => setRoom(e.nativeEvent.layout.height - spacing.lg)}>
          <NumberPad
            compact={compact}
            keyHeight={room ? Math.max(46, Math.min(72, Math.floor((room - spacing.sm * 3) / 4))) : undefined}
            onKey={(d) => value.length < length && onChange(value + d)}
            onDelete={() => onChange(value.slice(0, -1))}
          />
        </View>
      )}
    </View>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DATE_PARTS = [
  { label: "DD", from: 0, len: 2, ghost: "14" },
  { label: "MM", from: 2, len: 2, ghost: "03" },
  { label: "YYYY", from: 4, len: 4, ghost: "1998" },
] as const;

/** Can these digits still become a real DD MM YYYY? Refuses day 00 or 32+, month 00 or 13+, and a year not starting 1 or 2. */
function fitsDate(digits: string) {
  if (digits.length > 8) return false;
  const [d1, d2, m1, m2] = [...digits].map(Number);
  if (d1 > 3) return false;
  if (digits.length >= 2 && (d1 * 10 + d2 < 1 || d1 * 10 + d2 > 31)) return false;
  if (digits.length >= 3 && m1 > 1) return false;
  if (digits.length >= 4 && (m1 * 10 + m2 < 1 || m1 * 10 + m2 > 12)) return false;
  if (digits.length >= 5 && digits[4] !== "1" && digits[4] !== "2") return false;
  return true;
}

/** "14031998" → { words: "14 March 1998", age: 28 }, or null while it isn't a real date yet. */
function readDate(digits: string) {
  if (digits.length !== 8) return null;
  const [d, m, y] = [Number(digits.slice(0, 2)), Number(digits.slice(2, 4)), Number(digits.slice(4, 8))];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  const now = new Date();
  const age = now.getUTCFullYear() - y - (now.getUTCMonth() < m - 1 || (now.getUTCMonth() === m - 1 && now.getUTCDate() < d) ? 1 : 0);
  return { words: `${d} ${MONTHS[m - 1]} ${y}`, age };
}

/**
 * Date of birth, the same language as the BVN card: three boxes (DD · MM · YYYY) filling from our
 * keypad, faint example digits in the empty ones, an underline under the next digit, and a status
 * line that reads the finished date back in words with the age. `invalid` names what's wrong.
 */
export function DateEntry({ value, onChange, help, error, invalid }: { value: string; onChange: (v: string) => void; help?: string; error?: string; /** a full date that can't be used (not real, or under 18) */ invalid?: string }) {
  const c = useColors();
  const compact = useCompactPad();
  const [room, setRoom] = useState(0);
  const read = readDate(value);
  const problem = error ?? (value.length === 8 ? invalid : undefined);
  const status = problem ?? (read ? `${read.words} · ${read.age} years old` : value ? `${8 - value.length} more digit${8 - value.length === 1 ? "" : "s"}` : "Day, month, then year");

  return (
    <View style={{ gap: compact ? spacing.smd : spacing.md, flexGrow: 1 }}>
      <View
        accessible
        accessibilityLabel={`Date of birth, ${read ? read.words : `${value.length} of 8 digits entered`}`}
        style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, paddingTop: spacing.smd, gap: spacing.md, borderWidth: 1.5, borderColor: problem ? c.danger : c.brand, boxShadow: problem ? undefined : "0 0 0 4px rgba(105,13,172,0.12)" }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name="calendar" size={13} color={c.brandText} />
          </View>
          <Text variant="overline" tone="muted">
            Date of birth
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {DATE_PARTS.map((part) => {
            const typed = value.slice(part.from, part.from + part.len);
            const here = value.length >= part.from && value.length < part.from + part.len;
            return (
              <View key={part.label} style={{ flex: part.len, gap: 6 }}>
                <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.input, borderCurve: "continuous", borderWidth: 1.5, borderColor: here ? c.brand : "transparent", paddingVertical: spacing.smd, flexDirection: "row", justifyContent: "center" }}>
                  {Array.from({ length: part.len }, (_, i) => {
                    const ch = typed[i];
                    const next = here && i === typed.length;
                    return (
                      <View key={i} style={{ width: 20, alignItems: "center", gap: 2 }}>
                        <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: ch ? c.text : c.textSubtle, opacity: ch ? 1 : 0.35, fontVariant: ["tabular-nums"] }}>{ch ?? part.ghost[i]}</Text>
                        <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: next ? c.brand : "transparent" }} />
                      </View>
                    );
                  })}
                </View>
                <Text variant="caption" tone={here ? "brand" : "subtle"} align="center" style={{ fontFamily: fonts.semibold, letterSpacing: 1 }}>
                  {part.label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {read && !problem && <Icon name="checkCircle" size={12} color={c.success} />}
          <Text variant="caption" tone={problem ? "danger" : read ? "success" : "muted"} align="center">
            {status}
          </Text>
        </View>
      </View>

      {help && (
        <Text variant="caption" tone="muted" align="center" style={{ paddingHorizontal: spacing.md }}>
          {help}
        </Text>
      )}

      <View style={{ flexGrow: 1, flexShrink: 1, justifyContent: "center", paddingBottom: spacing.lg }} onLayout={(e) => setRoom(e.nativeEvent.layout.height - spacing.lg)}>
        <NumberPad
          compact={compact}
          keyHeight={room ? Math.max(46, Math.min(72, Math.floor((room - spacing.sm * 3) / 4))) : undefined}
          onKey={(d) => fitsDate(value + d) && onChange(value + d)}
          onDelete={() => onChange(value.slice(0, -1))}
        />
      </View>
    </View>
  );
}
