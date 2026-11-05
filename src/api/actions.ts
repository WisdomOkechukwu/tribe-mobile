import type { AssetCode } from "@/data/assets";
import type { CardFinish, VirtualCard } from "@/data/seed";
import { useBeneficiariesStore, type Beneficiary, type BeneficiaryDraft } from "@/stores/use-beneficiaries-store";
import { useCardsStore } from "@/stores/use-cards-store";
import { useInboxStore } from "@/stores/use-inbox-store";
import { nextDate, useRecurringStore, type Frequency, type Schedule } from "@/stores/use-recurring-store";
import { useSupportStore, type IssueReason, type SupportTicket } from "@/stores/use-support-store";
import { useVaultStore } from "@/stores/use-vault-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { amountString } from "@/utils/decimal";
import { resources } from "./client";
import { api, ApiError } from "./http";
import { toBeneficiary, toCard, toTransaction } from "./mappers";
import { invalidate, queryClient, refreshAfterMoney } from "./query-client";
import type { BeneficiaryResource, CardResource, TransactionResource, WalletsResource } from "./types";

/**
 * Everything that changes data outside the review → PIN → success money flows. Each action
 * calls the API, then refreshes (or optimistically updates, rolling back on failure) the data
 * screens read. All of them throw `ApiError`; callers show `error.message`.
 */

// ─── wallets ────────────────────────────────────────────────────────────

/** Open a currency (add-currency flow, pickers' "Tap to create"). */
export async function openWallet(code: AssetCode) {
  await api.post<WalletsResource>(`wallets/${code}/open`);
  if (!useWalletStore.getState().opened.includes(code)) useWalletStore.setState((s) => ({ opened: [...s.opened, code] }));
  invalidate(resources.accounts.key);
}

// ─── virtual cards ──────────────────────────────────────────────────────

/** Optimistic: the change shows at once, a failure puts the card back. */
async function changeCard(card: VirtualCard, patch: Partial<VirtualCard>, call: () => Promise<CardResource>) {
  const before = useCardsStore.getState().cards.find((c) => c.id === card.id);
  useCardsStore.getState().patchCard(card.id, patch);
  try {
    const saved = toCard(await call());
    // the PATCH answer has no balance (the ledger owns it): keep ours
    useCardsStore.getState().patchCard(card.id, { ...saved, balance: before?.balance ?? saved.balance });
  } catch (error) {
    if (before) useCardsStore.getState().patchCard(card.id, before);
    throw error;
  } finally {
    invalidate(resources.cards.key);
  }
}

const version = (card: VirtualCard) => useCardsStore.getState().cards.find((c) => c.id === card.id)?.version ?? card.version ?? 0;

/** Try the dedicated route first; older API builds only have PATCH cards/:id. */
async function patchCardRoute(card: VirtualCard, route: string, body: Record<string, unknown>) {
  try {
    return await api.patch<CardResource>(`cards/${card.id}/${route}`, body);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 405)) return api.patch<CardResource>(`cards/${card.id}`, body);
    throw error;
  }
}

export const setCardFrozen = (card: VirtualCard, frozen: boolean) => changeCard(card, { frozen }, () => api.post<CardResource>(`cards/${card.id}/${frozen ? "freeze" : "unfreeze"}`));

export const setCardDesign = (card: VirtualCard, finish: CardFinish) =>
  changeCard(card, { theme: finish }, () => patchCardRoute(card, "design", { design_finish: finish, version: version(card) }));

export const setCardLimit = (card: VirtualCard, usd: number) =>
  changeCard(card, { monthlyLimit: usd }, () => patchCardRoute(card, "limit", { monthly_limit: amountString(usd, 2), version: version(card) }));

export const setCardOnline = (card: VirtualCard, on: boolean) => changeCard(card, { online: on }, () => api.patch<CardResource>(`cards/${card.id}`, { online_payments_enabled: on, version: version(card) }));

/** Apple Pay / Google Pay on this phone (simulated wallet; the flag is stored on the card). */
export const setCardInWallet = (card: VirtualCard, inWallet: boolean) => changeCard(card, { inWallet }, () => api.patch<CardResource>(`cards/${card.id}`, { in_wallet: inWallet, version: version(card) }));

/** The full number and CVV, after the PIN. Never stored. */
export const revealCard = (cardId: string, pin: string) => api.post<{ number: string; cvv: string; expiry: string }>(`cards/${cardId}/reveal`, { pin });

// ─── Token Vault ────────────────────────────────────────────────────────

export async function setTokenLoaded(id: string, loaded: boolean) {
  const before = useVaultStore.getState().tokens.find((t) => t.id === id)?.loadedOn ?? null;
  useVaultStore.getState().markLoaded(id, loaded);
  try {
    await api.patch(`vault/tokens/${id}`, { loaded });
  } catch (error) {
    useVaultStore.setState((s) => ({ tokens: s.tokens.map((t) => (t.id === id ? { ...t, loadedOn: before } : t)) }));
    throw error;
  }
}

// ─── inbox ──────────────────────────────────────────────────────────────

export function markInboxRead(id: string) {
  useInboxStore.getState().markRead(id);
  api.post(`inbox/${id}/read`).catch(() => invalidate(resources.inbox.key));
}

export function markAllInboxRead() {
  useInboxStore.getState().markAllRead();
  api.post("inbox/all/read").catch(() => invalidate(resources.inbox.key));
}

// ─── recurring bills ────────────────────────────────────────────────────

/**
 * Change a schedule. Changing what gets paid (amount, wallet, frequency) or switching it back on
 * is new consent, so the API wants the PIN for those; pausing doesn't.
 */
