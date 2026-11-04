import { router } from "expo-router";
import { TIER_INFO } from "@/services/kyc";
import { overlay } from "@/stores/use-overlay-store";
import { toast } from "@/stores/use-ui-store";
import { useSessionStore, type KycTier } from "@/stores/use-session-store";
import { canStart, tierState, type VerifyTier } from "@/utils/kyc-state";

/**
 * Opening a new wallet (any currency or coin) needs every check done: email (at sign-up), phone
 * (Finish setup), and all three identity tiers — BVN, NIN + selfie, ID document + address.
 */
export const WALLET_TIER: KycTier = 3;

type KycSnapshot = { kycTier: KycTier; phoneVerified: boolean };

export const walletsUnlocked = (s: KycSnapshot) => s.phoneVerified && s.kycTier >= WALLET_TIER;

/** Selector-friendly hook: re-renders only when the answer flips. */
export const useWalletsUnlocked = () => useSessionStore((s) => walletsUnlocked(s));

/** The identity tiers still to do, in order (e.g. ["BVN", "NIN + selfie", "ID document + address"]). */
export function missingSteps(s: KycSnapshot) {
  const steps: string[] = s.phoneVerified ? [] : ["phone number"];
  for (let t = s.kycTier + 1; t <= WALLET_TIER; t++) steps.push(t === 1 ? "BVN" : TIER_INFO[t as VerifyTier].title);
  return steps;
}

/**
 * The one way into a tier's form. Only a tier that can be started (available, or needs attention
 * after a rejection) opens it; one in review says so and shows the verification centre, so the same
 * request is never sent twice. `then: "card"` carries on into card creation once approved.
 */
export function openVerification(tier: VerifyTier, opts: { then?: "card" } = {}) {
  const state = tierState(tier);
  if (canStart(state)) return router.push({ pathname: "/verify/[tier]", params: { tier: String(tier), ...(opts.then ? { then: opts.then } : {}) } });
  if (state.state === "in_review") toast(`Tier ${tier} is in review. We'll let you know when it's done.`);
  else if (state.state === "locked" && state.afterTier && tierState(state.afterTier).state === "in_review") toast(`Tier ${state.afterTier} is in review. Tier ${tier} comes after.`);
  router.push("/verify");
}

/** The tier being reviewed right now, if any. */
const tierInReview = () => ([1, 2, 3] as const).find((t) => tierState(t).state === "in_review");

/**
 * Runs `onOk` if the user may open a wallet; otherwise explains what's left and offers the next
 * tier. Every "open / create a wallet" entry point goes through this.
 */
export function guardWalletOpen(onOk: () => void) {
  const s = useSessionStore.getState();
  if (walletsUnlocked(s)) return onOk();
  const reviewing = tierInReview();
  const steps = missingSteps(s);
  const next = Math.min(3, s.kycTier + 1) as VerifyTier;
  overlay.notice({
    icon: "shield",
    tone: "brand",
    title: "Finish verification first",
    body: reviewing
      ? `Tier ${reviewing} is in review. You can open new wallets once every verification step is approved.`
      : `New wallets open once you're fully verified. Still to do: ${steps.join(", ")}.`,
    actions: reviewing
      ? [{ label: "See verification", onPress: () => setTimeout(() => router.push("/verify"), 50) }, { label: "Not now", tone: "secondary" }]
      : [
          { label: "Continue verification", onPress: () => setTimeout(() => (s.phoneVerified ? openVerification(next) : router.push("/setup/phone")), 50) },
          { label: "Not now", tone: "secondary" },
        ],
  });
}

/** Dollar cards need Tier 2 (NIN + selfie). */
export const CARD_TIER: KycTier = 2;

/**
 * Every "get a card" entry point: verified enough → straight into card creation; otherwise to the
 * next verification tier first (`then=card` chains tier by tier, then opens card creation). A tier
 * in review isn't reopened: the verification centre shows where it stands.
 */
export function openCardCreation() {
  const s = useSessionStore.getState();
  if (s.kycTier >= CARD_TIER) return router.push("/card-new");
  const next = (s.kycTier + 1) as VerifyTier;
  if (canStart(tierState(next))) toast("Verify your identity first. Then your card.");
  openVerification(next, { then: "card" });
}
