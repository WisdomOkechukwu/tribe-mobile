import Constants from "expo-constants";
import type { KycTier } from "@/stores/use-session-store";

/**
 * Identity verification (KYC) via QoreID — client side only.
 *
 * QoreID sessions are minted by Tribe's backend (it holds the QoreID client credentials; they
 * must never ship in the app). The app only asks that backend for a short-lived session token
 * at EXPO_PUBLIC_KYC_SESSION_URL, launches the QoreID SDK with it, and shows "submitted".
 * The final decision comes from QoreID's webhook on Tribe's backend — never from this callback.
 *
 * Expo Go can't load QoreID's native module, and without a session URL there's nothing to
 * launch — in both cases the app runs a branded mock flow so everything stays demoable.
 * The SDK is `require`d lazily inside the real branch only (a static import crashes Expo Go).
 */

export type KycProvider = "qoreid" | "mock";
export type KycOutcome = { status: "approved" | "pending" | "failed" | "cancelled"; reference: string | null; message?: string };

export const TIER_INFO: Record<Exclude<KycTier, 0>, { title: string; needs: string[]; unlocks: string; idLabel: string; idLength: number }> = {
  1: { title: "Verify your BVN", needs: ["Your 11-digit BVN", "Date of birth"], unlocks: "Send, receive, swap and pay bills with higher limits.", idLabel: "BVN", idLength: 11 },
  2: { title: "NIN + selfie", needs: ["Your 11-digit NIN", "A quick selfie (liveness check)"], unlocks: "Virtual cards, crypto withdrawals and bigger Cashpoints.", idLabel: "NIN", idLength: 11 },
  3: { title: "ID document + address", needs: ["Driver's licence, voter's card, NIN slip or passport", "Your home address"], unlocks: "Highest limits, and opening new wallets in any currency or coin.", idLabel: "ID number", idLength: 0 },
};

const SESSION_URL = process.env.EXPO_PUBLIC_KYC_SESSION_URL;

export function kycProvider(): KycProvider {
  if (process.env.EXPO_PUBLIC_KYC_PROVIDER === "mock") return "mock";
  if (Constants.executionEnvironment === "storeClient" || !SESSION_URL) return "mock";
  return "qoreid";
}

/** Asks Tribe's backend for a QoreID session token. TODO(kyc): add the user's auth header. */
async function fetchSessionToken(tier: KycTier, subjectRef: string) {
  const res = await fetch(SESSION_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier, subjectRef }),
  });
  if (!res.ok) throw new Error("Verification is unavailable right now. Please try again shortly.");
  return (await res.json()) as { sdkSessionToken: string; reference: string };
}

/** Real QoreID run (dev / production builds only). */
export async function verifyWithQoreId(params: {
  tier: Exclude<KycTier, 0>;
  subjectRef: string;
  applicant: { firstName: string; lastName: string; phoneNumber: string; email?: string };
  idNumber?: string;
}): Promise<KycOutcome> {
  const { sdkSessionToken, reference } = await fetchSessionToken(params.tier, params.subjectRef);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { QoreIdSdk } = require("@qore-id/react-native-qoreid-sdk") as typeof import("@qore-id/react-native-qoreid-sdk");

  return new Promise<KycOutcome>((resolve) => {
    const unsubscribe = QoreIdSdk.events((r) => {
      if (r.event === "SESSION_RESULT") return; // progress, not final
      unsubscribe();
      if (r.event === "SUCCESS_RESULT") resolve({ status: "pending", reference, message: "Submitted. We'll confirm shortly." });
      else if (/cancel/i.test(`${r.code} ${r.message}`)) resolve({ status: "cancelled", reference });
      else resolve({ status: "failed", reference, message: r.message || "We couldn't verify you this time." });
    });
    QoreIdSdk.launch({
      sessionToken: sdkSessionToken,
      applicantData: params.applicant,
      identityData: params.idNumber ? { idType: params.tier === 1 ? "BVN" : "NIN", idNumber: params.idNumber } : undefined,
      ocrAcceptedDocuments: params.tier === 3 ? ["DRIVERS_LICENSE_NGA", "VOTERS_CARD_NGA", "NIN_SLIP_NGA", "PASSPORT_NGA"] : undefined,
    });
  });
}
