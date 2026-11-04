import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import Animated, { cancelAnimation, Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { FlowProgress } from "@/components/flow-progress";
import { Icon, type IconName } from "@/components/icon";
import { DateEntry, IdNumberEntry } from "@/components/id-number-entry";
import { PressableScale } from "@/components/pressable-scale";
import { Shine } from "@/components/shine";
import { Stripes } from "@/components/stripes";
import { Text } from "@/components/text";
import { TierUnlockedArt } from "@/components/verified-art";
import { cleanDocumentNumber, DOCUMENTS, TIER_INFO, type DocumentType, type KycOutcome, type VerifyStepId } from "@/services/kyc";
import { submitKyc } from "@/api/auth";
import { ApiError, errorMessage } from "@/api/http";
import { TIER_LIMITS, type KycTier } from "@/stores/use-session-store";
import { canStart, reviewAge, tierState, type TierState } from "@/utils/kyc-state";
import { palette, radius, spacing, useColors } from "@/theme";

function SelfieFrame() {
  const c = useColors();
  const reduce = useReducedMotion();
  const scan = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    scan.value = withRepeat(withTiming(1, { duration: 1600 }), -1, true);
    return () => cancelAnimation(scan);
  }, [scan, reduce]);
  const line = useAnimatedStyle(() => ({ top: `${10 + scan.value * 80}%` }));
  return (
    <View style={{ alignSelf: "center", width: 220, height: 280, borderRadius: 120, borderWidth: 4, borderColor: palette.purple[500], overflow: "hidden", backgroundColor: c.sunken, alignItems: "center", justifyContent: "center" }}>
      <Icon name="person" size={110} color={c.borderStrong} weight="regular" />
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, height: 3, backgroundColor: palette.orange[500], boxShadow: "0 0 12px rgba(255,98,32,0.9)" }, line]} />
    </View>
  );
}

/** What each tier switches on, as perk rows. */
const UNLOCKS: Record<Exclude<KycTier, 0>, { icon: IconName; title: string; body: string }[]> = {
  1: [
    { icon: "send", title: "Bigger sends", body: "Move up to ₦1,000,000 a day." },
    { icon: "bolt", title: "Bills, no stress", body: "Airtime, data, TV and light with room to spare." },
    { icon: "swap", title: "Swap more", body: "Naira, dollars and crypto at higher limits." },
  ],
  2: [
    { icon: "card", title: "Virtual dollar cards", body: "Netflix, Spotify, Apple and any site online." },
    { icon: "bitcoin", title: "Crypto withdrawals", body: "Send your coins to any wallet." },
    { icon: "cashpoint", title: "Bigger Cashpoints", body: "Make codes for larger amounts." },
  ],
  3: [
    { icon: "globe", title: "Wallets in any currency", body: "Open USD, GBP, EUR, crypto and more." },
    { icon: "gauge", title: "Highest limits", body: "Up to ₦25,000,000 a day." },
    { icon: "verified", title: "Fully verified", body: "Every feature on Tribe is now yours." },
  ],
};

/** A slow drift up and down, so the badge feels alive without bouncing. */
function useDrift() {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(600, withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [reduce, t]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: -4 + t.value * 8 }] }));
}

/**
 * A tier is on: just approved ("Tier 2 unlocked.") or already was ("You're verified."). The
 * badge floats with its glass seal; a poster headline; the limit on a striped card with light
 * passing over it; what's unlocked, sliding in one by one; and the next tier, if it can start.
 */
