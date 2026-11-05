import { create } from "zustand";

export type WorldId = "global" | "crypto" | "card" | "bills";

/** What "Create account" collects across its three steps (sent in one go at the end). */
export type SignupDraft = {
  email: string;
  country: string;
  firstName: string;
  lastName: string;
  tag: string;
  /** "+234 8035550142" */
  phone: string;
  referral: string;
  heardFrom: string;
};

/**
 * In-memory signup progress: the Create-account draft, then the world picked after sign-up.
 * Not persisted: a restart mid-way begins that part again.
 */
type SignupState = {
  draft: SignupDraft;
  /** from POST auth/email/verify: proves the email for register / password reset */
  verificationToken: string | null;
  /** dev builds only: the API returns the emailed code locally, so testers can read it */
  debugCode: string | null;
  /** the Tribe world picked after signup (SBU.png) — decides where Home lands first */
  world: WorldId | null;
  /** name returned by the BVN lookup */
  bvnName: { first: string; last: string } | null;
  answers: Partial<Record<"address" | "income" | "employment" | "industry" | "deposit" | "frequency", string>>;
  set: (patch: Partial<Omit<SignupState, "set" | "reset" | "setDraft">>) => void;
  setDraft: (patch: Partial<SignupDraft>) => void;
  reset: () => void;
};

// no country until the user picks one on create-account
const EMPTY_DRAFT: SignupDraft = { email: "", country: "", firstName: "", lastName: "", tag: "", phone: "", referral: "", heardFrom: "" };
const initial = { draft: EMPTY_DRAFT, verificationToken: null, debugCode: null, world: null, bvnName: null, answers: {} };

export const useSignupStore = create<SignupState>()((set) => ({
  ...initial,
  set: (patch) => set(patch),
  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  reset: () => set(initial),
}));
