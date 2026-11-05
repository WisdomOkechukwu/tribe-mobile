import { useQuery } from "@tanstack/react-query";
import { resources, type Resource } from "./client";

/**
 * Screen data. Each hook returns React Query's result: render a skeleton while `isPending`,
 * `QueryError` on `isError`, otherwise `data`. With the on-device mocks `data` is there on the
 * first render, so skeletons only show on a real (or `dev?action=latency`) load.
 */
const useResource = <T,>(r: Resource<T>) => useQuery({ queryKey: r.key, queryFn: r.fetch, initialData: r.local });

export const useAccounts = () => useResource(resources.accounts);
export const useTransactions = () => useResource(resources.transactions);
export const useCards = () => useResource(resources.cards);
export const useVaultTokens = () => useResource(resources.vault);
export const useInbox = () => useResource(resources.inbox);
export const useRecurring = () => useResource(resources.recurring);
export const useReferrals = () => useResource(resources.referrals);
