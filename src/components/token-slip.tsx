import { useEffect, useState } from "react";
import { Pressable, Text as RNText, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { copyToClipboard } from "@/components/bits";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { fonts, radius, spacing, type as typeScale, useColors } from "@/theme";

/** Plex Mono's advance width, in ems: every character (digit or space) is exactly this wide. */
const ADVANCE = 0.6;
const CHAR_MS = 34;
const GROUP_PAUSE_MS = 110;

/** Tokens already typed on this session: a token types itself in once, then it's just printed. */
const TYPED = new Set<string>();

/** "4821093755123307…" → "4821 0937 5512 …": the groups people key into a meter. */
export const groupToken = (token: string) => (token.replace(/\s/g, "").match(/.{1,4}/g) ?? []).join(" ");

/** How many characters are on the paper: counts up with a typewriter rhythm (a beat between groups). */
function useTyped(text: string, animate: boolean) {
  const [n, setN] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate || n >= text.length) return;
    const t = setTimeout(() => setN(n + 1), text[n] === " " ? GROUP_PAUSE_MS : CHAR_MS);
    return () => clearTimeout(t);
  }, [animate, n, text]);
  return n;
}

/**
 * An electricity token as a typed slip: the 20 digits on a ruled line in IBM Plex Mono (the only
 * place Plex is used), then dot-leader rows (Meter ···· 0412…) like a filled-in form. Tap to copy.
 * `typeOn` lets a NEW token type itself in once, with a block caret that blinks out; older
 * tokens, a second visit and Reduce Motion print it straight away.
 */
export function TokenSlip({ token, rows = [], typeOn = false }: { token: string; rows?: [string, string][]; typeOn?: boolean }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const text = groupToken(token);
  const digits = text.replace(/\s/g, "");
  const [animate] = useState(() => typeOn && !reduce && !TYPED.has(digits));
  const n = useTyped(text, animate);
  const done = n >= text.length;

  // one line, sized to the slip: 24 characters at Plex's fixed advance
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const size = width ? Math.max(14, Math.min(24, Math.floor((width / (text.length * ADVANCE)) * 0.97))) : 18;
  const charW = size * ADVANCE;

  // the caret sits on the next character while typing, blinks three times at the end, then goes
  const caret = useSharedValue(animate ? 1 : 0);
  useEffect(() => {
    if (!animate) return;
    TYPED.add(digits);
  }, [animate, digits]);
  useEffect(() => {
    if (!animate || !done) return;
    caret.set(withSequence(withRepeat(withSequence(withTiming(0, { duration: 260 }), withTiming(1, { duration: 260 })), 3), withTiming(0, { duration: 220 })));
  }, [animate, done, caret]);
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.get() }));

  return (
    <Pressable onPress={() => copyToClipboard(digits, "Token copied")} accessibilityRole="button" accessibilityLabel={`Token ${text}. Tap to copy`}>
      {({ pressed }) => (
        <View style={{ backgroundColor: c.sunken, borderRadius: radius.input, borderCurve: "continuous", borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.smd, gap: spacing.smd, opacity: pressed ? 0.7 : 1 }}>
          {/* the typed line: untyped characters are on the paper already, just without ink, so nothing reflows */}
          <View onLayout={onLayout}>
            <View style={{ borderBottomWidth: 1, borderColor: c.borderStrong, paddingBottom: spacing.xs }}>
              <RNText selectable numberOfLines={1} style={{ ...typeScale.typed, fontSize: size, lineHeight: Math.round(size * 1.35), color: c.text }}>
                {text.slice(0, n)}
                <RNText style={{ color: "transparent" }}>{text.slice(n)}</RNText>
              </RNText>
              {animate && <Animated.View pointerEvents="none" style={[{ position: "absolute", left: n * charW, top: Math.round(size * 0.12), width: Math.max(2, Math.round(charW * 0.55)), height: Math.round(size * 1.1), backgroundColor: c.brand, borderRadius: 1 }, caretStyle]} />}
            </View>
          </View>

          {rows.map(([label, value]) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center" }}>
              <RNText style={{ fontFamily: fonts.typed, fontSize: 12, lineHeight: 16, color: c.textMuted }}>{label}</RNText>
              {/* dot leader: a dotted rule on the baseline (a row of "·" text ellipsised on web) */}
              <View style={{ flex: 1, alignSelf: "flex-end", marginBottom: 4, marginHorizontal: spacing.xs, borderBottomWidth: 1.5, borderStyle: "dotted", borderColor: c.textSubtle }} />
              <RNText numberOfLines={1} style={{ fontFamily: fonts.typed, fontSize: 12, lineHeight: 16, color: c.text, fontVariant: ["tabular-nums"] }}>
                {value}
              </RNText>
            </View>
          ))}

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-end" }}>
            <Icon name="copy" size={11} color={c.textMuted} />
            <Text variant="caption" tone="muted">
              Tap to copy
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
