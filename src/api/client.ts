import type { AssetCode } from "@/data/assets";
import type { InboxItem } from "@/data/inbox";
import type { Transaction, VaultToken, VirtualCard } from "@/data/seed";
import { useCardsStore } from "@/stores/use-cards-store";
import { useInboxStore } from "@/stores/use-inbox-store";
import { useRecurringStore, type Schedule } from "@/stores/use-recurring-store";
import { useReferralStore, type Earning, type Withdrawal } from "@/stores/use-referral-store";
import { useVaultStore } from "@/stores/use-vault-store";
import { useWalletStore } from "@/stores/use-wallet-store";

/**
 * The one seam between screens and the backend. Screens read data through the React Query hooks
 * in `./queries`; each hook fetches one `resource` below.
 *
 * Today every resource is a mock: it waits for its Zustand store to load from AsyncStorage, then
 * returns a slice of it, and `sync` mirrors later store writes (money flows, resets) into the
 * query cache. When the API lands, swap each `fetch` for the real request (`TODO(api)`), drop
 * `local` and `sync`, and have flows invalidate the matching query keys instead.
 */

/** Simulated network time for previewing skeletons (`dev?action=latency&ms=1500`). 0 = instant. */
let latencyMs = 0;
export const setMockLatency = (ms: number) => {
  latencyMs = Math.max(0, ms);
};

/** The bits of a persisted Zustand store a resource needs. */
type Source<S> = {
  getState: () => S;
  subscribe: (listener: (state: S, prev: S) => void) => () => void;
  persist: { hasHydrated: () => boolean; onFinishHydration: (fn: (state: S) => void) => () => void };
};

const hydrated = <S,>(store: Source<S>) =>
  store.persist.hasHydrated()
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        const stop = store.persist.onFinishHydration(() => {
          stop();
          resolve();
        });
      });

export type Resource<T> = {
  key: readonly [string];
  fetch: () => Promise<T>;
  /** the data already on the device, so the first render needs no skeleton (undefined = load it) */
  local: () => T | undefined;
  /** mirror store writes into the cache under `key`; returns the unsubscribe */
  sync: (write: (key: readonly [string], data: T) => void) => () => void;
};

function resource<S, T>(name: string, store: Source<S>, select: (s: S) => T, parts: (s: S) => readonly unknown[]): Resource<T> {
  return {
    key: [name],
    fetch: async () => {
      await hydrated(store);
      if (latencyMs) await new Promise((r) => setTimeout(r, latencyMs));
      return select(store.getState());
    },
    local: () => (latencyMs === 0 && store.persist.hasHydrated() ? select(store.getState()) : undefined),
    sync: (write) =>
      store.subscribe((s, prev) => {
        const next = parts(s);
        const before = parts(prev);
        if (next.some((x, i) => x !== before[i])) write([name], select(s));
      }),
  };
}

export type Accounts = { balances: Record<AssetCode, number>; opened: AssetCode[] };
export type Referrals = { balance: number; earnings: Earning[]; withdrawals: Withdrawal[] };

export const resources = {
  // TODO(api): GET /accounts (balances per currency + which accounts are open)
  accounts: resource("accounts", useWalletStore, (s): Accounts => ({ balances: s.balances, opened: s.opened }), (s) => [s.balances, s.opened]),
  // TODO(api): GET /transactions (paginate when the list gets long)
  transactions: resource("transactions", useWalletStore, (s): Transaction[] => s.transactions, (s) => [s.transactions]),
  // TODO(api): GET /cards
  cards: resource("cards", useCardsStore, (s): VirtualCard[] => s.cards, (s) => [s.cards]),
  // TODO(api): GET /vault/tokens
  vault: resource("vault", useVaultStore, (s): VaultToken[] => s.tokens, (s) => [s.tokens]),
  // TODO(api): GET /inbox
  inbox: resource("inbox", useInboxStore, (s): InboxItem[] => s.items, (s) => [s.items]),
  // TODO(api): GET /recurring
  recurring: resource("recurring", useRecurringStore, (s): Schedule[] => s.schedules, (s) => [s.schedules]),
  // TODO(api): GET /referrals
  referrals: resource("referrals", useReferralStore, (s): Referrals => ({ balance: s.balance, earnings: s.earnings, withdrawals: s.withdrawals }), (s) => [s.balance, s.earnings, s.withdrawals]),
};
