import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssetCode } from "@/data/assets";
import { INVITEES, REFERRAL, totalEarned } from "@/data/referrals";
import { persistStorage } from "./storage";

/** One ₦25 reward: a friend made a transaction. */
export type Earning = { id: string; friend: string; what: string; amount: number; date: string };
/** Money moved out of the referral balance into a wallet. */
export type Withdrawal = { id: string; amountNgn: number; to: AssetCode; received: number; txId: string; date: string };

const WHAT = ["paid a bill", "swapped crypto", "sent money", "bought a gift card", "topped up a card", "made a Cashpoint", "bought airtime"];

/** Recent rewards for the Earnings list, generated from the invitees' activity (demo). */
function seedEarnings(): Earning[] {
  const earners = INVITEES.filter((i) => i.status === "earning");
  return Array.from({ length: 24 }, (_, n) => {
    const f = earners[n % earners.length];
    return { id: `e${n}`, friend: f.name, what: WHAT[(n * 3 + f.transactions) % WHAT.length], amount: REFERRAL.perTransactionNgn, date: new Date(Date.now() - (n * 7 + 3) * 3_600_000).toISOString() };
  });
}

const SEED_WITHDRAWN = 3_000;
const SEED_WITHDRAWALS: Withdrawal[] = [{ id: "w1", amountNgn: SEED_WITHDRAWN, to: "NGN", received: SEED_WITHDRAWN, txId: "t22", date: new Date(Date.now() - 12 * 864e5).toISOString() }];

type ReferralState = {
  /** ₦ ready to withdraw */
  balance: number;
  earnings: Earning[];
  withdrawals: Withdrawal[];
  withdraw: (w: Omit<Withdrawal, "id" | "date">) => void;
  reset: () => void;
};

const initial = () => ({ balance: totalEarned() - SEED_WITHDRAWN, earnings: seedEarnings(), withdrawals: SEED_WITHDRAWALS });

/** Referral earnings (Me › Invite friends): balance, the ₦25 rewards, and withdrawals. */
export const useReferralStore = create<ReferralState>()(
  persist(
    (set, get) => ({
      ...initial(),
      withdraw: (w) => {
        if (w.amountNgn > get().balance + 1e-9) throw new Error("That's more than your referral balance.");
        set((s) => ({ balance: s.balance - w.amountNgn, withdrawals: [{ ...w, id: `w${Date.now().toString(36)}`, date: new Date().toISOString() }, ...s.withdrawals] }));
      },
      reset: () => set(initial()),
    }),
    { name: "tribe:referrals", storage: persistStorage, version: 1 },
  ),
);
