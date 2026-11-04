import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VirtualCard } from "@/data/seed";
import { persistStorage } from "./storage";

type CardsState = {
  /** as last loaded from GET /cards (never the full number or CVV) */
  cards: VirtualCard[];
  /** the card the Cards tab shows (null = the first one) */
  selected: string | null;
  /** the card Apple Pay / Google Pay uses by default on this phone (null until one is added) */
  walletDefault: string | null;
  select: (id: string | null) => void;
  /** written by the `cards` resource */
  setCards: (cards: VirtualCard[]) => void;
  /** an optimistic change while its PATCH is in flight (rolled back by a refetch on failure) */
  patchCard: (id: string, patch: Partial<VirtualCard>) => void;
  setWalletDefault: (id: string) => void;
  reset: () => void;
};

/** Keep the wallet default pointing at a card that's still added (or none). */
function nextDefault(cards: VirtualCard[], current: string | null) {
  if (current && cards.some((c) => c.id === current && c.inWallet)) return current;
  return cards.find((c) => c.inWallet)?.id ?? null;
}

/**
 * The user's virtual cards, as the API last returned them (memory only; just the selected card and
 * the wallet default persist). Card changes go through
 * `api/actions.ts` (freeze, design, limit, wallet) and money through the flow store.
 */
export const useCardsStore = create<CardsState>()(
  persist(
    (set, get) => ({
      cards: [],
      selected: null,
      walletDefault: null,
      select: (selected) => set({ selected }),
      setCards: (cards) => set((s) => ({ cards, walletDefault: nextDefault(cards, s.walletDefault), selected: s.selected && cards.some((c) => c.id === s.selected) ? s.selected : null })),
      patchCard: (id, patch) => {
        const cards = get().cards.map((c) => (c.id === id ? { ...c, ...patch } : c));
        set({ cards, walletDefault: nextDefault(cards, get().walletDefault ?? (patch.inWallet ? id : null)) });
      },
      setWalletDefault: (id) => {
        if (get().cards.some((c) => c.id === id && c.inWallet)) set({ walletDefault: id });
      },
      reset: () => set({ cards: [], selected: null, walletDefault: null }),
    }),
    {
      name: "tribe:cards",
      storage: persistStorage,
      version: 6,
      // v6: card data (balances included) is never kept on the device; only this phone's choices are
      partialize: ({ selected, walletDefault }) => ({ selected, walletDefault }),
      migrate: (state, version) => {
        const s = (state ?? {}) as Partial<CardsState>;
        return (version < 5 ? { selected: null, walletDefault: null } : { selected: s.selected ?? null, walletDefault: s.walletDefault ?? null }) as CardsState;
      },
    },
  ),
);
