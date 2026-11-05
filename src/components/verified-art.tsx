import { useEffect, type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming, ZoomIn } from "react-native-reanimated";
import { fonts, palette, useColors } from "@/theme";
import { Icon, type IconName } from "./icon";
import { Gloss, Shine } from "./shine";
import { Stripes } from "./stripes";
import { Text } from "./text";

/**
 * Custom success art for verification steps (phone added, BVN verified): the thing that was
 * checked, drawn from the brand's own pieces (stripes, purple, one orange spark), with a green
 * verified seal popping onto its corner. A little life stays on after: light passing over the
 * card and the glass seal, a green ripple from the seal, twinkling sparks, and on the biometric art
 * a moving scan line. Everything follows the system reduced-motion setting, so with it on the art
 * simply appears and holds still.
 */

/** A tiny four-point spark (two crossed bars). `twinkle` (ms) starts a slow fade-and-grow loop. */
function Spark({ size, color, style, twinkle }: { size: number; color: string; style: ViewStyle; twinkle?: number }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce || twinkle === undefined) return;
    t.value = withDelay(twinkle, withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [reduce, twinkle, t]);
  const glint = useAnimatedStyle(() => ({ opacity: 1 - t.value * 0.55, transform: [{ scale: 1 - t.value * 0.3 }, { rotate: `${t.value * 20}deg` }] }));
  return (
    <Animated.View style={[{ position: "absolute", width: size, height: size, alignItems: "center", justifyContent: "center" }, style, glint]}>
      <View style={{ position: "absolute", width: size, height: size * 0.26, borderRadius: size, backgroundColor: color }} />
      <View style={{ position: "absolute", width: size * 0.26, height: size, borderRadius: size, backgroundColor: color }} />
    </Animated.View>
  );
}

/** A faint green ring that swells out of the seal and fades, now and then: the seal "landing". */
function SealGlow({ size }: { size: number }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(700, withRepeat(withSequence(withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }), withDelay(1600, withTiming(0, { duration: 0 }))), -1));
    return () => cancelAnimation(t);
  }, [reduce, t]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - t.value), transform: [{ scale: 1 + t.value * 0.55 }] }));
  if (reduce) return null;
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: palette.success[500] }, ring]} />;
}

/** Halo behind, seal on the corner, sparks around — the frame both pieces of art share. */
/**
 * `done` = the success version (green seal pops on); without it the same art works as the hero of
 * the step's intro screen ("before" and "after" of one moment).
 */
function VerifiedFrame({ label, seal, done = true, scale = 1, children }: { label: string; seal: ViewStyle; done?: boolean; scale?: number; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ width: 240 * scale, height: 236 * scale, alignItems: "center", justifyContent: "center" }} accessible accessibilityLabel={label}>
      <View style={{ width: 240, height: 236, alignItems: "center", justifyContent: "center", transform: [{ scale }] }}>
      <Animated.View entering={ZoomIn.duration(420)} style={{ position: "absolute", width: 204, height: 204, borderRadius: 102, backgroundColor: c.brandSoft }} />
      <Animated.View entering={FadeInDown.duration(480).easing(Easing.out(Easing.cubic))}>{children}</Animated.View>
      {done && (
      <Animated.View entering={ZoomIn.delay(380).duration(320).easing(Easing.out(Easing.cubic))} style={[{ position: "absolute" }, seal]}>
        <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
          <SealGlow size={56} />
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: palette.success[500], alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px -8px rgba(18,68,31,0.6)" }}>
            {/* glass: a gloss on top and a light streak passing over (clipped to the disc, so the shadow stays) */}
            <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28, overflow: "hidden" }}>
              <Gloss />
              <Shine delay={900} every={2600} strength={0.7} angle={24} />
            </View>
            <Icon name="check" size={26} color={palette.white} weight="bold" />
          </View>
        </View>
      </Animated.View>
      )}
      <Animated.View entering={FadeIn.delay(520)} style={{ position: "absolute", inset: 0 }} pointerEvents="none">
        <Spark size={16} color={palette.orange[500]} style={{ left: 30, top: 42 }} twinkle={600} />
        {/* moves out of the way when the seal sits top-right */}
        <Spark size={10} color={c.brand} style={seal.top !== undefined ? { right: 30, bottom: 52 } : { right: 36, top: 30 }} twinkle={1100} />
        <Spark size={8} color={c.brand} style={{ left: 44, bottom: 44 }} twinkle={1500} />
      </Animated.View>
      </View>
    </View>
  );
}

type ArtProps = { done?: boolean; scale?: number };

const LINE = "rgba(255,255,255,0.18)";

