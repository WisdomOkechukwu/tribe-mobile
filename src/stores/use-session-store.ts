import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO, SEED_USER } from "@/data/seed";
import { demoHash } from "@/utils/hash";
import { persistStorage } from "./storage";

export type KycTier = 0 | 1 | 2 | 3;
export type KycStatus = "none" | "pending" | "approved" | "failed";

export type User = { firstName: string; lastName: string; tag: string; phone: string; email: string };
export type Device = { id: string; name: string; detail: string; current: boolean; lastActive: string };
export type Account = { email: string; country: string; passwordHash: string };
/** why the last sign-out happened — the sign-in screen words itself accordingly */
export type SignOutReason = "user" | "lock" | "password-reset";
export type SignInResult = "ok" | "no-email" | "wrong-password";
/** USD/GBP/EUR accounts requested from the Global payments world */
export type GlobalAccounts = "none" | "review" | "ready";

const SEED_DEVICES: Device[] = [
  { id: "d1", name: "This iPhone", detail: "Tribe for iOS · Lagos, NG", current: true, lastActive: new Date().toISOString() },
  { id: "d2", name: "Chrome on Mac", detail: "web.tribe.africa · Lagos, NG", current: false, lastActive: new Date(Date.now() - 2 * 864e5).toISOString() },
  { id: "d3", name: "Pixel 7", detail: "Tribe for Android · Abuja, NG", current: false, lastActive: new Date(Date.now() - 19 * 864e5).toISOString() },
];

type SessionState = {
  /** signed in on this device (email + password, or the demo account) */
  signedIn: boolean;
  /** the post-signup setup (world, checklist, PINs) is finished */
  hasOnboarded: boolean;
  /** the account created on this device — kept after sign-out so "Welcome back" can prefill */
  account: Account | null;
  rememberedEmail: string | null;
  signOutReason: SignOutReason | null;
  user: User;
  avatarUri: string | null;
  /** last @tag change — tags can change once every 30 days */
  tagChangedAt: string | null;
  /**
   * Demo only: the PINs live in AsyncStorage so the prototype works offline. A real build
   * verifies them server-side and keeps only a device key in expo-secure-store.
   */
  pin: string | null;
  /** 6-digit app lock PIN — separate from the 4-digit transaction PIN */
  lockPin: string | null;
  locked: boolean;
  lockFails: number;
  /** epoch ms of the last touch / foreground — drives the 10-minute auto-lock */
  lastActiveAt: number;
  biometrics: boolean;
  twoFactor: boolean;
  devices: Device[];
  kycTier: KycTier;
  kycStatus: KycStatus;
  kycReference: string | null;
  /** where Home sends the user once, right after setup (the world they picked) */
  landing: string | null;
  globalAccounts: GlobalAccounts;
  globalRequestedAt: number | null;
  setUser: (patch: Partial<User>) => void;
  changeTag: (tag: string) => void;
  setAvatar: (uri: string | null) => void;
  setPin: (pin: string) => void;
  setLockPin: (pin: string | null) => void;
  setBiometrics: (on: boolean) => void;
  setTwoFactor: (on: boolean) => void;
  removeDevice: (id: string) => void;
  completeOnboarding: (landing?: string | null) => void;
  setKyc: (patch: { tier?: KycTier; status: KycStatus; reference?: string | null }) => void;
  emailExists: (email: string) => boolean;
  createAccount: (input: { email: string; country: string; password: string; user: Omit<User, "email"> }) => void;
  signIn: (email: string, password: string) => SignInResult;
  /** true if the email belongs to an account we can reset */
  resetPassword: (email: string, password: string) => boolean;
  checkPassword: (password: string) => boolean;
  setPassword: (password: string) => void;
  lock: () => void;
  unlock: () => void;
  /** a wrong lock PIN; returns how many in a row */
  failUnlock: () => number;
  touch: () => void;
  signOut: (reason?: SignOutReason) => void;
  /** Me › Log out: signs out, keeps this device's account and data */
  logOut: () => void;
  /** Delete account / dev reset: forget everything */
  wipe: () => void;
  consumeLanding: () => string | null;
  requestGlobalAccounts: () => void;
  setGlobalAccounts: (status: GlobalAccounts) => void;
};

const initial = {
  signedIn: false,
  hasOnboarded: false,
  account: null as Account | null,
  rememberedEmail: null as string | null,
  signOutReason: null as SignOutReason | null,
  user: { ...SEED_USER },
  avatarUri: null,
  tagChangedAt: null,
  pin: null,
  lockPin: null as string | null,
  locked: false,
  lockFails: 0,
  lastActiveAt: 0,
  biometrics: false,
  twoFactor: true,
  devices: SEED_DEVICES,
  kycTier: 0 as KycTier,
  kycStatus: "none" as KycStatus,
  kycReference: null,
  landing: null as string | null,
  globalAccounts: "none" as GlobalAccounts,
  globalRequestedAt: null as number | null,
};

