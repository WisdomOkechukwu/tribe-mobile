import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CARD_ADDRESS, SEED_CARDS, type CardFinish, type CardNetwork, type CardTheme, type VirtualCard } from "@/data/seed";
import { parseFinish } from "@/utils/card-finish";
import { randomDigits } from "@/utils/format";
import { persistStorage } from "./storage";

type CardsState = {
  cards: VirtualCard[];
  /** the card the Cards tab shows (null = the first one) */
  selected: string | null;
  /** the card Apple Pay / Google Pay uses by default (null until one is added) */
  walletDefault: string | null;
  select: (id: string | null) => void;
  toggleFreeze: (id: string) => void;
  setTheme: (id: string, theme: CardFinish) => void;
  credit: (id: string, usd: number) => void;
  toggleOnline: (id: string) => void;
  setLimit: (id: string, usd: number) => void;
  createCard: (p: { label: string; theme: CardFinish; network: CardNetwork; holder: string }) => VirtualCard;
  /** Apple Pay / Google Pay on this phone (simulated) — the first card added becomes the default */
  addToWallet: (id: string) => void;
  removeFromWallet: (id: string) => void;
  setWalletDefault: (id: string) => void;
  /** move dollars off the card (back to a wallet) */
  debit: (id: string, usd: number) => void;
  /** delete returns the card balance (refund handled by the caller) */
  deleteCard: (id: string) => VirtualCard | undefined;
  /** no cards at all — a new account creates its first one (Cards tab → intro → /card-new) */
  clear: () => void;
  reset: () => void;
};

/** Keep the wallet default pointing at a card that's still added (or none). */
function nextDefault(cards: VirtualCard[], current: string | null) {
  if (current && cards.some((c) => c.id === current && c.inWallet)) return current;
  return cards.find((c) => c.inWallet)?.id ?? null;
}

export const useCardsStore = create<CardsState>()(
  persist(
    (set, get) => ({
      cards: SEED_CARDS.map((c) => ({ ...c })),
      selected: null,
      walletDefault: null,
      select: (selected) => set({ selected }),
      toggleFreeze: (id) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, frozen: !c.frozen } : c)) }),
      setTheme: (id, theme) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, theme } : c)) }),
      credit: (id, usd) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, balance: c.balance + usd } : c)) }),
      toggleOnline: (id) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, online: !c.online } : c)) }),
      setLimit: (id, usd) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, monthlyLimit: usd } : c)) }),
      debit: (id, usd) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, balance: Math.max(0, c.balance - usd) } : c)) }),
      deleteCard: (id) => {
        const card = get().cards.find((c) => c.id === id);
        const cards = get().cards.filter((c) => c.id !== id);
        set({ cards, walletDefault: nextDefault(cards, get().walletDefault) });
        return card;
      },
      addToWallet: (id) => set({ cards: get().cards.map((c) => (c.id === id ? { ...c, inWallet: true } : c)), walletDefault: get().walletDefault ?? id }),
      removeFromWallet: (id) => {
        const cards = get().cards.map((c) => (c.id === id ? { ...c, inWallet: false } : c));
        set({ cards, walletDefault: nextDefault(cards, get().walletDefault) });
      },
      setWalletDefault: (id) => {
        if (get().cards.some((c) => c.id === id && c.inWallet)) set({ walletDefault: id });
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
      clear: () => set({ cards: [], selected: null, walletDefault: null }),
      reset: () => set({ cards: SEED_CARDS.map((c) => ({ ...c })), selected: null, walletDefault: null }),
    }),
    {
      name: "tribe:cards",
      storage: persistStorage,
      version: 4,
      // v4: `theme` is a finish (preset or "custom:RRGGBB:pattern") + Apple Pay / Google Pay state.
      // Never reuse the key `design`: v1/v2 data used it for the old two-finish picker.
      migrate: (state, version) => {
        type Legacy = Omit<Partial<VirtualCard>, "theme"> & { design?: string; theme?: string };
        const s = state as { cards?: Legacy[]; selected?: string | null; walletDefault?: string | null };
        const legacy = (d?: string): CardTheme => (d === "sunset" ? "sunset" : d === "ink" ? "onyx" : "midnight");
        return {
          selected: version >= 3 ? (s.selected ?? null) : null,
          walletDefault: s.walletDefault ?? null,
          cards: (s.cards ?? (SEED_CARDS as Legacy[])).map(({ design, ...c }) => ({ network: "mastercard", holder: "Ada Okafor", address: CARD_ADDRESS, online: true, ...c, theme: c.theme ? parseFinish(c.theme) : legacy(design) })),
        } as CardsState;
      },
    },
  ),
);