/** Phone number added: a tilted Tribe phone with the one-time code landing on its screen. */
export function PhoneVerifiedArt({ done, scale }: ArtProps = {}) {
  return (
    <VerifiedFrame label={done === false ? "Phone number" : "Phone number verified"} seal={{ right: 40, bottom: 26 }} done={done} scale={scale}>
      <View style={{ transform: [{ rotate: "-8deg" }], width: 118, height: 196, borderRadius: 28, borderCurve: "continuous", backgroundColor: palette.purple[900], padding: 5, boxShadow: "0 18px 32px -14px rgba(44,5,72,0.55)" }}>
        <View style={{ flex: 1, borderRadius: 23, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.purple[700] }}>
          {/* header band in the logo's stripes */}
          <View style={{ height: 70, overflow: "hidden" }}>
            <Stripes band={11} gap={6} count={14} opacity={0.9} />
          </View>
          {/* dynamic island */}
          <View style={{ position: "absolute", top: 7, alignSelf: "center", width: 34, height: 9, borderRadius: 5, backgroundColor: palette.purple[900] }} />

          {/* the one-time code arriving */}
          <Animated.View entering={FadeInDown.delay(260).springify().damping(16)} style={{ marginTop: -22, marginHorizontal: 9, backgroundColor: palette.white, borderRadius: 12, borderCurve: "continuous", paddingVertical: 7, paddingHorizontal: 8, gap: 5 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 8, lineHeight: 10, color: palette.purple[700] }}>Tribe · now</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {Array.from({ length: 6 }, (_, i) => (
                <View key={i} style={{ width: 11, height: 14, borderRadius: 3, backgroundColor: palette.purple[50], alignItems: "center", justifyContent: "center" }}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: palette.purple[500] }} />
                </View>
              ))}
            </View>
          </Animated.View>

          {/* the rest of the screen */}
          <View style={{ marginTop: 14, marginHorizontal: 12, gap: 7 }}>
            <View style={{ width: "70%", height: 6, borderRadius: 3, backgroundColor: LINE }} />
            <View style={{ width: "48%", height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.12)" }} />
          </View>
          <Shine delay={700} every={3400} strength={0.16} />
        </View>
      </View>
    </VerifiedFrame>
  );
}

/** BVN verified: a tilted identity card with the BVN masked on it, stamped with the seal. */
export function BvnVerifiedArt({ name }: { name?: string | null }) {
  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <VerifiedFrame label="BVN verified" seal={{ right: 26, bottom: 44 }}>
      <View style={{ transform: [{ rotate: "-7deg" }], width: 184, height: 118, borderRadius: 18, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.purple[900], padding: 12, boxShadow: "0 18px 32px -14px rgba(44,5,72,0.55)" }}>
        {/* stripes along the right edge, like the logo */}
        <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 54, overflow: "hidden" }}>
          <Stripes band={9} gap={5} count={16} opacity={0.85} />
        </View>

        <Text style={{ fontFamily: fonts.display, fontSize: 11, lineHeight: 13, letterSpacing: 1.5, color: palette.orange[400] }}>BVN</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
          {/* photo: initials, or a head-and-shoulders silhouette */}
          <View style={{ width: 38, height: 38, borderRadius: 19, overflow: "hidden", backgroundColor: palette.purple[500], alignItems: "center", justifyContent: initials ? "center" : "flex-end" }}>
            {initials ? (
              <Text style={{ fontFamily: fonts.display, fontSize: 15, lineHeight: 18, color: palette.white }}>{initials}</Text>
            ) : (
              <>
                <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: palette.purple[100], marginBottom: 2 }} />
                <View style={{ width: 28, height: 12, borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: palette.purple[100] }} />
              </>
            )}
          </View>
          <View style={{ gap: 6 }}>
            <View style={{ width: 66, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.32)" }} />
            <View style={{ width: 44, height: 6, borderRadius: 3, backgroundColor: LINE }} />
          </View>
        </View>

        {/* the 11 digits, masked, in BVN grouping (4 · 4 · 3) */}
        <Animated.View entering={FadeIn.delay(260)} style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: "auto" }}>
          {Array.from({ length: 11 }, (_, i) => (
            <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.6)", marginRight: i === 3 || i === 7 ? 5 : 0 }} />
          ))}
        </Animated.View>
        <Shine delay={700} every={3400} strength={0.18} />
      </View>
    </VerifiedFrame>
  );
}

/** One filled PIN cell: white tile with a brand dot (the last one orange, just entered). */
function PinCell({ size, last }: { size: number; last?: boolean }) {
  return (
    <View style={{ width: size, height: size * 1.2, borderRadius: size * 0.28, backgroundColor: palette.white, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: size * 0.32, height: size * 0.32, borderRadius: size, backgroundColor: last ? palette.orange[500] : palette.purple[600] }} />
    </View>
  );
}

/**
 * Transaction PIN set: a payment waiting for approval, its four PIN cells filled. Four cells on
 * purpose: the transaction PIN is 4 digits.
 */
