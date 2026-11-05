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

const SEED: Beneficiary[] = [
  { id: "b1", kind: "tribe", name: "Tolulope Adeyemi", handle: "@tolu", asset: "NGN" },
  { id: "b2", kind: "bank", name: "Chiamaka Eze", handle: "GTBank •• 4410", asset: "NGN", channelId: "ngn-bank", country: "NG", details: { bank: "GTBank", account: "0123454410" } },
  { id: "b3", kind: "bank", name: "Jackson Seun", handle: "JPMorgan Chase •• 4321", asset: "USD", channelId: "ach", country: "US", details: { name: "Jackson Seun", account: "000123454321", routing: "021000021", accountType: "Checking", address: "245 Park Avenue, New York, NY 10167", purpose: "Family support" } },
  { id: "b4", kind: "bank", name: "Amara Obi", handle: "Sort 04-00-04 •• 7710", asset: "GBP", channelId: "fps", country: "GB", details: { accountType: "Personal", name: "Amara Obi", account: "12347710", sortCode: "040004", reference: "Rent" } },
  { id: "b5", kind: "bank", name: "Kwame Mensah", handle: "MTN MoMo •• 5521", asset: "GHS", channelId: "momo", country: "GH", details: { network: "MTN MoMo", phone: "241235521", name: "Kwame Mensah" } },
  { id: "b6", kind: "wallet", name: "My Ledger", handle: "bc1qxy…0wlh", asset: "BTC", network: "btc", details: { address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" } },
  { id: "b7", kind: "wallet", name: "Binance (USDT)", handle: "TQ7ndY…8XcVq", asset: "USDT", network: "trc20", details: { address: "TQ7ndYh8YwQw5mJ9Uk2Fk1vS3aNbr8XcVq" } },
];

type State = {
  items: Beneficiary[];
  add: (b: BeneficiaryDraft) => Beneficiary;
  remove: (id: string) => void;
  /** already saved? (same currency + handle) */
  has: (b: Pick<Beneficiary, "asset" | "handle">) => boolean;
  reset: () => void;
};

export const useBeneficiariesStore = create<State>()(
  persist(
    (set, get) => ({
      items: SEED,
      add: (b) => {
        const saved = { ...b, id: `b${Date.now().toString(36)}` };
        set({ items: [saved, ...get().items.filter((x) => !(x.asset === b.asset && x.handle === b.handle))] });
        return saved;
      },
      remove: (id) => set({ items: get().items.filter((b) => b.id !== id) }),
      has: (b) => get().items.some((x) => x.asset === b.asset && x.handle === b.handle),
      reset: () => set({ items: SEED }),
    }),
    { name: "tribe:beneficiaries", storage: persistStorage, version: 1 },
  ),
);
