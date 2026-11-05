import { create } from "zustand";
import { persist } from "zustand/middleware";
import { secureDelete, secureGet, secureSet } from "@/services/secure-storage";
import type { TierState, VerifyTier } from "@/utils/kyc-state";
import { persistStorage } from "./storage";

export type KycTier = 0 | 1 | 2 | 3;
export type KycStatus = "none" | "pending" | "approved" | "failed";

export type User = { firstName: string; lastName: string; tag: string; phone: string; email: string };
/** why the last sign-out happened — the sign-in screen words itself accordingly */
export type SignOutReason = "user" | "password-reset" | "device-replaced" | "session-expired";
/** USD/GBP/EUR accounts requested from the Global payments world */
export type GlobalAccounts = "none" | "review" | "ready";
export type World = "global" | "crypto" | "card" | "bills";

/** `tokens` from the API (sign-up, sign-in, new-phone check, refresh). */
export type Tokens = {
  access_token: string;
  access_token_expires_at: string;
  refresh_token: string;
  refresh_token_expires_at: string;
  session_id: string;
};

/** `GET /profile` (and the `user` in auth responses). */
export type ProfileResource = {
  id: string;
  first_name: string;
  last_name: string;
  tag: string;
  email: string;
  phone: string | null;
  phone_verified: boolean;
  country: string;
  status: string;
  kyc_tier: number;
  kyc_status: string;
  /** the tier with an open (in review) submission, if any */
  kyc_pending_tier?: number | null;
  /** when that open submission was sent */
  kyc_submitted_at?: string | null;
  global_accounts_status: string;
  world: string | null;
  onboarding_completed: boolean;
  referral_code: string;
  biometrics_enabled: boolean;
  two_factor_enabled: boolean;
  has_pin: boolean;
  tag_changed_at: string | null;
  created_at: string;
  version: number;
};

const TOKENS_KEY = "tribe.session-tokens";

type SessionState = {
  /** signed in on this phone (tokens in SecureStore) */
  signedIn: boolean;
  /** the user picked a world after sign-up and reached Home (Finish setup happens in the app) */
  hasOnboarded: boolean;
  rememberedEmail: string | null;
  signOutReason: SignOutReason | null;
  userId: string | null;
  user: User;
  country: string;
  referralCode: string | null;
  avatarUri: string | null;
  /** last @tag change — tags can change once every 30 days */
  tagChangedAt: string | null;
  /** the transaction PIN exists on the server (it is only ever checked there) */
  hasPin: boolean;
  biometrics: boolean;
  twoFactor: boolean;
  kycTier: KycTier;
  kycStatus: KycStatus;
  kycReference: string | null;
  /** the tier in review right now (from the profile), so nothing can submit it again */
  kycPendingTier: VerifyTier | null;
  kycSubmittedAt: string | null;
  /** per-tier states from GET /kyc (null until loaded); see utils/kyc-state.ts */
  kycTiers: TierState[] | null;
  /** where Home sends the user once, right after setup (the world they picked) */
  landing: string | null;
  globalAccounts: GlobalAccounts;
  globalRequestedAt: number | null;
  phoneVerified: boolean;
  world: World | null;
  /** never written to AsyncStorage: they live in SecureStore (see loadTokens / setTokens) */
  tokens: Tokens | null;
  tokensLoaded: boolean;

  loadTokens: () => Promise<void>;
  setTokens: (tokens: Tokens | null) => void;
  /** sign-up, sign-in, new-phone check: the session starts */
  startSession: (profile: ProfileResource, tokens: Tokens) => void;
  applyProfile: (profile: ProfileResource) => void;
  setHasPin: (v: boolean) => void;
  setPhoneVerified: (v: boolean) => void;
  setWorld: (w: World | null) => void;
  setUser: (patch: Partial<User>) => void;
  setAvatar: (uri: string | null) => void;
  setBiometrics: (on: boolean) => void;
  setTwoFactor: (on: boolean) => void;
  completeOnboarding: (landing?: string | null) => void;
  setKyc: (patch: { tier?: KycTier; status: KycStatus; reference?: string | null }) => void;
  setKycTiers: (tiers: TierState[]) => void;
  /** local only: tokens dropped, data kept until the next account signs in */
  signOut: (reason?: SignOutReason) => void;
  /** Delete account / dev reset: forget everything */
  wipe: () => void;
  consumeLanding: () => string | null;
  requestGlobalAccounts: () => void;
  setGlobalAccounts: (status: GlobalAccounts) => void;
};

const EMPTY_USER: User = { firstName: "", lastName: "", tag: "", phone: "", email: "" };

const initial = {
  signedIn: false,
  hasOnboarded: false,
  rememberedEmail: null as string | null,
  signOutReason: null as SignOutReason | null,
  userId: null as string | null,
  user: EMPTY_USER,
  country: "NG",
  referralCode: null as string | null,
  avatarUri: null as string | null,
  tagChangedAt: null as string | null,
  hasPin: false,
  biometrics: false,
  twoFactor: false,
  kycTier: 0 as KycTier,
  kycStatus: "none" as KycStatus,
  kycReference: null as string | null,
  kycPendingTier: null as VerifyTier | null,
  kycSubmittedAt: null as string | null,
  kycTiers: null as TierState[] | null,
  landing: null as string | null,
  globalAccounts: "none" as GlobalAccounts,
  globalRequestedAt: null as number | null,
  phoneVerified: false,
  world: null as World | null,
};

