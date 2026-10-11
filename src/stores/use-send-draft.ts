import { create } from "zustand";
import type { AssetCode } from "@/data/assets";

export type SendScope = "local" | "global" | "crypto";

/** Who the money goes to, once the recipient step is done. */
export type Recipient = {
  kind: "tribe" | "bank" | "wallet";
  name: string;
  /** @tag, email, masked account or short address */
  handle: string;
  channelId?: string;
  network?: string;
  details?: Record<string, string>;
  beneficiaryId?: string;
};

/**
 * The send in progress, shared by /send's steps (what currency → who → how much). Not
 * persisted; the recipient step resets it when the currency changes.
 */
type SendDraft = {
  scope: SendScope;
  /** what the recipient receives */
  asset: AssetCode;
  country?: string;
  recipient: Recipient | null;
  /** wallet address being typed (lives here so the QR scanner can fill it) */
  address: string;
  setAddress: (a: string) => void;
  start: (p: { scope: SendScope; asset: AssetCode; country?: string }) => void;
  setRecipient: (r: Recipient | null) => void;
};

export const useSendDraft = create<SendDraft>()((set) => ({
  scope: "local",
  asset: "NGN",
  recipient: null,
  address: "",
  setAddress: (address) => set({ address }),
  start: ({ scope, asset, country }) => set({ scope, asset, country, recipient: null, address: "" }),
  setRecipient: (recipient) => set({ recipient }),
}));