function TierUnlocked({ tier, onDone, already = false }: { tier: Exclude<KycTier, 0>; onDone: () => void; already?: boolean }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const drift = useDrift();
  const before = TIER_LIMITS[(tier - 1) as KycTier];
  const after = TIER_LIMITS[tier];
  const nextTier = tier < 3 ? ((tier + 1) as Exclude<KycTier, 0>) : null;
  const canNext = nextTier ? canStart(tierState(nextTier)) : false;
  const enter = (i: number) => (reduce ? undefined : FadeInDown.delay(240 + i * 90).duration(380).easing(Easing.out(Easing.cubic)));
  const lines = already ? ["You're", "verified."] : [`Tier ${tier}`, "unlocked."];
  return (
    <View style={{ flex: 1, gap: spacing.md }}>
      <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.md }}>
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <Animated.View style={drift}>
            <TierUnlockedArt tier={tier} scale={0.86} />
          </Animated.View>
          <Animated.View entering={enter(0)} style={{ alignItems: "center", gap: spacing.xs }}>
            <Text variant="poster" align="center" accessibilityRole="header" maxFontSizeMultiplier={1.2} style={{ fontSize: 32, lineHeight: 34 }}>
              {lines[0]}
              {"\n"}
              <Text variant="poster" style={{ fontSize: 32, lineHeight: 34, color: palette.orange[400] }}>
                {lines[1]}
              </Text>
            </Text>
            <Text variant="body" tone="muted" align="center">
              {already ? `Tier ${tier} is on for your account.` : "Your limits just went up."}
            </Text>
          </Animated.View>
        </View>

        {/* the limit, on a card in the brand's stripes, with light passing over it */}
        <Animated.View entering={enter(1)}>
          <View style={{ borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.purple[900], padding: spacing.md, gap: spacing.xs }}>
            <View pointerEvents="none" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 54, overflow: "hidden" }}>
              <Stripes band={9} gap={5} count={16} opacity={0.85} />
            </View>
            <Text variant="caption" style={{ color: palette.purple[100] }}>
              Your daily limit
            </Text>
            <Text variant="title" style={{ color: palette.white, paddingRight: 64 }} adjustsFontSizeToFit numberOfLines={1}>
              {after.daily}
              {!already && before.daily !== after.daily && (
                <Text variant="caption" style={{ color: palette.purple[100] }}>
                  {"  "}was {before.daily}
                </Text>
              )}
            </Text>
            <Text variant="caption" style={{ color: palette.purple[100] }}>
              Max balance: {after.balance}
            </Text>
            <Shine delay={900} every={3600} strength={0.2} />
          </View>
        </Animated.View>

        <View style={{ gap: spacing.sm }}>
          <Animated.View entering={enter(2)}>
            <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
              {already ? "What you've got" : "Now unlocked"}
            </Text>
          </Animated.View>
          {UNLOCKS[tier].map((p, i) => (
            <Animated.View key={p.title} entering={enter(3 + i)} style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.smd }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: i === 0 ? c.accentSoft : c.brandSoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name={p.icon} size={17} color={i === 0 ? c.accentText : c.brandText} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{p.title}</Text>
                <Text variant="caption" tone="muted">
                  {p.body}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={{ gap: spacing.xs }}>
        {nextTier && canNext ? (
          <>
            <Button title={`Unlock Tier ${nextTier}`} onPress={() => router.push({ pathname: "/verify/[tier]", params: { tier: String(nextTier) } })} />
            <Button title="Done" variant="ghost" onPress={onDone} />
          </>
        ) : (
          <Button title={already ? "Done" : "Let's go"} onPress={onDone} />
        )}
      </View>
    </View>
  );
}

/** "01021995" → "1995-02-01" if it's a real date for someone 18 to 120, else null. */
function birthDate(digits: string): string | null {
  if (digits.length !== 8) return null;
  const [d, m, y] = [Number(digits.slice(0, 2)), Number(digits.slice(2, 4)), Number(digits.slice(4, 8))];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  const now = new Date();
  const age = now.getUTCFullYear() - y - (now.getUTCMonth() < m - 1 || (now.getUTCMonth() === m - 1 && now.getUTCDate() < d) ? 1 : 0);
  return age >= 18 && age <= 120 ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;
}

/** The API's field names → the step that collects them (a 422 sends the user back there). */
const FIELD_STEP: Record<string, VerifyStepId> = { bvn: "bvn", date_of_birth: "dob", nin: "nin", document_type: "docType", document_number: "docNumber", address: "address" };

type Values = { bvn: string; dob: string; nin: string; docType: DocumentType | null; docNumber: string; address: string };
const EMPTY: Values = { bvn: "", dob: "", nin: "", docType: null, docNumber: "", address: "" };

/** How a run ended (or why it can't start). Every tier ends on one of these. */
type Result =
  | { kind: "approved" }
  | { kind: "in_review"; submittedAt?: string }
  | { kind: "needs_attention"; reason?: string }
  | { kind: "already_verified" }
  | { kind: "blocked"; message: string; afterTier?: Exclude<KycTier, 0> }
  | { kind: "error"; message: string };

const OUTCOME: Record<Result["kind"], KycOutcome["status"]> = { approved: "approved", already_verified: "approved", in_review: "pending", needs_attention: "failed", blocked: "cancelled", error: "failed" };

