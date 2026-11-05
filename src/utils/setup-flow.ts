import { router, type Href } from "expo-router";
import type { IconName } from "@/components/icon";
import { TIER_INFO } from "@/services/kyc";
import { TIER_LIMITS, useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";
import { canStart, reviewAge, tierState, type KycSnapshot, type TierStateName } from "@/utils/kyc-state";

export type SetupTaskId = "phone" | "pin" | "identity" | "profile" | "tier2" | "tier3";

export type SetupTask = {
  id: SetupTaskId;
  title: string;
  body: string;
  icon: IconName;
  href: Href;
  done: boolean;
  /** rough minutes, for "about N min left" */
  mins: number;
  /** what finishing it unlocks */
  unlocks: string;
  /** Home card: one plain sentence saying what to do and why */
  pitch: string;
  /** Home card: the button, named for exactly what it starts */
  cta: string;
  /** can't be started yet: submitted and waiting for review, or the tier before it isn't done */
  wait?: "review" | "locked";
  /** shown in place of the minutes while `wait` is set ("In review · 2h ago", "After Tier 2") */
  waitLabel?: string;
  /** listed so the user knows it exists, but onboarding (continueSetup) doesn't push into it */
  later?: boolean;
  /** identity tiers only: the shared state word (utils/kyc-state.ts) */
  state?: TierStateName;
  /** needs_attention: why the last request was rejected */
  reason?: string;
};

type SessionSnapshot = Pick<ReturnType<typeof useSessionStore.getState>, "phoneVerified" | "hasPin" | "world" | "globalAccounts"> & KycSnapshot;

/** Pitch and button per tier state, so every place that lists a tier words it the same way. */
function tierWords(tier: 1 | 2 | 3, start: { pitch: string; cta: string }, t: ReturnType<typeof tierState>) {
  switch (t.state) {
    case "in_review":
      return { pitch: `Submitted ${reviewAge(t.submittedAt) || "recently"}. We'll let you know when it's done.`, cta: "See status", wait: "review" as const, waitLabel: t.submittedAt ? `In review · ${reviewAge(t.submittedAt)}` : "In review" };
    case "needs_attention":
      return { pitch: t.reason ? `${t.reason} Try again when you're ready.` : "Your last try needs another look. Try again when you're ready.", cta: "Try again" };
    case "locked":
      return { ...start, wait: "locked" as const, waitLabel: t.afterTier === 1 ? "After your BVN" : `After Tier ${t.afterTier ?? tier - 1}` };
    default:
      return start;
  }
}

/** Tiers 2 and 3 (NIN + selfie, ID document + address) are human-reviewed. */
function tierTask(s: SessionSnapshot, tier: 2 | 3): SetupTask {
  const info = TIER_INFO[tier];
  const t = tierState(tier, s);
  const words = tierWords(tier, tier === 2
    ? { pitch: `Add your NIN and a selfie to unlock virtual cards, crypto withdrawals and ${TIER_LIMITS[2].daily} a day.`, cta: "Start Tier 2" }
    : { pitch: `Add an ID document and your address for wallets in any currency and ${TIER_LIMITS[3].daily} a day.`, cta: "Start Tier 3" }, t);
  return {
    id: tier === 2 ? "tier2" : "tier3",
    title: `Tier ${tier} · ${info.title}`,
    body: info.steps.map((st) => st.label).join(" · "),
    icon: tier === 2 ? "faceid" : "idcard",
    // only a tier that can be started opens the form; otherwise the verification centre explains
    href: canStart(t) ? { pathname: "/verify/[tier]", params: { tier: String(tier) } } : "/verify",
    done: t.state === "verified",
    mins: tier === 2 ? 2 : 3,
    unlocks: tier === 2 ? `Virtual cards, crypto withdrawals, ${TIER_LIMITS[2].daily}/day` : `New wallets in any currency, ${TIER_LIMITS[3].daily}/day`,
    ...words,
    later: true,
    state: t.state,
    reason: t.reason,
  };
}

/**
 * Everything setup can still ask for, in order. Nothing here blocks the app: new users land on
 * Home right after picking a world and finish these from the "Finish setup" card (or just in time:
 * the PIN is created on the first payment, ID checks when a feature needs them). Tiers 2 and 3
 * come last, flagged `later`.
 */
export function setupTasks(s: SessionSnapshot = useSessionStore.getState()): SetupTask[] {
  const tasks: SetupTask[] = [
    { id: "phone", title: "Verify your phone", body: "A quick code by SMS", icon: "phone", href: "/setup/phone", done: s.phoneVerified, mins: 0.5, unlocks: "Keeps your account safe", pitch: "We'll text you a code. It takes 30 seconds.", cta: "Verify phone" },
    { id: "pin", title: "Create your payment PIN", body: "4 digits that approve payments", icon: "key", href: "/setup/create-pin", done: s.hasPin, mins: 0.5, unlocks: "Send, swap and pay bills", pitch: "Four digits that approve every payment you make.", cta: "Create PIN" },
    identityTask(s),
  ];
  if (s.world === "global") tasks.push({ id: "profile", title: "Get USD, GBP & EUR accounts", body: "Six quick questions", icon: "globe", href: "/setup/profile", done: s.globalAccounts !== "none", mins: 2, unlocks: "Get paid from abroad", pitch: "Answer six quick questions and get paid from abroad.", cta: "Get accounts" });
  // the higher tiers: shown so it's clear what's left and what each unlocks, done when it suits
  tasks.push(tierTask(s, 2), tierTask(s, 3));
  return tasks;
}

/** Tier 1 (BVN + date of birth): a basic, and done once verified or while it's in review (out of the user's hands). */
function identityTask(s: SessionSnapshot): SetupTask {
  const t = tierState(1, s);
  const words = tierWords(1, { pitch: "Your BVN and date of birth, then your NIN and a selfie. You can stop after BVN.", cta: "Verify identity" }, t);
  return {
    id: "identity",
    title: "Verify your identity",
    body: "BVN, then NIN and a selfie",
    icon: "verified",
    href: canStart(t) ? "/setup/bvn" : "/verify",
    done: t.state === "verified" || t.state === "in_review",
    mins: 3,
    unlocks: "Higher limits",
    ...words,
    state: t.state,
    reason: t.reason,
  };
}

/** Leave setup and go back to wherever the app was (Home). */
export const exitSetup = () => router.dismissTo("/");

/**
 * Next unfinished basic task. Once the basics are done, the higher tiers aren't chained in: the
 * user lands on Get set up, where they're listed with what each unlocks. All done: Home, with a
 * little cheer.
 */
export function continueSetup() {
  const tasks = setupTasks();
  const next = tasks.find((t) => !t.done && !t.later);
  if (next) return router.push(next.href);
  if (tasks.some((t) => !t.done)) return router.dismissTo("/get-set-up");
  exitSetup();
  toast("You're all set up", "success");
}
