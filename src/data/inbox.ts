import type { IconName } from "@/components/icon";
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
  /** the transaction it's about: the icon then matches History (coin pair, biller, card…) */
  txId?: string;
  /** several currencies at once, e.g. global accounts opening */
  assets?: AssetCode[];
  /** a bill it's about (recurring set-up) */
  billerId?: string;
  /** what happened, as a small corner badge: plus (opened), repeat (scheduled), check… */
  badge?: IconName;
  /** overrides the kind's icon when there's nothing more specific (laptop for a sign-in…) */
  icon?: IconName;
};

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export function seedInbox(): InboxItem[] {
  return [
    { id: "n1", kind: "swap", title: "Swap complete", body: "250 USDT → ₦383,075.00 is in your Naira balance.", date: ago(18), read: false, href: "/transaction/t1", asset: "NGN" },
    { id: "n2", kind: "vault", title: "Token saved to your Vault", body: "PHED Prepaid · 34.2 kWh. Load it, then tap “I've loaded it”.", date: ago(95), read: false, href: "/pay/vault", txId: "t2" },
    { id: "n3", kind: "money", title: "You received $450.00", body: "Upwork Inc. paid into your USD account.", date: ago(240), read: false, href: "/transaction/t3", asset: "USD" },
    { id: "n4", kind: "cashpoint", title: "Your Cashpoint was redeemed", body: "@tolu redeemed the ₦5,000 code you shared.", date: ago(60 * 9), read: true, href: "/transaction/t4" },
    { id: "n5", kind: "referral", title: "+₦775 referral earnings", body: "Your friends made 31 transactions this week.", date: ago(60 * 72), read: true, href: "/me/invite" },
    { id: "n6", kind: "security", title: "New sign-in on Chrome on Mac", body: "Lagos, NG. Not you? Log it out in Devices.", date: ago(60 * 48), read: true, href: "/me/devices", icon: "laptop" },
    { id: "n7", kind: "card", title: "Netflix charged your card", body: "$15.49 on virtual card •• 4821.", date: ago(60 * 30), read: true, href: "/transaction/t6" },
    { id: "n8", kind: "money", title: "You sent ₦20,000.00", body: "To Chiamaka Eze (GTBank •• 4410) · Bank transfer", date: ago(60 * 52), read: true, href: "/transaction/t9" },
    { id: "n9", kind: "money", title: "Steam gift card ready", body: "$50 Steam card · your code is in the receipt.", date: ago(60 * 50), read: true, href: "/transaction/t8" },
    { id: "n10", kind: "money", title: "Recurring bill set up", body: "DStv · ₦15,700 monthly", date: ago(60 * 24 * 6), read: true, href: "/pay/recurring", billerId: "dstv", badge: "repeat" },
  ];
}
