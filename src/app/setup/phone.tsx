import { router } from "expo-router";
import { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { groupDigits } from "@/components/keypad-field";
import { NumberPad } from "@/components/pin-pad";
import { PressableScale } from "@/components/pressable-scale";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { COUNTRIES, SIGNUP_COUNTRIES } from "@/data/countries";
import { BandSkip, OnboardingShell } from "@/screens/onboarding/shell";
import { exitSetup } from "@/utils/setup-flow";
import { overlay } from "@/stores/use-overlay-store";
import { useSessionStore } from "@/stores/use-session-store";
import { runWithLoader, toast } from "@/stores/use-ui-store";
import { codeWaitMinutes, sendPhoneCode } from "@/api/auth";
import { errorMessage } from "@/api/http";
import { useSignupStore } from "@/stores/use-signup-store";
import { fonts, radius, spacing, useColors } from "@/theme";

/**
 * Splits a saved number into its country and local digits. Sign-up stores it without a space
 * ("+2348031234567"), older copies with one ("+234 8031234567"), so match the dial code itself:
 * the longest code that fits, preferring a country whose digit count matches what's left.
 */
function parsePhone(raw: string): { country: (typeof COUNTRIES)[number]; digits: string } | null {
  const compact = raw.replace(/[^\d+]/g, "");
  if (!compact.startsWith("+")) return null;
  const matches = COUNTRIES.filter((k) => compact.startsWith(k.dial)).sort((a, b) => b.dial.length - a.dial.length);
  const pick = matches.find((k) => compact.length - k.dial.length === k.digits) ?? matches[0];
  if (!pick) return null;
  const digits = compact.slice(pick.dial.length).replace(/^0/, "");
  return digits ? { country: pick, digits } : null;
}

/** "8031234567" -> "803 123 4567" (3-3-4 for 10 digits, else groups of 3). */
const groupsFor = (n: number) => (n === 10 ? [3, 3, 4] : [3, 3, 3, 3]);
/** faint example digits in the empty slots, so the shape of the number shows before you type */
const GHOST = "8035550142";

/**
 * The number, big, one slot per digit: typed digits in full ink, the rest as faint examples, a
 * gap between groups, and (while typing) an underline under the slot the next digit lands in.
 */
function NumberSlots({ digits, length, typing }: { digits: string; length: number; typing: boolean }) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const groups = groupsFor(length);
  const gaps = groups.length - 1;
  const slot = Math.min(26, Math.floor((width - spacing.mdl * 2 - spacing.md * 2 - gaps * 10) / length));
  const ends = groups.reduce<number[]>((acc, g) => [...acc, (acc.at(-1) ?? 0) + g], []);
  return (
    <View style={{ flexDirection: "row", justifyContent: "center" }}>
      {Array.from({ length }, (_, i) => {
        const typed = i < digits.length;
        const next = typing && i === digits.length;
        return (
          <View key={i} style={{ width: slot, marginRight: ends.includes(i + 1) && i < length - 1 ? 10 : 0, alignItems: "center", gap: 4 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: slot * 1.15, lineHeight: slot * 1.4, color: typed ? c.text : c.textSubtle, opacity: typed ? 1 : 0.35, fontVariant: ["tabular-nums"] }}>
              {typed ? digits[i] : GHOST[i % GHOST.length]}
            </Text>
            <View style={{ width: slot - 6, height: 3, borderRadius: 2, backgroundColor: next ? c.brand : "transparent" }} />
          </View>
        );
      })}
    </View>
  );
}

/**
 * Verify phone, on one page. The number from sign-up is read back big, one slot per digit, with
 * "Tap to change"; tapping it docks OUR full-size number pad (never the system keyboard) above
 * Send code, and the band shrinks so the pad gets the room. No number yet: empty slots, same tap.
 */
