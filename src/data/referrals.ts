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

export type InviteStatus = "earning" | "joined" | "invited";
export type Invitee = { id: string; name: string; tag: string; status: InviteStatus; when: string; transactions: number };

const daysAgo = (d: number) => new Date(Date.now() - d * 864e5).toISOString();

export const INVITEES: Invitee[] = [
  { id: "i1", name: "Tolulope A.", tag: "tolu", status: "earning", when: daysAgo(64), transactions: 142 },
  { id: "i2", name: "Chiamaka E.", tag: "chiamaka", status: "earning", when: daysAgo(41), transactions: 88 },
  { id: "i3", name: "Kwame O.", tag: "kwame", status: "earning", when: daysAgo(15), transactions: 37 },
  { id: "i4", name: "Zainab M.", tag: "zainab_m", status: "joined", when: daysAgo(1), transactions: 0 },
  { id: "i5", name: "Seun", tag: "", status: "invited", when: daysAgo(0), transactions: 0 },
];

export const earnedFrom = (i: Invitee) => i.transactions * REFERRAL.perTransactionNgn;
export const totalEarned = () => INVITEES.reduce((s, i) => s + earnedFrom(i), 0);
/** demo: what friends' activity earned you this month */
export const earnedThisMonth = () => Math.round(totalEarned() * 0.19);

export const referralCode = (tag: string) => `${tag.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "TRIBE"}-${(tag.length * 7919 + 2026).toString(36).toUpperCase().slice(-3)}`;
