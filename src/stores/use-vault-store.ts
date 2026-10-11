import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_TOKENS, type VaultToken } from "@/data/seed";
import { persistStorage } from "./storage";

type VaultState = {
  tokens: VaultToken[];
  toggleLoaded: (id: string) => void;
  add: (t: Omit<VaultToken, "id" | "bought" | "loadedOn">) => VaultToken;
  reset: () => void;
};

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      tokens: SEED_TOKENS.map((t) => ({ ...t })),
      toggleLoaded: (id) =>
        set({ tokens: get().tokens.map((t) => (t.id === id ? { ...t, loadedOn: t.loadedOn ? null : new Date().toISOString() } : t)) }),
      add: (t) => {
        const token: VaultToken = { ...t, id: `v${Date.now().toString(36)}`, bought: new Date().toISOString(), loadedOn: null };
        set({ tokens: [token, ...get().tokens] });
        return token;
      },
      reset: () => set({ tokens: SEED_TOKENS.map((t) => ({ ...t })) }),
    }),
    { name: "tribe:vault", storage: persistStorage, version: 1 },
  ),
);
