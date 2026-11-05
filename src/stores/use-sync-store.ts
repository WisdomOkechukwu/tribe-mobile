import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./storage";

type SyncState = {
  /** resource name → when it last loaded from the API (so cached data can paint first, no skeleton) */
  loaded: Record<string, number>;
  mark: (name: string) => void;
  reset: () => void;
};

/**
 * Resources whose store isn't persisted (money: balances, history, cards, referrals). Their
 * markers stay in memory only, so after a cold start the store's empty copy is never handed to
 * React Query as `initialData` (that showed a $0 Home): they show skeletons and fetch.
 */
const MEMORY_ONLY = ["accounts", "transactions", "cards", "referrals"];
const persisted = (loaded: Record<string, number>) => Object.fromEntries(Object.entries(loaded).filter(([name]) => !MEMORY_ONLY.includes(name)));

/** Which API resources this phone has loaded for the signed-in user, and when. */
export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      loaded: {},
      mark: (name) => set((s) => ({ loaded: { ...s.loaded, [name]: Date.now() } })),
      reset: () => set({ loaded: {} }),
    }),
    {
      name: "tribe:sync",
      storage: persistStorage,
      version: 2,
      partialize: ({ loaded }) => ({ loaded: persisted(loaded) }),
      // v2: money resources are no longer cached on the device; forget their markers
      migrate: (state) => ({ loaded: persisted((state as Partial<SyncState> | undefined)?.loaded ?? {}) }) as SyncState,
    },
  ),
);
