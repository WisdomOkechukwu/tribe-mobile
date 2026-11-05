import { router } from "expo-router";
import { TIER_INFO } from "@/services/kyc";
import { overlay } from "@/stores/use-overlay-store";
import { toast } from "@/stores/use-ui-store";
import { useSessionStore, type KycTier } from "@/stores/use-session-store";

/**
 * Opening a new wallet (any currency or coin) needs every check done: email (at sign-up), phone
 * (Finish setup), and all three identity tiers — BVN, NIN + selfie, ID document + address.
 */
export const WALLET_TIER: KycTier = 3;

type KycSnapshot = { kycTier: KycTier; kycStatus: string; phoneVerified: boolean };

export const walletsUnlocked = (s: KycSnapshot) => s.phoneVerified && s.kycTier >= WALLET_TIER;

/** Selector-friendly hook: re-renders only when the answer flips. */
export const useWalletsUnlocked = () => useSessionStore((s) => walletsUnlocked(s));

/** The identity tiers still to do, in order (e.g. ["BVN", "NIN + selfie", "ID document + address"]). */
export function missingSteps(s: KycSnapshot) {
  const steps: string[] = s.phoneVerified ? [] : ["phone number"];
  for (let t = s.kycTier + 1; t <= WALLET_TIER; t++) steps.push(t === 1 ? "BVN" : TIER_INFO[t as 1 | 2 | 3].title);
  return steps;
}

/**
 * Runs `onOk` if the user may open a wallet; otherwise explains what's left and offers the next
 * tier. Every "open / create a wallet" entry point goes through this.
 */
export function guardWalletOpen(onOk: () => void) {
  const s = useSessionStore.getState();
  if (walletsUnlocked(s)) return onOk();
  const pending = s.kycStatus === "pending";
  const steps = missingSteps(s);
  const next = s.kycTier + 1;
  overlay.notice({
    icon: "shield",
    tone: "brand",
    title: "Finish verification first",
    body: pending
      ? "We're still reviewing your last check. You can open new wallets once every verification step is approved."
      : `New wallets open once you're fully verified. Still to do: ${steps.join(", ")}.`,
    actions: pending
      ? [{ label: "View verification", onPress: () => setTimeout(() => router.push("/verify"), 50) }, { label: "Not now", tone: "secondary" }]
      : [
          { label: "Continue verification", onPress: () => setTimeout(() => (s.phoneVerified ? router.push({ pathname: "/verify/[tier]", params: { tier: String(next) } }) : router.push("/setup/phone")), 50) },
          { label: "Not now", tone: "secondary" },
        ],
  });
}

/** Dollar cards need Tier 2 (NIN + selfie). */
export const CARD_TIER: KycTier = 2;

/**
 * Every "get a card" entry point: verified enough → straight into card creation; otherwise to the
 * next verification tier first (`then=card` chains tier by tier, then opens card creation).
 */
export function openCardCreation() {
  const s = useSessionStore.getState();
  if (s.kycTier >= CARD_TIER) return router.push("/card-new");
  toast("Verify your identity first. Then your card.");
  router.push({ pathname: "/verify/[tier]", params: { tier: String(s.kycTier + 1), then: "card" } });
}