export default function Phone() {
  const c = useColors();
  const { height } = useWindowDimensions();
  const saved = useSessionStore((s) => s.user.phone);
  const draftPhone = useSignupStore((s) => s.draft.phone);
  const setUser = useSessionStore((s) => s.setUser);
  const known = parsePhone(saved) ?? parsePhone(draftPhone);
  const [typing, setTyping] = useState(false);
  const [country, setCountry] = useState(known?.country ?? SIGNUP_COUNTRIES[0]);
  const [number, setNumber] = useState(known?.digits ?? "");
  const valid = number.length === country.digits;
  const changed = !!known && (known.country.iso !== country.iso || known.digits !== number);
  // the pad fills its share of the screen: big keys on tall phones, still thumb-sized on an SE
  const keyHeight = height < 700 ? 52 : height < 820 ? 60 : 68;

  const pickCountry = () =>
    overlay.select({
      title: "Country code",
      value: country.iso,
      options: SIGNUP_COUNTRIES.map((k) => ({ value: k.iso, label: k.name, trailing: k.dial, leading: <CoinIcon code={k.flag} size={34} /> })),
      onSelect: (v) => {
        const next = SIGNUP_COUNTRIES.find((k) => k.iso === v)!;
        setCountry(next);
        setNumber((n) => n.slice(0, next.digits));
      },
    });

  // a leading 0 is the trunk prefix ("0803…"), not part of the number
  const onKey = (d: string) => setNumber((n) => (n === "" && d === "0" ? n : (n + d).slice(0, country.digits)));
  const onDelete = () => setNumber((n) => n.slice(0, -1));

  const send = async () => {
    setTyping(false);
    const phone = `${country.dial} ${number}`;
    try {
      const { debugCode } = await runWithLoader("Sending your code…", sendPhoneCode(phone));
      useSignupStore.getState().set({ debugCode: debugCode ?? null });
      setUser({ phone });
      router.push({ pathname: "/setup/otp", params: { phone } });
    } catch (e) {
      const minutes = codeWaitMinutes(e);
      toast(minutes ? `Too many codes. Try again in ${minutes} min.` : errorMessage(e), "danger");
    }
  };

  const left = country.digits - number.length;
  const status = typing ? (valid ? "Looks good" : number ? `${left} more digit${left === 1 ? "" : "s"}` : "Start with the number after the 0") : known && !changed ? "The number you gave us" : number ? "Tap to change" : "Tap to enter your number";

  return (
    <OnboardingShell
      title="Verify your phone"
      headline={known ? ["Is this", "your number?"] : ["Drop your", "number."]}
      icon="phone"
      slim={typing}
      right={<BandSkip onPress={exitSetup} />}
      subtitle={typing ? undefined : "We'll text a one-time code to this number."}
      footer={
        <View style={{ gap: spacing.sm }}>
          {typing && (
            <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutDown.duration(140)}>
              <NumberPad onKey={onKey} onDelete={onDelete} keyHeight={keyHeight} />
            </Animated.View>
          )}
          <Button title="Send code" disabled={!valid} onPress={send} />
        </View>
      }
    >
      {/* the number card: country chip, the big slots, and what to do next */}
      <View style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", paddingVertical: spacing.lg, paddingHorizontal: spacing.md, gap: spacing.md, borderWidth: 1.5, borderColor: typing ? c.brand : "transparent", boxShadow: typing ? "0 0 0 4px rgba(105,13,172,0.12)" : undefined }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <PressableScale onPress={pickCountry} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Country ${country.name}, ${country.dial}. Change`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surfaceAlt, borderRadius: radius.full, paddingLeft: 4, paddingRight: spacing.smd, paddingVertical: 4 }}>
            <CoinIcon code={country.flag} size={26} />
            <Text variant="bodyStrong">{country.dial}</Text>
            <Icon name="chevronDown" size={10} color={c.textMuted} weight="bold" />
          </PressableScale>
          {typing ? (
            <PressableScale onPress={() => setTyping(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Done, hide keypad" style={{ backgroundColor: c.brandSoft, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 6 }}>
              <Text variant="subhead" tone="brand">
                Done
              </Text>
            </PressableScale>
          ) : (
            valid && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Icon name="checkCircle" size={14} color={c.success} />
                <Text variant="caption" tone="success">
                  Ready
                </Text>
              </View>
            )
          )}
        </View>

        <Pressable onPress={() => setTyping((t) => !t)} accessibilityRole="button" accessibilityLabel={`Phone number ${country.dial} ${groupDigits(number, groupsFor(country.digits)) || "empty"}`} accessibilityHint={typing ? "Hides the keypad" : "Opens the keypad to change it"}>
          <NumberSlots digits={number} length={country.digits} typing={typing} />
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs }}>
          {!typing && <Icon name="pencil" size={11} color={c.textMuted} />}
          <Text variant="caption" tone={typing && valid ? "success" : "muted"} align="center">
            {status}
          </Text>
        </View>
      </View>

      {changed && !typing && (
        <PressableScale
          onPress={() => {
            setCountry(known.country);
            setNumber(known.digits);
          }}
          hitSlop={8}
          accessibilityRole="button"
          style={{ alignSelf: "center" }}
        >
          <Text variant="caption" tone="brand">
            Use {known.country.dial} {groupDigits(known.digits, groupsFor(known.country.digits))} instead
          </Text>
        </PressableScale>
      )}
      {!typing && (
        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", justifyContent: "center" }}>
          <Icon name="lock" size={13} color={c.textSubtle} />
          <Text variant="caption" tone="subtle">
            Only used to secure your account. We never share it.
          </Text>
        </View>
      )}
    </OnboardingShell>
  );
}
