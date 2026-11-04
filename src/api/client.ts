import { isAssetCode } from "@/api/mappers";
import type { AssetCode } from "@/data/assets";
import { allBillers, allGiftBrands, type Biller, type GiftBrand } from "@/data/catalog";
import type { InboxItem } from "@/data/inbox";
import type { Transaction, VaultToken, VirtualCard } from "@/data/seed";
import { useBeneficiariesStore, type Beneficiary } from "@/stores/use-beneficiaries-store";
import { useCardsStore } from "@/stores/use-cards-store";
import { useCatalogStore } from "@/stores/use-catalog-store";
import { useInboxStore } from "@/stores/use-inbox-store";
import { useRecurringStore, type Schedule } from "@/stores/use-recurring-store";
import { useReferralStore, type Earning, type Withdrawal } from "@/stores/use-referral-store";
import { useSessionStore, type ProfileResource } from "@/stores/use-session-store";
import { useSyncStore } from "@/stores/use-sync-store";
import { useVaultStore } from "@/stores/use-vault-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import type { TierState, TierStateName, VerifyTier } from "@/utils/kyc-state";
import { api, request } from "./http";
import { num, toBeneficiary, toCard, toDevice, toInboxItem, toReferrals, toSchedule, toTransaction, toVaultToken, type Device } from "./mappers";
import type {
  AssetResource,
  BeneficiaryResource,
  BillerResource,
  CardDesignsResource,
  CardResource,
  CashpointResource,
  ChannelResource,
  DeviceResource,
  GiftBrandResource,
  InboxResource,
  ReceiveResource,
  RecurringResource,
  ReferralsResource,
  SwapLegResource,
  TransactionResource,
  VaultTokenResource,
  WalletsResource,
} from "./types";

/**
 * The one seam between screens and the Tribe API. Screens read data through the React Query
 * hooks in `./queries`; each hook fetches one `resource` below.
 *
 * A resource fetches from the API, maps the response onto the app's types, and writes it into
 * its Zustand store, so screens that read a store directly see the same data. Non-money stores
 * are persisted, so the app opens on the last copy while a fresh one loads; money (balances,
 * history, cards, referrals) and rates live in memory only and always come fresh from the API. `local` hands that copy to React
 * Query as `initialData` (only once this phone has loaded the resource at least once, so a
 * first load shows a skeleton, not an empty state), and `sync` mirrors optimistic store writes
 * back into the cache. Money flows and actions invalidate the keys they change.
 */
export type Resource<T> = {
  key: readonly unknown[];
  fetch: (signal?: AbortSignal) => Promise<T>;
  /** the data already on the device; undefined = never loaded, show a skeleton */
  local?: () => { data: T; updatedAt: number } | undefined;
  /** mirror store writes into the cache under `key`; returns the unsubscribe */
  sync?: (write: (key: readonly unknown[], data: T) => void) => () => void;
};

type Store<S> = { getState: () => S; subscribe: (listener: (state: S, prev: S) => void) => () => void };

/** A resource backed by a store slice. `save` writes the API's answer into the store. */
function cached<S, T, R>(name: string, store: Store<S>, opts: { path: string; query?: Record<string, string>; map: (raw: R) => T; save: (data: T) => void; select: (s: S) => T; parts: (s: S) => readonly unknown[] }): Resource<T> {
  return {
    key: [name],
    fetch: async (signal) => {
      const data = opts.map(await api.get<R>(opts.path, opts.query, signal));
      opts.save(data);
      useSyncStore.getState().mark(name);
      return data;
    },
    local: () => {
      const at = useSyncStore.getState().loaded[name];
      return at && useSessionStore.getState().signedIn ? { data: opts.select(store.getState()), updatedAt: at } : undefined;
    },
    sync: (write) =>
      store.subscribe((s, prev) => {
        const next = opts.parts(s);
        const before = opts.parts(prev);
        if (next.some((x, i) => x !== before[i])) write([name], opts.select(s));
      }),
  };
}

/** A plain API resource (no store): catalogue lists, details, devices. */
function remote<T, R>(key: readonly unknown[], path: string, map: (raw: R) => T, query?: Record<string, string>): Resource<T> {
  return { key, fetch: async (signal) => map(await api.get<R>(path, query, signal)) };
}

export type Accounts = { balances: Record<AssetCode, number>; balancesRaw: Partial<Record<AssetCode, string>>; opened: AssetCode[] };
export type Referrals = { balance: number; balanceRaw: string; earnings: Earning[]; withdrawals: Withdrawal[]; code: string | null; invited: number };
export type TransactionDetail = { tx: Transaction; route: SwapLegResource[] };
export type CardDesigns = CardDesignsResource;
export type Cashpoint = { id: string; code: string; amount: number; status: string; txId: string; createdAt: string; redeemedAt: string | null };

