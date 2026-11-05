import { useQuery } from "@tanstack/react-query";
import type { AssetCode } from "@/data/assets";
import { useSessionStore } from "@/stores/use-session-store";
import { lookupTag } from "./actions";
import { receiveResource, resources, transactionResource, type Resource } from "./client";

/**
 * Screen data. Each hook returns React Query's result: render a skeleton while `isPending`,
 * `QueryError` on `isError`, otherwise `data`. Data this phone loaded before paints at once
 * (`initialData` from the persisted store) and refreshes in the background.
 */
const useResource = <T,>(r: Resource<T>, enabled = true) => {
  const signedIn = useSessionStore((s) => s.signedIn);
  const local = r.local?.();
  return useQuery({
    queryKey: r.key,
    queryFn: ({ signal }) => r.fetch(signal),
    enabled: signedIn && enabled,
    initialData: local?.data,
    initialDataUpdatedAt: local?.updatedAt,
  });
};

export const useProfile = () => useResource(resources.profile);

/**
 * GET /kyc into the session (kycTiers) plus the profile beside it. `poll` refreshes both every
 * 30s — the verification centre turns it on while it's open and something is in review, so an
 * admin's decision shows up on its own.
 */
export function useKyc(poll = false) {
  const signedIn = useSessionStore((s) => s.signedIn);
  useQuery({ queryKey: resources.profile.key, queryFn: ({ signal }) => resources.profile.fetch(signal), enabled: signedIn && poll, refetchInterval: poll ? 30_000 : false });
  return useQuery({ queryKey: resources.kyc.key, queryFn: ({ signal }) => resources.kyc.fetch(signal), enabled: signedIn, refetchInterval: poll ? 30_000 : false });
}
export const useAccounts = () => useResource(resources.accounts);
export const useTransactions = () => useResource(resources.transactions);
export const useCards = () => useResource(resources.cards);
export const useVaultTokens = () => useResource(resources.vault);
export const useInbox = () => useResource(resources.inbox);
export const useRecurring = () => useResource(resources.recurring);
export const useReferrals = () => useResource(resources.referrals);
export const useBeneficiaries = () => useResource(resources.beneficiaries);
export const useDevices = () => useResource(resources.devices);
export const useCashpoints = () => useResource(resources.cashpoints);
export const useBillers = () => useResource(resources.billers);
export const useGiftBrands = () => useResource(resources.giftBrands);
export const useCardDesigns = () => useResource(resources.cardDesigns);
export const useChannels = () => useResource(resources.channels);
export const useAssets = () => useResource(resources.assets);
export const useTransaction = (id: string | undefined) => useResource(transactionResource(id ?? ""), !!id);
export const useReceiveDetails = (code: AssetCode) => useResource(receiveResource(code));

/** "@ada" → the Tribe user's name (GET recipients/lookup), as you type. */
export function useTagLookup(query: string) {
  const tag = query.trim().toLowerCase().replace(/^@/, "");
  const valid = /^[a-z0-9_.]{3,32}$/.test(tag);
  const signedIn = useSessionStore((s) => s.signedIn);
  return useQuery({
    queryKey: ["lookup", tag],
    queryFn: ({ signal }) => lookupTag(tag, signal),
    enabled: signedIn && valid,
    retry: false,
    staleTime: 60_000,
  });
}
