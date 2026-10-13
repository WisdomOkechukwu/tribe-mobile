import { useBeneficiariesStore } from "./use-beneficiaries-store";
import { useCardsStore } from "./use-cards-store";
import { useInboxStore } from "./use-inbox-store";
import { useReferralStore } from "./use-referral-store";
import { useRecurringStore } from "./use-recurring-store";
import { useSupportStore } from "./use-support-store";
import { useVaultStore } from "./use-vault-store";
import { useWalletStore } from "./use-wallet-store";

/** Puts every demo store back to the seed data (log out, delete account, dev reset). */
export function resetDemoData() {
  useWalletStore.getState().reset();
  useCardsStore.getState().reset();
  useVaultStore.getState().reset();
  useInboxStore.getState().reset();
  useRecurringStore.getState().reset();
  useSupportStore.getState().reset();
  useBeneficiariesStore.getState().reset();
  useReferralStore.getState().reset();
}

/**
 * A fresh sign-up keeps the demo balances (so every flow is testable) but starts without a
 * virtual card: the Cards tab walks them through creating one first.
 */
export function startNewAccount() {
  useCardsStore.getState().clear();
  useWalletStore.getState().dropCardActivity();
}
