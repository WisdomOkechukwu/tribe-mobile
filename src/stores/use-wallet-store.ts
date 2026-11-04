import { create } from "zustand";
import type { AssetCode } from "@/data/assets";
import type { Transaction } from "@/data/seed";
import { usdRate } from "@/utils/rates";

const EMPTY_BALANCES: Record<AssetCode, number> = { NGN: 0, USD: 0, GBP: 0, EUR: 0, KES: 0, GHS: 0, CAD: 0, USDT: 0, BTC: 0, ETH: 0, USDC: 0, SOL: 0 };

type WalletState = {
  /** for display (formatAsset takes numbers) */
  balances: Record<AssetCode, number>;
  /** exactly as the API sent them, for balance checks (`utils/decimal.ts`) */
  balancesRaw: Partial<Record<AssetCode, string>>;
  /** newest first: the first page of GET /transactions (later pages stay in the query cache) */
  transactions: Transaction[];
  /** currencies the user has opened (NGN always). Others are opened via /add-currency. */
  opened: AssetCode[];
  /** written by the `accounts` resource (GET /wallets) */
  setWallets: (w: { balances: Record<AssetCode, number>; balancesRaw: Partial<Record<AssetCode, string>>; opened: AssetCode[] }) => void;
  /** written by the `transactions` resource (GET /transactions) */
  setTransactions: (list: Transaction[]) => void;
  /** a transaction a money flow just got back from the API (shown before the list refetches) */
  upsertTransaction: (tx: Transaction) => void;
  reset: () => void;
};

/** History kept in memory (the first page plus anything a flow just added), capped. */
const MAX_TRANSACTIONS = 300;

/**
 * The signed-in user's wallets and recent activity, as last loaded from the API. Memory only:
 * balances and history are never kept on the device, so every launch shows skeletons until the
 * API answers. Never edited locally: money only moves through the API, then the queries refetch.
 */
export const useWalletStore = create<WalletState>()((set, get) => ({
  balances: { ...EMPTY_BALANCES },
  balancesRaw: {},
  transactions: [],
  opened: ["NGN"],
  setWallets: ({ balances, balancesRaw, opened }) => set({ balances: { ...EMPTY_BALANCES, ...balances }, balancesRaw, opened: opened.length ? opened : ["NGN"] }),
  setTransactions: (transactions) => set({ transactions: transactions.slice(0, MAX_TRANSACTIONS) }),
  upsertTransaction: (tx) => set({ transactions: [tx, ...get().transactions.filter((t) => t.id !== tx.id)].slice(0, MAX_TRANSACTIONS) }),
  reset: () => set({ balances: { ...EMPTY_BALANCES }, balancesRaw: {}, transactions: [], opened: ["NGN"] }),
}));

/**
 * Total portfolio value in USD at live rates (display only); NaN until the server's rates for every
 * held asset have arrived, so callers show a skeleton (`hasRates` / `Number.isFinite`).
 * `version` (useRatesVersion) only tells the React Compiler the total moves with the rates.
 */
export const portfolioUsd = (balances: Record<AssetCode, number>, version?: number) =>
  (Object.entries(balances) as [AssetCode, number][]).reduce((sum, [code, amt]) => (amt ? sum + amt * usdRate(code, version) : sum), 0);
