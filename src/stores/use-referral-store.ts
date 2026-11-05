import { create } from "zustand";
import type { AssetCode } from "@/data/assets";

/** One reward: a friend made a transaction. */
export type Earning = { id: string; friend: string; what: string; amount: number; date: string };
/** Money moved out of the referral balance into a wallet. */
export type Withdrawal = { id: string; amountNgn: number; to: AssetCode; received: number; txId: string; date: string };

type ReferralState = {
  /** ₦ ready to withdraw (display) */
  balance: number;
  /** the same, exactly as the API sent it (for "more than your balance" checks) */
  balanceRaw: string;
  code: string | null;
  invited: number;
  earnings: Earning[];
  withdrawals: Withdrawal[];
  setReferrals: (r: { balance: number; balanceRaw: string; code: string; invited: number; earnings: Earning[]; withdrawals: Withdrawal[] }) => void;
  reset: () => void;
};

const initial = { balance: 0, balanceRaw: "0.00", code: null as string | null, invited: 0, earnings: [] as Earning[], withdrawals: [] as Withdrawal[] };

/** Referral earnings (Me › Invite friends), as last loaded from GET /referrals. Memory only: the balance is never kept on the device. */
export const useReferralStore = create<ReferralState>()((set) => ({
  ...initial,
  setReferrals: (r) => set(r),
  reset: () => set(initial),
}));
