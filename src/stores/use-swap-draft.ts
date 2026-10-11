import { create } from "zustand";
import type { AssetCode } from "@/data/assets";

/**
 * The swap pair, shared between /swap and its picker sheet (/swap/pick). Not persisted —
 * opening /swap?from=X resets it.
 */
type SwapDraft = {
  from: AssetCode;
  to: AssetCode;
  start: (from?: AssetCode) => void;
  pick: (side: "from" | "to", code: AssetCode) => void;
  flip: () => void;
};

export const useSwapDraft = create<SwapDraft>()((set, get) => ({
  from: "USDT",
  to: "NGN",
  start: (from = "USDT") => set({ from, to: from === "NGN" ? "USDT" : "NGN" }),
  pick: (side, code) => {
    const { from, to } = get();
    const other = side === "from" ? to : from;
    // picking the other side's asset just flips the pair
    if (code === other) set({ from: to, to: from });
    else set(side === "from" ? { from: code } : { to: code });
  },
  flip: () => set((s) => ({ from: s.to, to: s.from })),
}));
