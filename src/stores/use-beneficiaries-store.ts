import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssetCode } from "@/data/assets";
import { persistStorage } from "./storage";

/**
 * Saved recipients (Send - Global currencies.png / Send - Cryptocurrency.png "Beneficiaries").
 * `handle` is what we show under the name: @tag, a masked account, or a short wallet address.
 */
export type Beneficiary = {
  id: string;
  kind: "tribe" | "bank" | "wallet";
  name: string;
  handle: string;
  /** currency they receive */
  asset: AssetCode;
  channelId?: string;
  network?: string;
  country?: string;
  /** the payment details as entered, for repeat sends */
  details?: Record<string, string>;
};

export type BeneficiaryDraft = Omit<Beneficiary, "id">;

type State = {
  /** as last loaded from GET /beneficiaries */
  items: Beneficiary[];
  setItems: (items: Beneficiary[]) => void;
  /** a saved one, shown straight away (the list refetches after) */
  upsert: (b: Beneficiary) => void;
  drop: (id: string) => void;
  /** already saved? (same currency + handle) */
  has: (b: Pick<Beneficiary, "asset" | "handle">) => boolean;
  reset: () => void;
};

export const useBeneficiariesStore = create<State>()(
  persist(
    (set, get) => ({
      items: [],
      setItems: (items) => set({ items }),
      upsert: (b) => set({ items: [b, ...get().items.filter((x) => x.id !== b.id && !(x.asset === b.asset && x.handle === b.handle))] }),
      drop: (id) => set({ items: get().items.filter((b) => b.id !== id) }),
      has: (b) => get().items.some((x) => x.asset === b.asset && x.handle === b.handle),
      reset: () => set({ items: [] }),
    }),
    {
      name: "tribe:beneficiaries",
      storage: persistStorage,
      version: 2,
      migrate: (state, version) => (version < 2 ? { items: [] } : state) as State,
    },
  ),
);
