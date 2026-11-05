// Referral programme (Me → Invite friends): you earn FOR LIFE — a reward every time someone you
// invited makes a transaction. No cap, no expiry. TODO(content): confirm the real rate before launch.
export const REFERRAL = {
  /** paid to the inviter, per transaction their friend makes (illustrative) */
  perTransactionNgn: 25,
  /** earnings collect in a referral balance you can withdraw into any currency */
  payout: "into your referral balance, ready to withdraw into any currency",
  /** smallest withdrawal (illustrative) */
  minWithdrawNgn: 1_000,
};
