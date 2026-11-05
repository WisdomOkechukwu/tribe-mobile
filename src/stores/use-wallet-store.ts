import { create } from "zustand";
import { persist } from "zustand/middleware";
import { assetByCode, type AssetCode } from "@/data/assets";
import { SEED_BALANCES, SEED_OPENED, SENDER_SEED_IDS, seedTransactions, type Transaction } from "@/data/seed";
import { formatAsset, quote, randomDigits } from "@/utils/format";
import { persistStorage } from "./storage";

export class InsufficientFunds extends Error {
  constructor(code: AssetCode) {
    super(`Not enough ${assetByCode(code).name} for this.`);
  }
}

type NewTx = Omit<Transaction, "id" | "date" | "reference" | "status"> & { status?: Transaction["status"] };

type WalletState = {
  balances: Record<AssetCode, number>;
  transactions: Transaction[];
  /** currencies the user has opened (NGN always). Others are opened via /add-currency. */
  opened: AssetCode[];
  openAccount: (code: AssetCode) => void;
  /** low-level: move value and log it. All flows go through `record`. */
  record: (tx: NewTx, deltas: Partial<Record<AssetCode, number>>) => Transaction;
  send: (p: { asset: AssetCode; amount: number; fee: number; to: string; channel: string; name?: string; toAsset?: AssetCode; toAmount?: number; network?: string; country?: string; scope?: "local" | "global" | "crypto"; recipientKind?: "tribe" | "bank" | "wallet"; eta?: string }) => Transaction;
  swap: (p: { from: AssetCode; to: AssetCode; amount: number }) => Transaction;
  generateCashpoint: (amount: number) => Transaction;
  redeemCashpoint: (code: string, amount: number) => Transaction;
  /** cancel an unredeemed Cashpoint: the Naira comes back, the code stops working */
  cancelCashpoint: (txId: string) => void;
  /** a brand-new account has no card yet, so it has no card activity either */
  dropCardActivity: () => void;
  reset: () => void;
};

/** History kept on the device. Every write serialises the whole list, so it can't grow forever. */
const MAX_TRANSACTIONS = 300;
/** Newest first, capped — older settled entries drop off; anything still pending is kept. */
const capped = (list: Transaction[]) =>
  list.length <= MAX_TRANSACTIONS ? list : list.filter((t, i) => i < MAX_TRANSACTIONS || t.status === "pending");

