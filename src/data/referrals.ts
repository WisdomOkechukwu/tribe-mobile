// Referral programme (Me → Invite friends): you earn FOR LIFE — a share of what Tribe earns every
// time someone you invited makes a transaction. No cap, no expiry. The share is set by Tribe's
// admins and sent by GET /referrals (share_percent); it is never fixed in the app.
export const REFERRAL = {
  /** earnings collect in a referral balance you can withdraw into any currency */
  payout: "into your referral balance, ready to withdraw into any currency",
  /** smallest withdrawal (illustrative) */
  minWithdrawNgn: 1_000,
};
