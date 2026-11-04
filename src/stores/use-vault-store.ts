import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VaultToken } from "@/data/seed";
import { persistStorage } from "./storage";

type VaultState = {
  /** as last loaded from GET /vault/tokens */
  tokens: VaultToken[];
  setTokens: (tokens: VaultToken[]) => void;
  /** optimistic "I've loaded it" / Undo while PATCH vault/tokens/:id is in flight */
  markLoaded: (id: string, loaded: boolean) => void;
  reset: () => void;
};

/** Token Vault: every electricity token, saved by the API when the bill is paid. */
export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      tokens: [],
      setTokens: (tokens) => set({ tokens }),
      markLoaded: (id, loaded) =>
        set({ tokens: get().tokens.map((t) => (t.id !== id || !!t.loadedOn === loaded ? t : { ...t, loadedOn: loaded ? new Date().toISOString() : null })) }),
      reset: () => set({ tokens: [] }),
    }),
    {
      name: "tribe:vault",
      storage: persistStorage,
      version: 3,
      migrate: (state, version) => (version < 3 ? { tokens: [] } : state) as VaultState,
    },
  ),
);
