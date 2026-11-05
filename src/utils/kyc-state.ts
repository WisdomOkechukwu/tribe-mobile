import { useShallow } from "zustand/react/shallow";
import { useSessionStore, type KycTier } from "@/stores/use-session-store";

/**
 * Where one verification tier stands. The same five words are used on every screen, in the
 * backend (GET /kyc `tiers[].state`) and in tribe-admin:
 *   verified · in_review · needs_attention · available · locked
 * Only `available` and `needs_attention` may open the verification form; nothing else can
 * start a submission, so a request in review can't be sent twice.
 */
export type TierStateName = "verified" | "in_review" | "needs_attention" | "available" | "locked";
export type VerifyTier = Exclude<KycTier, 0>;

export type TierState = {
  tier: VerifyTier;
  state: TierStateName;
  /** rejection reason (needs_attention) */
  reason?: string;
  /** when the open submission was sent (in_review) */
  submittedAt?: string;
  /** locked: the tier that has to finish first */
  afterTier?: VerifyTier;
};

/** Can this tier's form be opened? */
export const canStart = (s: TierState) => s.state === "available" || s.state === "needs_attention";

/** The session fields a tier's state depends on (a full store state works too). */
export type KycSnapshot = {
  kycTier: KycTier;
  kycStatus: string;
  kycPendingTier: VerifyTier | null;
  kycSubmittedAt: string | null;
  kycTiers: TierState[] | null;
};

/**
 * Works out a tier's state. The profile decides what can and can't happen (verified tier, the
 * tier in review), because it comes back fresh from every submit; the per-tier list from GET /kyc
 * adds the details (rejection reason, dates). So a stale list can never reopen a form.
 */
export function tierState(tier: VerifyTier, s: KycSnapshot = useSessionStore.getState()): TierState {
  const server = s.kycTiers?.find((t) => t.tier === tier);
  if (s.kycTier >= tier) return { tier, state: "verified" };
  if (s.kycPendingTier === tier) return { tier, state: "in_review", submittedAt: s.kycSubmittedAt ?? server?.submittedAt };
  if (s.kycPendingTier) return { tier, state: "locked", afterTier: s.kycPendingTier };
  if (tier > s.kycTier + 1) return { tier, state: "locked", afterTier: (tier - 1) as VerifyTier };
  // the next tier: rejected last time, or free to start
  if (server?.state === "needs_attention" || (!server && s.kycStatus === "failed")) return { tier, state: "needs_attention", reason: server?.reason };
  return { tier, state: "available" };
}

/** All three tiers, reactive (re-renders only when a KYC field changes). */
export function useTierStates(): TierState[] {
  const s = useSessionStore(useShallow((x) => ({ kycTier: x.kycTier, kycStatus: x.kycStatus, kycPendingTier: x.kycPendingTier, kycSubmittedAt: x.kycSubmittedAt, kycTiers: x.kycTiers })));
  return ([1, 2, 3] as const).map((t) => tierState(t, s));
}

/** "just now", "5 min ago", "2h ago", "3 days ago" — for "In review · 2h ago". */
export function reviewAge(iso?: string): string {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