/** A tier that can't be started right now (deep link, stale button): say where it stands instead of the form. */
function guardResult(state: TierState): Result | null {
  if (canStart(state)) return null;
  if (state.state === "verified") return { kind: "already_verified" };
  if (state.state === "in_review") return { kind: "in_review", submittedAt: state.submittedAt };
  const after = state.afterTier;
  const reviewing = after ? tierState(after).state === "in_review" : false;
  return { kind: "blocked", afterTier: after, message: reviewing ? `Tier ${after} is in review. You can start this once it's done.` : `Finish Tier ${after ?? state.tier - 1} first.` };
}

/** The status screens: a big icon, a title, one sentence, and what to do. */
function ResultView({ icon, bg, fg, title, body, children }: { icon: IconName; bg: string; fg: string; title: string; body: string; children: ReactNode }) {
  return (
    <Animated.View entering={FadeIn} style={{ flex: 1, gap: spacing.md }}>
      <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={44} color={fg} />
        </View>
        <Text variant="title" align="center">
          {title}
        </Text>
        <Text variant="body" tone="muted" align="center">
          {body}
        </Text>
      </View>
      <View style={{ flex: 1 }} />
      {children}
    </Animated.View>
  );
}

/**
 * One verification run for a tier, the same for every tier and every entry point (Finish setup,
 * the verification centre, card and wallet gates): intro → each step in TIER_INFO[tier].steps →
 * submit → one of the result screens. A tier that's verified, in review or locked never shows the
 * form (checked when the flow opens), so a request can't be sent twice; the API refuses it too.
 */
