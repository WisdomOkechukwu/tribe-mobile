import type { KycTier } from "@/stores/use-session-store";

/**
 * Identity verification (KYC) tiers. Each tier is one request to the API (POST kyc/tier-N): Tier 1
 * is checked straight away, Tiers 2 and 3 wait for a person at Tribe. One request can be open at a
 * time (see utils/kyc-state.ts).
 */

export type KycOutcome = { status: "approved" | "pending" | "failed" | "cancelled"; reference: string | null; message?: string };

/** One thing a tier's form asks for, in order. The intro lists them and the flow walks them. */
export type VerifyStepId = "bvn" | "dob" | "nin" | "selfie" | "docType" | "docNumber" | "address";
export type VerifyStep = { id: VerifyStepId; label: string; title: string; body: string };

export type TierInfo = { title: string; unlocks: string; steps: VerifyStep[] };

export const TIER_INFO: Record<Exclude<KycTier, 0>, TierInfo> = {
  1: {
    title: "Verify your BVN",
    unlocks: "Send, receive, swap and pay bills with higher limits.",
    steps: [
      { id: "bvn", label: "BVN", title: "Enter your BVN", body: "Your 11-digit Bank Verification Number. Dial *565*0# on the line linked to your bank to get it." },
      { id: "dob", label: "Date of birth", title: "Add your date of birth", body: "It has to match the date on your BVN." },
    ],
  },
  2: {
    title: "NIN + selfie",
    unlocks: "Virtual cards, crypto withdrawals and bigger Cashpoints.",
    steps: [
      { id: "nin", label: "NIN", title: "Enter your NIN", body: "Your 11-digit National Identity Number. It's on your NIN slip or in the NIMC app." },
      { id: "selfie", label: "Selfie", title: "Take a selfie", body: "Good light, face the camera, no glasses or caps. It takes about 10 seconds." },
    ],
  },
  3: {
    title: "ID document + address",
    unlocks: "Highest limits, and opening new wallets in any currency or coin.",
    steps: [
      { id: "docType", label: "ID type", title: "Choose your ID", body: "Driver's licence, voter's card, NIN slip or international passport." },
      { id: "docNumber", label: "ID number", title: "Enter the ID number", body: "Exactly as it's printed on the document." },
      { id: "address", label: "Address", title: "Add your home address", body: "Where you live now. It's checked against your ID." },
    ],
  },
};

/** Tier 3's ID documents, with the number rules the API checks (spaces are ignored). */
export type DocumentType = "drivers_licence" | "voters_card" | "nin_slip" | "passport";
export const DOCUMENTS: { value: DocumentType; label: string; hint: string; placeholder: string; valid: (n: string) => boolean }[] = [
  { value: "nin_slip", label: "NIN slip", hint: "11 digits", placeholder: "12345678901", valid: (n) => /^\d{11}$/.test(n) },
  { value: "voters_card", label: "Voter's card", hint: "19 letters and numbers", placeholder: "90F5B1234567890123A", valid: (n) => /^[A-Z0-9]{19}$/.test(n) },
  { value: "drivers_licence", label: "Driver's licence", hint: "8 to 15 letters and numbers", placeholder: "ABC12345678", valid: (n) => /^[A-Z0-9]{8,15}$/.test(n) },
  { value: "passport", label: "International passport", hint: "A letter then 8 digits", placeholder: "A12345678", valid: (n) => /^[A-Z]\d{8}$/.test(n) },
];

/** "a1 2345 678" → "A12345678": what the rules above (and the API) compare. */
export const cleanDocumentNumber = (n: string) => n.replace(/\s+/g, "").toUpperCase();
