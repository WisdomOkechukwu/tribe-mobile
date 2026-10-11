import type { AssetCode } from "./assets";

/** Notification kinds drive the leading icon and which preference switch silences them. */
export type InboxKind = "money" | "swap" | "security" | "cashpoint" | "referral" | "vault" | "card" | "promo" | "support";

export type InboxItem = {
  id: string;
  kind: InboxKind;
  title: string;
  body: string;
  date: string;
  read: boolean;
  /** route opened on tap */
  href?: string;
  asset?: AssetCode;
};

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export function seedInbox(): InboxItem[] {
  return [
    { id: "n1", kind: "swap", title: "Swap complete", body: "250 USDT → ₦383,075.00 is in your Naira balance.", date: ago(18), read: false, href: "/transaction/t1", asset: "NGN" },
    { id: "n2", kind: "vault", title: "Token saved to your Vault", body: "PHED Prepaid · 34.2 kWh. Load it, then tap “I've loaded it”.", date: ago(95), read: false, href: "/pay/vault" },
    { id: "n3", kind: "money", title: "You received $450.00", body: "Upwork Inc. paid into your USD account.", date: ago(240), read: false, href: "/transaction/t3", asset: "USD" },
    { id: "n4", kind: "cashpoint", title: "Your Cashpoint was redeemed", body: "@tolu redeemed the ₦5,000 code you shared.", date: ago(60 * 9), read: true, href: "/transaction/t4" },
    { id: "n5", kind: "referral", title: "+₦775 referral earnings", body: "Your friends made 31 transactions this week.", date: ago(60 * 72), read: true, href: "/me/invite" },
    { id: "n6", kind: "security", title: "New sign-in on Chrome on Mac", body: "Lagos, NG. Not you? Log it out in Devices.", date: ago(60 * 48), read: true, href: "/me/devices" },
    { id: "n7", kind: "card", title: "Netflix charged your card", body: "$15.49 on virtual card •• 4821.", date: ago(60 * 30), read: true, href: "/transaction/t6" },
  ];
}