export function VerifyFlow({ tier, chain = false, onFinished, onSkip, onFormStep }: { tier: Exclude<KycTier, 0>; /** Tier 1 only: carry straight on into Tier 2 (NIN + selfie) in the same flow */ chain?: boolean; onFinished: (outcome: KycOutcome) => void; onSkip?: () => void; /** true while a form step is showing (not the intro or a result), so the host can give it room */ onFormStep?: (inForm: boolean) => void }) {
  const c = useColors();
  // identity is one flow: BVN and date of birth (Tier 1, checked at once), then NIN and a selfie
  // (Tier 2, reviewed). Each tier is still its own request to the API. BVN already done: the
  // flow simply starts at NIN.
  const [plan] = useState<Exclude<KycTier, 0>[]>(() => {
    if (!chain || tier !== 1) return [tier];
    if (canStart(tierState(1))) return [1, 2];
    return tierState(1).state === "verified" && canStart(tierState(2)) ? [2] : [1];
  });
  // judged once, when the flow opens: a submit later moves the tier to "in review" without
  // swapping the result screen out from under the user
  const [opening] = useState(() => tierState(plan[0]));
  const steps = plan.flatMap((t) => TIER_INFO[t].steps.map((st) => ({ ...st, tier: t })));
  // the tier the last request was for; result screens talk about it
  const [current, setCurrent] = useState<Exclude<KycTier, 0>>(plan[0]);
  // shown on the NIN step once BVN went through mid-flow
  const [unlocked, setUnlocked] = useState<Exclude<KycTier, 0> | null>(null);
  const [at, setAt] = useState<"intro" | number>("intro");
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<VerifyStepId, string>>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(() => guardResult(opening));
  const inForm = !result && at !== "intro";
  useEffect(() => {
    onFormStep?.(inForm);
  }, [inForm, onFormStep]);

  const set = (patch: Partial<Values>, field: VerifyStepId) => {
    setValues((v) => ({ ...v, ...patch }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };
  const done = (r: Result) => onFinished({ status: OUTCOME[r.kind], reference: null });
  const document = DOCUMENTS.find((d) => d.value === values.docType);

  const validFor = (id: VerifyStepId) => {
    switch (id) {
      case "bvn":
        return values.bvn.length === 11;
      case "nin":
        return values.nin.length === 11;
      case "dob":
        return !!birthDate(values.dob);
      case "docType":
        return !!values.docType;
      case "docNumber":
        return !!document?.valid(cleanDocumentNumber(values.docNumber));
      case "address":
        return values.address.trim().length >= 8;
      case "selfie":
        return true;
    }
  };

  const submit = async (t: Exclude<KycTier, 0> = current) => {
    setBusy(true);
    setCurrent(t);
    const body =
      t === 1
        ? { bvn: values.bvn, date_of_birth: birthDate(values.dob) ?? "" }
        : t === 2
          ? { nin: values.nin }
          : { document_type: values.docType ?? "", document_number: cleanDocumentNumber(values.docNumber), address: values.address.trim() };
    const lastOfTier = steps.reduce((i, st, n) => (st.tier === t ? n : i), -1);
    try {
      const profile = await submitKyc(t, body);
      const r: Result = profile.kyc_tier >= t ? { kind: "approved" } : profile.kyc_status === "rejected" || profile.kyc_status === "failed" ? { kind: "needs_attention", reason: tierState(t).reason } : { kind: "in_review" };
      Haptics.notificationAsync(r.kind === "needs_attention" ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success).catch(() => {});
      // approved with more of the plan to go (BVN, then NIN): carry on, if the next tier can start
      const following = steps[lastOfTier + 1];
      if (r.kind === "approved" && following && canStart(tierState(following.tier))) {
        setUnlocked(t);
        setAt(lastOfTier + 1);
      } else setResult(r);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      if (e instanceof ApiError && e.code === "VERIFICATION_IN_REVIEW") setResult({ kind: "in_review", submittedAt: tierState(t).submittedAt });
      else if (e instanceof ApiError && e.code === "ALREADY_VERIFIED") setResult({ kind: "already_verified" });
      else if (e instanceof ApiError && e.code === "TIER_ORDER") setResult({ kind: "blocked", message: e.message, afterTier: (t - 1) as Exclude<KycTier, 0> });
      else if (e instanceof ApiError && Object.keys(e.fieldErrors).length) {
        // back to the first step the API didn't like, with its message under the field
        const next: Partial<Record<VerifyStepId, string>> = {};
        for (const [field, messages] of Object.entries(e.fieldErrors)) if (FIELD_STEP[field]) next[FIELD_STEP[field]] = messages[0];
        const first = steps.findIndex((st) => st.tier === t && next[st.id]);
        setErrors(next);
        if (first >= 0) setAt(first);
        else setResult({ kind: "error", message: errorMessage(e) });
      } else setResult({ kind: "error", message: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  // ─── results ─────────────────────────────────────────────────────────
  if (result) {
    switch (result.kind) {
      case "approved":
        return <TierUnlocked tier={current} onDone={() => done(result)} />;
      case "already_verified":
        return <TierUnlocked tier={current} already onDone={() => done(result)} />;
      case "in_review":
        return (
          <ResultView icon="clock" bg={c.warningSoft} fg={c.text} title={`Tier ${current} is in review`} body={`${unlocked ? `Your BVN is verified, so Tier ${unlocked} is already on. ` : ""}Submitted ${result.submittedAt ? reviewAge(result.submittedAt) : "just now"}. We'll notify you when it's done, usually within a day.`}>
            <Button title="Done" onPress={() => done(result)} />
          </ResultView>
        );
      case "needs_attention":
        return (
          <ResultView icon="warning" bg={c.dangerSoft} fg={c.danger} title={`Tier ${current} needs attention`} body={result.reason ?? "Check your details and try again."}>
            <Button
              title="Try again"
              onPress={() => {
                setResult(null);
                // start again at the tier that needs attention, not at BVN
                const from = steps.findIndex((st) => st.tier === current);
                setAt(unlocked && from > 0 ? from : "intro");
              }}
            />
            <Button title="Later" variant="ghost" onPress={() => done(result)} />
          </ResultView>
        );
      case "blocked":
        return (
          <ResultView icon="lock" bg={c.sunken} fg={c.textMuted} title={`Tier ${current} isn't open yet`} body={result.message}>
            {result.afterTier && canStart(tierState(result.afterTier)) ? (
              <Button title={`Start Tier ${result.afterTier}`} onPress={() => router.replace({ pathname: "/verify/[tier]", params: { tier: String(result.afterTier) } })} />
            ) : (
              <Button title="Done" onPress={() => done(result)} />
            )}
          </ResultView>
        );
      case "error":
        return (
          <ResultView icon="warning" bg={c.dangerSoft} fg={c.danger} title="We couldn't send it" body={result.message}>
            <Button
              title="Try again"
              loading={busy}
              onPress={() => {
                setResult(null);
                submit(current);
              }}
            />
            <Button title="Later" variant="ghost" onPress={() => done(result)} />
          </ResultView>
        );
    }
  }

  // ─── intro: what you get, what you'll do ─────────────────────────────
  if (at === "intro") {
    const top = plan[plan.length - 1];
    const before = TIER_LIMITS[(plan[0] - 1) as KycTier].daily;
    return (
      <View style={{ gap: spacing.lg, flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.lg }}>
          {opening.state === "needs_attention" && (
            <View style={{ flexDirection: "row", gap: spacing.smd, backgroundColor: c.dangerSoft, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
              <Icon name="warning" size={16} color={c.danger} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">Last time this needed attention</Text>
                <Text variant="caption" tone="muted">
                  {opening.reason ?? "Check your details and try again."}
                </Text>
              </View>
            </View>
          )}

          {/* what you get: the new limit is the reason to do this, so it leads */}
          <View style={{ backgroundColor: c.brandSoft, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, gap: spacing.xs }}>
            <Text variant="caption" tone="muted">
              Your daily limit goes to
            </Text>
            <Text variant="title" adjustsFontSizeToFit numberOfLines={1}>
              {TIER_LIMITS[top].daily}
              <Text variant="caption" tone="muted">
                {"  "}from {before}
              </Text>
            </Text>
            <Text variant="body" tone="muted">
              {plan.length > 1 ? `${TIER_INFO[2].unlocks} Your BVN is checked straight away; NIN and selfie are checked by our team.` : TIER_INFO[top].unlocks}
            </Text>
          </View>

          {/* what you'll do: the real steps, in order, each with what to expect */}
          <View>
            {steps.map((st, i) => (
              <View key={st.id} style={{ flexDirection: "row", gap: spacing.smd }}>
                <View style={{ alignItems: "center", width: 28 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
                    <Text variant="subhead" style={{ color: c.onBrand }}>
                      {i + 1}
                    </Text>
                  </View>
                  {i < steps.length - 1 && <View style={{ width: 2, flex: 1, minHeight: spacing.md, backgroundColor: c.border, marginVertical: spacing.xs }} />}
                </View>
                <View style={{ flex: 1, gap: 2, paddingBottom: i < steps.length - 1 ? spacing.md : 0, paddingTop: 3 }}>
                  <Text variant="bodyStrong">{st.title}</Text>
                  <Text variant="body" tone="muted">
                    {st.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={{ gap: spacing.smd }}>
          <Button title="Agree and start" onPress={() => setAt(0)} />
          <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", paddingHorizontal: spacing.xs }}>
            <View style={{ paddingTop: 1 }}>
              <Icon name="lock" size={12} color={c.textSubtle} />
            </View>
            <Text variant="caption" tone="muted" style={{ flex: 1 }}>
              By starting, you agree to Tribe checking your details against official records. We never sell your data.
            </Text>
          </View>
          {onSkip && <Button title="Skip for now" variant="ghost" onPress={onSkip} />}
        </View>
      </View>
    );
  }

  // ─── the steps ───────────────────────────────────────────────────────
  const step = steps[at];
  const lastOfTier = at === steps.length - 1 || steps[at + 1].tier !== step.tier;
  const last = at === steps.length - 1;
  const next = () => (lastOfTier ? submit(step.tier) : setAt(at + 1));
  // back never crosses into a tier that's already been sent
  const back = () => setAt(at === 0 || (unlocked && steps[at - 1].tier === unlocked) ? "intro" : at - 1);
  const error = errors[step.id];
  const keypad = step.id === "bvn" || step.id === "nin" || step.id === "dob";
  // first step after a tier was just sent: no way back into it, and "Finish later" is offered
  const justUnlocked = !!unlocked && steps[at - 1]?.tier === unlocked;
  const canGoBack = !justUnlocked;

  const body = (
    <>
      {/* the BVN, NIN and date cards name themselves, so those steps skip the heading */}
      {!keypad && (
        <View style={{ gap: spacing.xs }}>
          <Text variant="headline">{step.title}</Text>
          <Text variant="body" tone="muted">
            {step.id === "docNumber" && document ? `${document.label}: ${document.hint}. ${step.body}` : step.body}
          </Text>
        </View>
      )}

      {(step.id === "bvn" || step.id === "nin") && (
        <IdNumberEntry label={step.label} length={11} value={values[step.id as "bvn" | "nin"]} onChange={(v) => set({ [step.id]: v.replace(/\D/g, "").slice(0, 11) }, step.id)} help={step.body} error={error ?? undefined} compactPad />
      )}
        {step.id === "dob" && (
          <DateEntry
            value={values.dob}
            onChange={(v) => set({ dob: v.replace(/\D/g, "").slice(0, 8) }, "dob")}
            help={step.body}
            error={error ?? undefined}
            invalid={birthDate(values.dob) ? undefined : "Enter a real date. You need to be 18 or older."}
          />
        )}

        {step.id === "selfie" && (
          <View style={{ gap: spacing.md }}>
            <SelfieFrame />
            <Text variant="caption" tone="subtle" align="center">
              Demo mode: no photo is taken.
            </Text>
          </View>
        )}

        {step.id === "docType" && (
          <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
            {DOCUMENTS.map((d) => {
              const on = values.docType === d.value;
              return (
                <PressableScale
                  key={d.value}
                  scaleTo={0.98}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => set({ docType: d.value, docNumber: on ? values.docNumber : "" }, "docType")}
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, padding: spacing.md, borderRadius: radius.input, borderCurve: "continuous", backgroundColor: on ? c.brandSoft : c.surface, borderWidth: 1.5, borderColor: on ? c.brand : "transparent" }}
                >
                  <Icon name="idcard" size={18} color={on ? c.brandText : c.textMuted} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong">{d.label}</Text>
                    <Text variant="caption" tone="muted">
                      {d.hint}
                    </Text>
                  </View>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 0 : 1.5, borderColor: c.borderStrong, backgroundColor: on ? c.brand : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {on && <Icon name="check" size={12} color={c.onBrand} weight="bold" />}
                  </View>
                </PressableScale>
              );
            })}
            {error && (
              <Text variant="caption" tone="danger">
                {error}
              </Text>
            )}
          </View>
        )}

        {step.id === "docNumber" && document && (
          <Field
            label={`${document.label} number`}
            value={values.docNumber}
            onChangeText={(t) => set({ docNumber: t.toUpperCase().slice(0, 24) }, "docNumber")}
            placeholder={document.placeholder}
            autoCapitalize="characters"
            autoFocus
            mono
            hint={error ?? (values.docNumber && !validFor("docNumber") ? `That doesn't look right: ${document.hint}.` : undefined)}
            hintTone={error || (values.docNumber && !validFor("docNumber")) ? "danger" : "muted"}
          />
        )}

        {step.id === "address" && (
          <Field
            label="Home address"
            value={values.address}
            onChangeText={(t) => set({ address: t.slice(0, 200) }, "address")}
            placeholder="12 Admiralty Way, Lekki Phase 1, Lagos"
            multiline
            autoFocus
            textContentType="fullStreetAddress"
            autoComplete="street-address"
            style={{ minHeight: 72, textAlignVertical: "top" }}
            hint={error ?? "Street, area and city."}
            hintTone={error ? "danger" : "muted"}
          />
        )}
    </>
  );

  return (
    <View style={{ gap: spacing.md, flex: 1 }}>
      {/* one slim row: back a step, where you are, how far to go */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
        {canGoBack && (
          <PressableScale onPress={back} disabled={busy} hitSlop={10} accessibilityRole="button" accessibilityLabel="Previous step" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
            <Icon name="back" size={14} color={c.text} />
          </PressableScale>
        )}
        <View style={{ flex: 1 }}>
          <FlowProgress
            steps={steps.map((st) => st.label)}
            at={at}
            action={
              justUnlocked ? (
                <PressableScale onPress={() => done({ kind: "approved" })} disabled={busy} hitSlop={10} accessibilityRole="button" accessibilityLabel="Finish later" style={{ backgroundColor: c.surface, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 4 }}>
                  <Text variant="caption" tone="brand">
                    Finish later
                  </Text>
                </PressableScale>
              ) : undefined
            }
          />
        </View>
      </View>


      {/* the keypad needs the room, so its steps don't scroll; the rest can */}
      {keypad ? (
        <View style={{ flex: 1, gap: spacing.md }}>{body}</View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.md }}>
          {body}
        </ScrollView>
      )}

      <View style={{ gap: spacing.xs }}>
        <Button
          title={step.id === "selfie" ? (last ? "Capture and submit" : "Capture") : lastOfTier ? (last ? "Submit" : "Verify and continue") : "Continue"}
          icon={step.id === "selfie" ? "camera" : undefined}
          disabled={!validFor(step.id)}
          loading={busy}
          onPress={next}
        />
      </View>
    </View>
  );
}
