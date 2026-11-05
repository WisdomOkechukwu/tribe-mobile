import { useBeneficiariesStore } from "./use-beneficiaries-store";
import { useCardsStore } from "./use-cards-store";
import { useCatalogStore } from "./use-catalog-store";
import { useFlowStore } from "./use-flow-store";
import { useInboxStore } from "./use-inbox-store";
import { useRatesStore } from "./use-rates-store";
import { useReferralStore } from "./use-referral-store";
import { useRecurringStore } from "./use-recurring-store";
import { useSupportStore } from "./use-support-store";
import { useSyncStore } from "./use-sync-store";
import { useVaultStore } from "./use-vault-store";
import { useWalletStore } from "./use-wallet-store";

/**
 * Forgets the signed-in user's cached data (sign-out, a different account signing in, delete
 * account). Everything comes back from the API on the next sign-in.
 */
export function clearUserData() {
  useWalletStore.getState().reset();
  useCardsStore.getState().reset();
  useVaultStore.getState().reset();
  useInboxStore.getState().reset();
  useRecurringStore.getState().reset();
  useSupportStore.getState().reset();
  useBeneficiariesStore.getState().reset();
  useReferralStore.getState().reset();
  useRatesStore.getState().reset();
  useSyncStore.getState().reset();
  useCatalogStore.getState().resetUserScoped();
  useFlowStore.getState().clear();
}