export const TAG_COOLDOWN_DAYS = 30;

const norm = (email: string) => email.trim().toLowerCase();
const isDemo = (email: string) => norm(email) === DEMO.account.email;

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      ...initial,
      setUser: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),
      changeTag: (tag) => set((s) => ({ user: { ...s.user, tag }, tagChangedAt: new Date().toISOString() })),
      setAvatar: (avatarUri) => set({ avatarUri }),
      setPin: (pin) => set({ pin }),
      setLockPin: (lockPin) => set({ lockPin }),
      setBiometrics: (biometrics) => set({ biometrics }),
      setTwoFactor: (twoFactor) => set({ twoFactor }),
      removeDevice: (id) => set((s) => ({ devices: s.devices.filter((d) => d.id !== id || d.current) })),
      completeOnboarding: (landing = null) => set({ hasOnboarded: true, landing, lastActiveAt: Date.now() }),
      setKyc: ({ tier, status, reference }) =>
        set((s) => ({ kycStatus: status, kycTier: tier ?? s.kycTier, kycReference: reference === undefined ? s.kycReference : reference })),

      emailExists: (email) => {
        const e = norm(email);
        return get().account?.email === e || (DEMO.takenEmails as readonly string[]).includes(e);
      },
      createAccount: ({ email, country, password, user }) =>
        set({
          ...initial,
          devices: SEED_DEVICES,
          account: { email: norm(email), country, passwordHash: demoHash(email, password) },
          user: { ...user, email: norm(email) },
          signedIn: true,
          hasOnboarded: false,
          lastActiveAt: Date.now(),
        }),
      signIn: (email, password) => {
        const s = get();
        const e = norm(email);
        const now = Date.now();
        if (s.account?.email === e) {
          if (s.account.passwordHash !== demoHash(e, password)) return "wrong-password";
          set({ signedIn: true, locked: false, lockFails: 0, signOutReason: null, lastActiveAt: now });
          return "ok";
        }
        if (isDemo(e)) {
          if (password !== DEMO.account.password) return "wrong-password";
          // the seeded account has finished setup; restore its profile on this device
          set({
            signedIn: true,
            hasOnboarded: true,
            account: { email: e, country: "NG", passwordHash: demoHash(e, password) },
            user: { ...SEED_USER },
            pin: s.pin ?? DEMO.pin,
            locked: false,
            lockFails: 0,
            signOutReason: null,
            lastActiveAt: now,
          });
          return "ok";
        }
        return "no-email";
      },
      resetPassword: (email, password) => {
        const s = get();
        const e = norm(email);
        if (s.account?.email === e) {
          set({ account: { ...s.account, passwordHash: demoHash(e, password) }, rememberedEmail: e, signOutReason: "password-reset" });
          return true;
        }
        if (isDemo(e)) {
          set({ account: { email: e, country: "NG", passwordHash: demoHash(e, password) }, user: { ...SEED_USER }, hasOnboarded: true, rememberedEmail: e, signOutReason: "password-reset" });
          return true;
        }
        return false;
      },
      checkPassword: (password) => {
        const a = get().account;
        return !!a && a.passwordHash === demoHash(a.email, password);
      },

      setPassword: (password) => {
        const a = get().account;
        if (a) set({ account: { ...a, passwordHash: demoHash(a.email, password) } });
      },

      lock: () => set({ locked: true, lockFails: 0 }),
      unlock: () => set({ locked: false, lockFails: 0, lastActiveAt: Date.now() }),
      failUnlock: () => {
        const n = get().lockFails + 1;
        set({ lockFails: n });
        return n;
      },
      touch: () => set({ lastActiveAt: Date.now() }),
      signOut: (reason = "user") => set((s) => ({ signedIn: false, locked: false, lockFails: 0, signOutReason: reason, rememberedEmail: s.account?.email ?? s.user.email })),
      logOut: () => get().signOut("user"),
      wipe: () => set({ ...initial, user: { ...SEED_USER }, devices: SEED_DEVICES }),

      consumeLanding: () => {
        const href = get().landing;
        if (href) set({ landing: null });
        return href;
      },
      requestGlobalAccounts: () => set({ globalAccounts: "review", globalRequestedAt: Date.now() }),
      setGlobalAccounts: (globalAccounts) => set({ globalAccounts }),
    }),
    {
      name: "tribe:session",
      storage: persistStorage,
      version: 3,
      migrate: (persisted, version) => {
        const state = { ...initial, ...(persisted as object) } as SessionState;
        // v2 had no auth: anyone already set up becomes signed in to the demo account
        if (version < 3 && state.hasOnboarded) {
          const email = norm(state.user.email || DEMO.account.email);
          state.signedIn = true;
          state.account = { email, country: "NG", passwordHash: demoHash(email, DEMO.account.password) };
          state.lastActiveAt = Date.now();
        }
        return state;
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