/** Recurring amounts: the API sends naira ("3500.00"), or kobo units on older builds ("350000"). */
const recurringNaira = (r: RecurringResource) => (r.amount_ngn.includes(".") ? r.amount_ngn : String(num(r.amount_ngn) / 100));

const planName = (billerId: string, planId: string | null) => (planId ? useCatalogStore.getState().billers.find((b) => b.id === billerId)?.plans?.find((p) => p.id === planId)?.name : undefined);

const toAccounts = (w: WalletsResource): Accounts => {
  const balances = {} as Record<AssetCode, number>;
  const balancesRaw: Partial<Record<AssetCode, string>> = {};
  for (const [code, value] of Object.entries(w.balances)) {
    if (!isAssetCode(code)) continue;
    balances[code] = num(value);
    balancesRaw[code] = value;
  }
  return { balances, balancesRaw, opened: w.opened.filter(isAssetCode) };
};

/** GET /kyc `tiers[]` (the server's word for each tier) → the app's TierState. */
type KycResource = { tier: number; status: string; open: { id: string; tier: number; submitted_at: string } | null; tiers?: { tier: number; state: string; submitted_at: string | null; decided_at: string | null; reason: string | null }[] };
const TIER_STATES: TierStateName[] = ["verified", "in_review", "needs_attention", "available", "locked"];
const toTierStates = (k: KycResource): TierState[] =>
  (k.tiers ?? [])
    .filter((t) => t.tier >= 1 && t.tier <= 3)
    .map((t) => ({
      tier: t.tier as VerifyTier,
      state: TIER_STATES.includes(t.state as TierStateName) ? (t.state as TierStateName) : "locked",
      reason: t.reason || undefined,
      submittedAt: t.submitted_at ?? undefined,
      afterTier: t.state === "locked" ? ((k.open?.tier ?? t.tier - 1) as VerifyTier) : undefined,
    }));

/** GET /kyc into the session (kycTiers). Profile refreshes call it too, so the two stay in step. */
const fetchKyc = async (signal?: AbortSignal) => {
  const tiers = toTierStates(await api.get<KycResource>("kyc", undefined, signal));
  useSessionStore.getState().setKycTiers(tiers);
  return tiers;
};

