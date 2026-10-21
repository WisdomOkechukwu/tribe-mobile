import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_TOKENS, type VaultToken } from "@/data/seed";
import { persistStorage } from "./storage";

type VaultState = {
  tokens: VaultToken[];
  toggleLoaded: (id: string) => void;
  /** idempotent: "I'm loading it now" on the result card, and its Undo */
  setLoaded: (id: string, loaded: boolean) => void;
  add: (t: Omit<VaultToken, "id" | "bought" | "loadedOn">) => VaultToken;
  reset: () => void;
};

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      tokens: SEED_TOKENS.map((t) => ({ ...t })),
      toggleLoaded: (id) =>
        set({ tokens: get().tokens.map((t) => (t.id === id ? { ...t, loadedOn: t.loadedOn ? null : new Date().toISOString() } : t)) }),
      setLoaded: (id, loaded) =>
        set({ tokens: get().tokens.map((t) => (t.id !== id || !!t.loadedOn === loaded ? t : { ...t, loadedOn: loaded ? new Date().toISOString() : null })) }),
      add: (t) => {
        const token: VaultToken = { ...t, id: `v${Date.now().toString(36)}`, bought: new Date().toISOString(), loadedOn: null };
        set({ tokens: [token, ...get().tokens] });
        return token;
      },
      reset: () => set({ tokens: SEED_TOKENS.map((t) => ({ ...t })) }),
    }),
    {
      name: "tribe:vault",
      storage: persistStorage,
      version: 2,
      // v2: tokens remember what paid for them; seeded tokens pick that up from the seed
      migrate: (state) => {
        const s = state as { tokens?: VaultToken[] };
        const tokens = (s.tokens ?? SEED_TOKENS).map((t) => {
          const seed = SEED_TOKENS.find((x) => x.id === t.id);
          return t.paidWith || !seed ? t : { ...t, paidWith: seed.paidWith, paid: seed.paid };
        });
        return { ...s, tokens } as never;
      },
    },
  ),
);