export function TransactionPinArt({ done, scale }: ArtProps = {}) {
  return (
    <VerifiedFrame label={done === false ? "Transaction PIN" : "Transaction PIN set"} seal={{ right: 24, top: 18 }} done={done} scale={scale}>
      <View style={{ transform: [{ rotate: "-6deg" }], width: 168, borderRadius: 22, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.purple[900], boxShadow: "0 18px 32px -14px rgba(44,5,72,0.55)" }}>
        <View style={{ height: 44, overflow: "hidden" }}>
          <Stripes band={9} gap={5} count={16} opacity={0.9} />
        </View>
        <View style={{ padding: 14, paddingTop: 12, gap: 12 }}>
          <View style={{ gap: 5 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 9, lineHeight: 11, color: palette.purple[100] }}>Approve payment</Text>
            <View style={{ width: 84, height: 9, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.85)" }} />
          </View>
          <Animated.View entering={FadeInDown.delay(260).springify().damping(16)} style={{ flexDirection: "row", gap: 8 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <PinCell key={i} size={26} last={i === 3} />
            ))}
          </Animated.View>
        </View>
        <Shine delay={700} every={3400} strength={0.18} />
      </View>
    </VerifiedFrame>
  );
}

/** The scan line sweeping up and down the frame, and the corners breathing, while it "scans". */
function useScan() {
  const reduce = useReducedMotion();
  const t = useSharedValue(0.5);
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(400, withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) })), -1));
    pulse.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(t);
      cancelAnimation(pulse);
    };
  }, [reduce, t, pulse]);
  const line = useAnimatedStyle(() => ({ top: 8 + t.value * 58, opacity: 0.55 + 0.45 * Math.sin(t.value * Math.PI) }));
  const corners = useAnimatedStyle(() => ({ opacity: 0.7 + pulse.value * 0.3, transform: [{ scale: 1 + pulse.value * 0.04 }] }));
  return { line, corners };
}

/**
 * Face ID / fingerprint: a tilted phone whose screen shows the scan frame (four corners) around
 * the biometric mark, with a scan line moving across it.
 */
export function BiometricArt({ icon, done, scale }: ArtProps & { icon: IconName }) {
  const corner = { position: "absolute" as const, width: 22, height: 22, borderColor: palette.orange[400] };
  const scan = useScan();
  return (
    <VerifiedFrame label="Biometric unlock" seal={{ right: 40, bottom: 26 }} done={done} scale={scale}>
      <View style={{ transform: [{ rotate: "-8deg" }], width: 118, height: 196, borderRadius: 28, borderCurve: "continuous", backgroundColor: palette.purple[900], padding: 5, boxShadow: "0 18px 32px -14px rgba(44,5,72,0.55)" }}>
        <View style={{ flex: 1, borderRadius: 23, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.purple[700], alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "absolute", top: 7, alignSelf: "center", width: 34, height: 9, borderRadius: 5, backgroundColor: palette.purple[900] }} />
          {/* the scan frame */}
          <View style={{ width: 76, height: 76, alignItems: "center", justifyContent: "center" }}>
            <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, scan.corners]}>
              <View style={[corner, { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 10 }]} />
              <View style={[corner, { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 10 }]} />
              <View style={[corner, { left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 10 }]} />
              <View style={[corner, { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 10 }]} />
            </Animated.View>
            <Icon name={icon} size={40} color={palette.white} weight="regular" />
            {/* entrance on the wrapper, the scan's own movement and fade on the line (Reanimated wants them apart) */}
            <Animated.View entering={FadeIn.delay(300)} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
              <Animated.View style={[{ position: "absolute", left: 6, right: 6, top: 44, height: 2, borderRadius: 1, backgroundColor: palette.orange[400], boxShadow: "0 0 10px rgba(255,98,32,0.9)" }, scan.line]} />
            </Animated.View>
          </View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 9, lineHeight: 11, color: palette.purple[100], marginTop: 14 }}>Unlocking Tribe…</Text>
          <Shine delay={700} every={3400} strength={0.16} />
        </View>
      </View>
    </VerifiedFrame>
  );
}

/**
 * Tier unlocked: a level badge — a tilted Tribe plate with the stripes down its edge and the tier
 * number huge in orange — with the green seal popping on. "You levelled up", drawn.
 */
export function TierUnlockedArt({ tier, scale }: { tier: number; scale?: number }) {
  return (
    <VerifiedFrame label={`Tier ${tier} unlocked`} seal={{ right: 30, top: 20 }} scale={scale}>
      <View style={{ transform: [{ rotate: "-7deg" }], width: 146, height: 168, borderRadius: 30, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.purple[900], padding: 16, justifyContent: "space-between", boxShadow: "0 18px 32px -14px rgba(44,5,72,0.55)" }}>
        <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 36, overflow: "hidden" }}>
          <Stripes band={8} gap={5} count={22} opacity={0.9} />
        </View>
        <Text style={{ fontFamily: fonts.display, fontSize: 12, lineHeight: 14, letterSpacing: 2, color: palette.purple[100] }}>TIER</Text>
        <Animated.View entering={ZoomIn.delay(220).springify().damping(9)}>
          <Text style={{ fontFamily: fonts.display, fontSize: 92, lineHeight: 96, letterSpacing: -4, color: palette.orange[400] }}>{tier}</Text>
        </Animated.View>
        <Text style={{ fontFamily: fonts.display, fontSize: 12, lineHeight: 14, letterSpacing: 2, color: palette.white }}>UNLOCKED</Text>
        <Shine delay={700} every={3400} strength={0.18} />
      </View>
    </VerifiedFrame>
  );
}