export const resources = {
  profile: {
    key: ["profile"],
    fetch: async (signal?: AbortSignal) => {
      const p = await api.get<ProfileResource>("profile", undefined, signal);
      useSessionStore.getState().applyProfile(p);
      // the per-tier detail (rejection reasons) follows every profile refresh, in the background
      fetchKyc().catch(() => {});
      return p;
    },
  } satisfies Resource<ProfileResource>,

  kyc: { key: ["kyc"], fetch: fetchKyc } satisfies Resource<TierState[]>,

  accounts: cached<ReturnType<typeof useWalletStore.getState>, Accounts, WalletsResource>("accounts", useWalletStore, {
    path: "wallets",
    map: toAccounts,
    save: (a) => useWalletStore.getState().setWallets(a),
    select: (s) => ({ balances: s.balances, balancesRaw: s.balancesRaw, opened: s.opened }),
    parts: (s) => [s.balances, s.opened],
  }),

  // the first page (newest first); History pages on with `fetchTransactionsPage`
  transactions: cached<ReturnType<typeof useWalletStore.getState>, Transaction[], TransactionResource[]>("transactions", useWalletStore, {
    path: "transactions",
    map: (list) => list.map(toTransaction),
    save: (list) => useWalletStore.getState().setTransactions(list),
    select: (s) => s.transactions,
    parts: (s) => [s.transactions],
  }),

  cards: cached<ReturnType<typeof useCardsStore.getState>, VirtualCard[], CardResource[]>("cards", useCardsStore, {
    path: "cards",
    map: (list) => list.map(toCard),
    save: (cards) => useCardsStore.getState().setCards(cards),
    select: (s) => s.cards,
    parts: (s) => [s.cards],
  }),

  vault: cached<ReturnType<typeof useVaultStore.getState>, VaultToken[], VaultTokenResource[]>("vault", useVaultStore, {
    path: "vault/tokens",
    map: (list) => list.map(toVaultToken),
    save: (tokens) => useVaultStore.getState().setTokens(tokens),
    select: (s) => s.tokens,
    parts: (s) => [s.tokens],
  }),

  inbox: cached<ReturnType<typeof useInboxStore.getState>, InboxItem[], InboxResource[]>("inbox", useInboxStore, {
    path: "inbox",
    map: (list) => list.map(toInboxItem),
    save: (items) => {
      const seen = new Set(useInboxStore.getState().items.map((i) => i.id));
      useInboxStore.getState().setItems(items);
      // a new security message (a verification was approved or needs attention): refresh the
      // profile and the tiers so every screen shows the decision without a pull-to-refresh
      if (seen.size && items.some((i) => i.kind === "security" && !seen.has(i.id))) resources.profile.fetch().catch(() => {});
    },
    select: (s) => s.items,
    parts: (s) => [s.items],
  }),

  recurring: cached<ReturnType<typeof useRecurringStore.getState>, Schedule[], RecurringResource[]>("recurring", useRecurringStore, {
    path: "recurring-bills",
    map: (list) => list.map((r) => toSchedule({ ...r, amount_ngn: recurringNaira(r) }, planName(r.biller_id, r.plan_id))),
    save: (schedules) => useRecurringStore.getState().setSchedules(schedules),
    select: (s) => s.schedules,
    parts: (s) => [s.schedules],
  }),

  referrals: cached<ReturnType<typeof useReferralStore.getState>, Referrals, ReferralsResource>("referrals", useReferralStore, {
    path: "referrals",
    map: (r) => ({ ...toReferrals(r), balanceRaw: r.balance }),
    save: (r) => useReferralStore.getState().setReferrals({ ...r, code: r.code ?? "" }),
    select: (s) => ({ balance: s.balance, balanceRaw: s.balanceRaw, earnings: s.earnings, withdrawals: s.withdrawals, code: s.code, invited: s.invited }),
    parts: (s) => [s.balance, s.earnings, s.withdrawals],
  }),

  beneficiaries: cached<ReturnType<typeof useBeneficiariesStore.getState>, Beneficiary[], BeneficiaryResource[]>("beneficiaries", useBeneficiariesStore, {
    path: "beneficiaries",
    map: (list) => list.map(toBeneficiary),
    save: (items) => useBeneficiariesStore.getState().setItems(items),
    select: (s) => s.items,
    parts: (s) => [s.items],
  }),

  devices: remote<Device[], DeviceResource[]>(["devices"], "devices", (list) => list.map(toDevice).sort((a, b) => Number(b.current) - Number(a.current) || b.lastActive.localeCompare(a.lastActive))),

  cashpoints: remote<Cashpoint[], CashpointResource[]>(["cashpoints"], "cashpoints", (list) =>
    list.map((c) => ({ id: c.id, code: c.code, amount: num(c.amount), status: c.status, txId: c.transaction_id, createdAt: c.created_at, redeemedAt: c.redeemed_at })),
  ),

  // catalogues: shared by every user, persisted in the catalog store
  billers: catalog<Biller[], BillerResource[]>("billers", "billers", (list) => useCatalogStore.getState().set({ billers: list }), () => allBillers(), (s) => s.billers.length > 0),
  giftBrands: catalog<GiftBrand[], GiftBrandResource[]>("giftBrands", "gift-cards/brands", (list) => useCatalogStore.getState().set({ brands: list }), () => allGiftBrands(), (s) => s.brands.length > 0),
  cardDesigns: catalog<CardDesigns, CardDesignsResource>("cardDesigns", "card-designs", (designs) => useCatalogStore.getState().set({ designs }), () => useCatalogStore.getState().designs!, (s) => !!s.designs),
  channels: catalog<ChannelResource[], ChannelResource[]>("channels", "channels", (list) => useCatalogStore.getState().set({ channels: list }), () => useCatalogStore.getState().channels, (s) => s.channels.length > 0),
  assets: catalog<AssetResource[], AssetResource[]>("assets", "assets", (list) => useCatalogStore.getState().set({ assets: list }), () => useCatalogStore.getState().assets, (s) => s.assets.length > 0),
};

/** A catalogue list: saved to the catalog store, painted from it on the next launch. */
function catalog<T, R>(name: string, path: string, save: (raw: R) => void, read: () => T, has: (s: ReturnType<typeof useCatalogStore.getState>) => boolean): Resource<T> {
  return {
    key: ["catalog", name],
    fetch: async (signal) => {
      save(await api.get<R>(path, undefined, signal));
      useSyncStore.getState().mark(`catalog:${name}`);
      return read();
    },
    local: () => {
      const at = useSyncStore.getState().loaded[`catalog:${name}`];
      return at && has(useCatalogStore.getState()) ? { data: read(), updatedAt: at } : undefined;
    },
  };
}

/** One transaction with its route legs (the receipt). */
export const transactionResource = (id: string): Resource<TransactionDetail> =>
  remote(["transaction", id], `transactions/${encodeURIComponent(id)}`, (r: { transaction: TransactionResource; route: SwapLegResource[] }) => ({ tx: toTransaction(r.transaction), route: r.route ?? [] }));

/** Account / address details to receive money into a currency. */
export const receiveResource = (code: AssetCode): Resource<ReceiveResource> => remote(["receive", code], `wallets/${code}/receive`, (r: ReceiveResource) => r);

/** Older activity: GET /transactions?cursor=… (meta.next_cursor). */
export async function fetchTransactionsPage(cursor?: string, filters: { type?: string; asset?: string; card_id?: string; category?: string } = {}) {
  const res = await request<TransactionResource[]>("transactions", { query: { ...filters, cursor } });
  return { items: res.data.map(toTransaction), nextCursor: (res.meta?.next_cursor as string | undefined) || undefined };
}
