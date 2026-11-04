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
  /** a verification decision: which tier, and whether it was approved (else it needs attention) */
  tier?: { level: number; approved: boolean };
};