export async function updateSchedule(s: Schedule, patch: { active?: boolean; amountNgn?: number; payWith?: AssetCode; frequency?: Frequency }, pin?: string) {
  const before = { ...s };
  useRecurringStore.getState().patch(s.id, patch);
  try {
    await api.patch(`recurring-bills/${s.id}`, {
      active: patch.active,
      amount_ngn: patch.amountNgn !== undefined ? amountString(patch.amountNgn, 2) : undefined,
      pay_with: patch.payWith,
      frequency: patch.frequency,
      version: s.version ?? 0,
      pin,
    });
  } catch (error) {
    useRecurringStore.getState().patch(s.id, before);
    throw error;
  } finally {
    invalidate(resources.recurring.key);
  }
}

/** Does this change need the PIN? (mirrors the API's rule) */
export const scheduleChangeNeedsPin = (patch: { active?: boolean; amountNgn?: number; payWith?: AssetCode; frequency?: Frequency }) =>
  patch.active === true || patch.amountNgn !== undefined || patch.payWith !== undefined || patch.frequency !== undefined;

export async function deleteSchedule(id: string) {
  const before = useRecurringStore.getState().schedules;
  useRecurringStore.getState().drop(id);
  try {
    await api.delete(`recurring-bills/${id}`);
  } catch (error) {
    useRecurringStore.getState().setSchedules(before);
    throw error;
  } finally {
    invalidate(resources.recurring.key);
  }
}

// ─── beneficiaries ──────────────────────────────────────────────────────

/** Save a recipient (the result card's "Save to beneficiaries"). Already saved counts as saved. */
export async function saveBeneficiary(draft: BeneficiaryDraft): Promise<Beneficiary | null> {
  try {
    const saved = toBeneficiary(
      await api.post<BeneficiaryResource>("beneficiaries", {
        kind: draft.kind,
        name: draft.name,
        handle: draft.handle,
        asset: draft.asset,
        channel_id: draft.channelId,
        network: draft.network,
        country: draft.country,
        details: draft.details,
      }),
    );
    useBeneficiariesStore.getState().upsert(saved);
    return saved;
  } catch (error) {
    if (error instanceof ApiError && error.code === "BENEFICIARY_EXISTS") return null;
    throw error;
  } finally {
    invalidate(resources.beneficiaries.key);
  }
}

export async function deleteBeneficiary(id: string) {
  const before = useBeneficiariesStore.getState().items;
  useBeneficiariesStore.getState().drop(id);
  try {
    await api.delete(`beneficiaries/${id}`);
  } catch (error) {
    useBeneficiariesStore.getState().setItems(before);
    throw error;
  } finally {
    invalidate(resources.beneficiaries.key);
  }
}

// ─── lookups ────────────────────────────────────────────────────────────

/** @tag → the person's name (send to a Tribe user). */
export const lookupTag = (tag: string, signal?: AbortSignal) => api.get<{ name: string; tag: string }>("recipients/lookup", { tag: tag.replace(/^@/, "") }, signal);

/** Meter / smartcard / phone → the customer's name. */
export const verifyBillCustomer = (billerId: string, target: string) => api.post<{ customer_name: string }>("bills/verify-customer", { biller_id: billerId, target }).then((r) => r.customer_name);

// ─── Cashpoints ─────────────────────────────────────────────────────────

/** Redeem a 12-digit code (no PIN: it adds money). The key survives a retry of the same code. */
export async function redeemCashpoint(code: string, idempotencyKey?: string) {
  const tx = toTransaction(await api.post<TransactionResource>("cashpoints/redeem", { code }, { idempotencyKey }));
  useWalletStore.getState().upsertTransaction(tx);
  refreshAfterMoney([resources.cashpoints.key]);
  return tx;
}

/** Cancel an unredeemed code: the naira comes back. */
export async function cancelCashpoint(cashpointId: string) {
  await api.post(`cashpoints/${cashpointId}/cancel`);
  refreshAfterMoney([resources.cashpoints.key]);
}

/** The cashpoint behind a transaction (its id is on the transaction's meta). */
export async function cashpointForTransaction(txId: string) {
  const list = await queryClient.fetchQuery({ queryKey: resources.cashpoints.key, queryFn: () => resources.cashpoints.fetch(), staleTime: 10_000 });
  return list.find((c) => c.txId === txId);
}

// ─── support & statements ───────────────────────────────────────────────

export async function openTicket(p: { txId: string; reason: IssueReason; subject: string; details: string }): Promise<SupportTicket> {
  const thread = await api.post<{ id: string; status: string; created_at: string }>("support/tickets", { subject: p.subject, body: p.details || p.subject, transaction_id: p.txId });
  const ticket: SupportTicket = { id: thread.id, txId: p.txId, reason: p.reason, details: p.details, createdAt: thread.created_at ?? new Date().toISOString(), status: thread.status === "resolved" ? "resolved" : "open" };
  useSupportStore.getState().add(ticket);
  invalidate(resources.inbox.key);
  return ticket;
}

/** Emailed by the worker; the API answers 202 straight away. */
export const requestStatement = (p: { asset?: AssetCode; from: string; to: string }) => api.post("statements", { asset: p.asset, from_date: p.from, to_date: p.to });

/** "Make this recurring?" after a bill: a schedule starting one period from today. */
export async function createScheduleFromOffer(offer: { billerId: string; target: string; planId?: string; amountNgn: number; payWith: AssetCode }, frequency: Frequency, pin?: string) {
  const start = nextDate(new Date(), frequency).toISOString().slice(0, 10);
  await api.post("recurring-bills", { biller_id: offer.billerId, target: offer.target, plan_id: offer.planId, amount_ngn: amountString(offer.amountNgn, 2), pay_with: offer.payWith, frequency, start_date: start, pin });
  invalidate(resources.recurring.key, resources.inbox.key);
}
