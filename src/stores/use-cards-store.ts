import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CARD_ADDRESS, SEED_CARDS, type CardNetwork, type CardTheme, type VirtualCard } from "@/data/seed";
import { randomDigits } from "@/utils/format";
import { persistStorage } from "./storage";

type CardsState = {
  cards: VirtualCard[];
  /** the card the Cards tab shows (null = the first one) */
  selected: string | null;
  select: (id: string | null) => void;
  toggleFreeze: (id: string) => void;
  setTheme: (id: string, theme: CardTheme) => void;
  credit: (id: string, usd: number) => void;
  toggleOnline: (id: string) => void;
  setLimit: (id: string, usd: number) => void;
  createCard: (p: { label: string; theme: CardTheme; network: CardNetwork; holder: string }) => VirtualCard;
  /** move dollars off the card (back to a wallet) */
  debit: (id: string, usd: number) => void;
  /** delete returns the card balance (refund handled by the caller) */
  deleteCard: (id: string) => VirtualCard | undefined;
  /** no cards at all — a new account creates its first one (Cards tab → intro → /card-new) */
  clear: () => void;
  reset: () => void;
};

export const useCardsStore = create<CardsState>()(
  persist(
    (set, get) => ({
      cards: SEED_CARDS.map((c) => ({ ...c })),
      selected: null,
      select: (selected) => set({ selected }),
      toggleFreeze: (id) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, frozen: !c.frozen } : c)) }),
      setTheme: (id, theme) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, theme } : c)) }),
      credit: (id, usd) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, balance: c.balance + usd } : c)) }),
      toggleOnline: (id) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, online: !c.online } : c)) }),
      setLimit: (id, usd) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, monthlyLimit: usd } : c)) }),
      debit: (id, usd) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, balance: Math.max(0, c.balance - usd) } : c)) }),
      deleteCard: (id) => {
        const card = get().cards.find((c) => c.id === id);
        set({ cards: get().cards.filter((c) => c.id !== id) });
        return card;
      },
      createCard: ({ label, theme, network, holder }) => {
        const num = `${network === "visa" ? "4532" : "5399"} ${randomDigits(4)} ${randomDigits(4)} ${randomDigits(4)}`;
        const card: VirtualCard = {
          id: `c${Date.now().toString(36)}`,
          label,
          theme,
          network,
          holder,
          address: CARD_ADDRESS,
          online: true,
          currency: "USD",
          number: num,
          last4: num.slice(-4),
          expiry: `${String(new Date().getMonth() + 1).padStart(2, "0")}/${(new Date().getFullYear() + 3) % 100}`,
          cvv: randomDigits(3),
          balance: 0,
          frozen: false,
          monthlyLimit: 1_000,
          spentThisMonth: 0,
        };
        set({ cards: [...get().cards, card], selected: card.id });
        return card;
      },
      clear: () => set({ cards: [], selected: null }),
      reset: () => set({ cards: SEED_CARDS.map((c) => ({ ...c })), selected: null }),
    }),
    {
      name: "tribe:cards",
      storage: persistStorage,
      version: 3,
      migrate: (state) => {
        type Legacy = Partial<VirtualCard> & { design?: string };
        const s = state as { cards?: Legacy[] };
        const theme = (d?: string): CardTheme => (d === "sunset" ? "sunset" : d === "ink" ? "onyx" : "midnight");
        return {
          selected: null,
          cards: (s.cards ?? (SEED_CARDS as Legacy[])).map(({ design, ...c }) => ({ network: "mastercard", holder: "Ada Okafor", address: CARD_ADDRESS, online: true, ...c, theme: c.theme ?? theme(design) })),
        } as CardsState;
      },
    },
  ),
);