export const TAG_COOLDOWN_DAYS = 30;

const KYC: Record<string, KycStatus> = { none: "none", pending: "pending", approved: "approved", rejected: "failed", failed: "failed" };
const GLOBAL: Record<string, GlobalAccounts> = { none: "none", pending: "review", review: "review", approved: "ready", ready: "ready" };
const WORLDS: World[] = ["global", "crypto", "card", "bills"];

/** The server's user → the session fields screens read. */
function fromProfile(p: ProfileResource) {
  return {
    userId: p.id,
    user: { firstName: p.first_name, lastName: p.last_name, tag: p.tag, email: p.email, phone: p.phone ?? "" },
    country: p.country,
    referralCode: p.referral_code,
    tagChangedAt: p.tag_changed_at,
    hasPin: p.has_pin,
    biometrics: p.biometrics_enabled,
    twoFactor: p.two_factor_enabled,
    kycTier: Math.max(0, Math.min(3, p.kyc_tier)) as KycTier,
    kycStatus: KYC[p.kyc_status] ?? "none",
    kycPendingTier: p.kyc_pending_tier && p.kyc_pending_tier >= 1 && p.kyc_pending_tier <= 3 ? (p.kyc_pending_tier as VerifyTier) : null,
    kycSubmittedAt: p.kyc_pending_tier ? (p.kyc_submitted_at ?? null) : null,
    globalAccounts: GLOBAL[p.global_accounts_status] ?? "none",
    phoneVerified: p.phone_verified,
    world: WORLDS.includes(p.world as World) ? (p.world as World) : null,
    hasOnboarded: p.onboarding_completed,
  };
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      ...initial,
      tokens: null,
      tokensLoaded: false,

      loadTokens: async () => {
        const raw = await secureGet(TOKENS_KEY);
        let tokens: Tokens | null = null;
        try {
          tokens = raw ? (JSON.parse(raw) as Tokens) : null;
        } catch {
          tokens = null;
        }
        // signed in on a previous launch but the keychain lost the tokens: sign in again
        set((s) => ({ tokens, tokensLoaded: true, signedIn: s.signedIn && !!tokens }));
      },
      setTokens: (tokens) => {
        set({ tokens });
        if (tokens) void secureSet(TOKENS_KEY, JSON.stringify(tokens));
        else void secureDelete(TOKENS_KEY);
      },
      startSession: (profile, tokens) => {
        // another account on this phone: don't carry the previous person's settings over
        const same = get().userId === profile.id;
        set({ ...(same ? {} : { ...initial }), ...fromProfile(profile), signedIn: true, signOutReason: null, rememberedEmail: profile.email });
        get().setTokens(tokens);
      },
      applyProfile: (profile) => set(fromProfile(profile)),
      setHasPin: (hasPin) => set({ hasPin }),
      setUser: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),
      setAvatar: (avatarUri) => set({ avatarUri }),
      setBiometrics: (biometrics) => set({ biometrics }),
      setTwoFactor: (twoFactor) => set({ twoFactor }),
      completeOnboarding: (landing = null) => set({ hasOnboarded: true, landing }),
      setKyc: ({ tier, status, reference }) =>
        set((s) => ({ kycStatus: status, kycTier: tier ?? s.kycTier, kycReference: reference === undefined ? s.kycReference : reference })),
      setKycTiers: (kycTiers) => set({ kycTiers }),

      signOut: (reason = "user") => {
        set((s) => ({ signedIn: false, signOutReason: reason, rememberedEmail: s.user.email || s.rememberedEmail }));
        get().setTokens(null);
      },
      wipe: () => {
        set({ ...initial });
        get().setTokens(null);
      },

      consumeLanding: () => {
        const href = get().landing;
        if (href) set({ landing: null });
        return href;
      },
      requestGlobalAccounts: () => set({ globalAccounts: "review", globalRequestedAt: Date.now() }),
      setGlobalAccounts: (globalAccounts) => set({ globalAccounts }),
      setPhoneVerified: (phoneVerified) => set({ phoneVerified }),
      setWorld: (world) => set({ world }),
    }),
    {
      name: "tribe:session",
      storage: persistStorage,
      version: 5,
      // tokens never touch AsyncStorage
      partialize: ({ tokens: _tokens, tokensLoaded: _loaded, ...rest }) => rest,
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Record<string, unknown>;
        if (version < 5) {
          // v5: the backend is the source of truth. The demo account, local password hash, local
          // PIN and seeded devices are gone; sign in again to load the real profile.
          return { ...initial, rememberedEmail: (old.rememberedEmail as string | null) ?? null, avatarUri: (old.avatarUri as string | null) ?? null };
        }
        return { ...initial, ...old };
      },
    },
  ),
);

/** Illustrative limits per tier, shown in the verification centre. */
export const TIER_LIMITS: Record<KycTier, { daily: string; balance: string }> = {
  0: { daily: "₦50,000", balance: "₦300,000" },
  1: { daily: "₦1,000,000", balance: "₦5,000,000" },
  2: { daily: "₦5,000,000", balance: "Unlimited" },
  3: { daily: "₦25,000,000", balance: "Unlimited" },
};