const newId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const newRef = () => `TRB-${Date.now().toString(36).toUpperCase().slice(-6)}`;

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balances: { ...SEED_BALANCES },
      transactions: seedTransactions(),
      opened: [...SEED_OPENED],
      openAccount: (code) => set((s) => (s.opened.includes(code) ? s : { opened: [...s.opened, code] })),

      record: (tx, deltas) => {
        const balances = { ...get().balances };
        for (const [code, delta] of Object.entries(deltas) as [AssetCode, number][]) {
          if (balances[code] + delta < -1e-9) throw new InsufficientFunds(code);
          balances[code] += delta;
        }
        const full: Transaction = { status: "completed", ...tx, id: newId(), date: new Date().toISOString(), reference: newRef() };
        set({ balances, transactions: capped([full, ...get().transactions]) });
        return full;
      },

      send: ({ asset, amount, fee, to, channel, name, toAsset, toAmount, network, country, scope, recipientKind, eta }) => {
        const converted = !!toAsset && toAsset !== asset;
        // bank payouts abroad clear over hours/days; Tribe users and crypto settle now
        const pending = scope === "global" && recipientKind === "bank";
        return get().record(
          {
            type: "send",
            asset,
            amount,
            direction: "out",
            fee,
            status: pending ? "pending" : "completed",
            ...(converted ? { toAsset, toAmount } : {}),
            title: `To ${name ?? to}`,
            subtitle: `${channel} · ${to}`,
            meta: { recipient: name, handle: to, channel, network, country, scope, recipientKind, eta, face: converted && toAsset && toAmount !== undefined ? formatAsset(toAmount, toAsset) : undefined },
          },
          { [asset]: -(amount + fee) },
        );
      },

      swap: ({ from, to, amount }) => {
        const q = quote(amount, from, to);
        const rate = q.rate >= 1 ? q.rate.toLocaleString("en-US", { maximumFractionDigits: 2 }) : (1 / q.rate).toLocaleString("en-US", { maximumFractionDigits: 2 });
        return get().record(
          { type: "swap", asset: from, amount, direction: "out", toAsset: to, toAmount: q.receive, fee: q.fee, title: `Swapped ${from} → ${to}`, subtitle: `Rate ${rate}` },
          { [from]: -amount, [to]: q.receive },
        );
      },

      generateCashpoint: (amount) => {
        const code = randomDigits(12);
        return get().record(
          { type: "cashpoint", asset: "NGN", amount, direction: "out", status: "pending", title: "Cashpoint generated", subtitle: "Waiting to be redeemed", meta: { code } },
          { NGN: -amount },
        );
      },

      redeemCashpoint: (code, amount) =>
        get().record(
          { type: "cashpoint", asset: "NGN", amount, direction: "in", title: "Cashpoint redeemed", subtitle: `Code •••• ${code.slice(-4)}`, meta: { code } },
          { NGN: amount },
        ),

      cancelCashpoint: (txId) => {
        const tx = get().transactions.find((t) => t.id === txId);
        if (!tx || tx.type !== "cashpoint" || tx.direction !== "out" || tx.status !== "pending") return;
        set({
          balances: { ...get().balances, NGN: get().balances.NGN + tx.amount },
          transactions: get().transactions.map((t) => (t.id === txId ? { ...t, status: "cancelled", subtitle: "Cancelled · Naira refunded" } : t)),
        });
      },

      dropCardActivity: () => set((s) => ({ transactions: s.transactions.filter((t) => t.type !== "card" && !t.meta?.cardId) })),

      reset: () => set({ balances: { ...SEED_BALANCES }, transactions: seedTransactions(), opened: [...SEED_OPENED] }),
    }),
    {
      name: "tribe:wallet",
      storage: persistStorage,
      version: 5,
      migrate: (state, version) => {
        const s = { opened: [...SEED_OPENED], ...(state as object) } as WalletState;
        if (version < 3 && Array.isArray(s.transactions)) {
          // v3: bills & gift cards record what paid + the face value — backfill the seeded ones
          const seeds = new Map(seedTransactions().map((t) => [t.id, t]));
          s.transactions = s.transactions.map((t) => {
            const seed = seeds.get(t.id);
            return seed?.meta?.face && !t.meta?.face ? { ...t, subtitle: seed.subtitle, meta: { ...t.meta, ...seed.meta } } : t;
          });
        }
        if (version < 4 && Array.isArray(s.transactions) && !s.transactions.some((t) => t.id === "t17")) {
          // v4: seed a card top-up that shows the currency it was funded from
          const topUp = seedTransactions().find((t) => t.id === "t17")!;
          s.transactions = [...s.transactions, topUp].sort((a, b) => b.date.localeCompare(a.date));
        }
        if (version < 5 && Array.isArray(s.transactions)) {
          // v5: deposits know their sender (receipt → "More from…"); add the earlier seed deposits
          const seeds = new Map(seedTransactions().map((t) => [t.id, t]));
          s.transactions = s.transactions.map((t) => {
            const seed = seeds.get(t.id);
            return t.type === "receive" && !t.meta?.sender && seed?.meta?.sender ? { ...t, meta: { ...t.meta, ...seed.meta } } : t;
          });
          const have = new Set(s.transactions.map((t) => t.id));
          const extra = SENDER_SEED_IDS.filter((id) => !have.has(id)).map((id) => seeds.get(id)!);
          s.transactions = [...s.transactions, ...extra].sort((a, b) => b.date.localeCompare(a.date));
        }
        return s;
      },
    },
  ),
);

/** Total portfolio value in USD (selector-friendly). */
export const portfolioUsd = (balances: Record<AssetCode, number>) =>
  (Object.entries(balances) as [AssetCode, number][]).reduce((sum, [code, amt]) => sum + amt * assetByCode(code).usd, 0);
