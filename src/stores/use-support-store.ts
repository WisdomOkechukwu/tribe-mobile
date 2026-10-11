import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TxType } from "@/data/seed";
import { persistStorage } from "./storage";

export type IssueReason = "not-received" | "not-delivered" | "wrong-amount" | "charged-twice" | "code" | "not-me" | "other";

export const ISSUE_REASON: Record<IssueReason, { label: string; sub: string }> = {
  "not-received": { label: "The money didn't arrive", sub: "It left, but the other side doesn't have it" },
  "not-delivered": { label: "I didn't get what I paid for", sub: "No token, data, airtime or subscription" },
  "wrong-amount": { label: "Wrong amount or rate", sub: "The numbers don't match what you expected" },
  "charged-twice": { label: "I was charged twice", sub: "The same payment went through more than once" },
  code: { label: "The code doesn't work", sub: "It was rejected or already used" },
  "not-me": { label: "I don't recognise this", sub: "We'll secure your account first" },
  other: { label: "Something else", sub: "Tell us in your own words" },
};

/** The reasons that make sense for each kind of transaction, most likely first. */
export function reasonsFor(type: TxType): IssueReason[] {
  switch (type) {
    case "send":
      return ["not-received", "wrong-amount", "charged-twice", "not-me", "other"];
    case "receive":
      return ["wrong-amount", "not-me", "other"];
    case "swap":
      return ["wrong-amount", "not-received", "charged-twice", "not-me", "other"];
    case "bill":
      return ["not-delivered", "wrong-amount", "charged-twice", "not-me", "other"];
    case "giftcard":
      return ["code", "not-received", "wrong-amount", "not-me", "other"];
    case "card":
      return ["charged-twice", "wrong-amount", "not-me", "other"];
    case "cashpoint":
      return ["code", "wrong-amount", "not-me", "other"];
    case "referral":
      return ["not-received", "wrong-amount", "not-me", "other"];
  }
}

export type SupportTicket = { id: string; txId: string; reason: IssueReason; details: string; createdAt: string; status: "open" | "resolved" };

type SupportState = {
  tickets: SupportTicket[];
  open: (p: Pick<SupportTicket, "txId" | "reason" | "details">) => SupportTicket;
  reset: () => void;
};

export const useSupportStore = create<SupportState>()(
  persist(
    (set, get) => ({
      tickets: [],
      open: (p) => {
        const ticket: SupportTicket = { ...p, id: `SUP-${Date.now().toString().slice(-6)}`, createdAt: new Date().toISOString(), status: "open" };
        set({ tickets: [ticket, ...get().tickets] });
        return ticket;
      },
      reset: () => set({ tickets: [] }),
    }),
    { name: "tribe:support", storage: persistStorage, version: 1 },
  ),
);
