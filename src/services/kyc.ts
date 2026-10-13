import type { KycTier } from "@/stores/use-session-store";

/**
 * Identity verification (KYC) tiers. Submitting a tier shows "processing" for a beat, then the
 * tier is verified. TODO(kyc): send the details to Tribe's backend.
 */

export type KycOutcome = { status: "approved" | "pending" | "failed" | "cancelled"; reference: string | null; message?: string };

export const TIER_INFO: Record<Exclude<KycTier, 0>, { title: string; needs: string[]; unlocks: string; idLabel: string; idLength: number }> = {
  1: { title: "Verify your BVN", needs: ["Your 11-digit BVN", "Date of birth"], unlocks: "Send, receive, swap and pay bills with higher limits.", idLabel: "BVN", idLength: 11 },
  2: { title: "NIN + selfie", needs: ["Your 11-digit NIN", "A quick selfie (liveness check)"], unlocks: "Virtual cards, crypto withdrawals and bigger Cashpoints.", idLabel: "NIN", idLength: 11 },
  3: { title: "ID document + address", needs: ["Driver's licence, voter's card, NIN slip or passport", "Your home address"], unlocks: "Highest limits, and opening new wallets in any currency or coin.", idLabel: "ID number", idLength: 0 },
};

/** Reference shown to the user and support for one submission, e.g. "KYC-LZ3F9Q". */
export const newKycReference = () => `KYC-${Date.now().toString(36).toUpperCase()}`;
