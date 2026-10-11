import type { WorldId } from "@/stores/use-signup-store";

/** What the post-signup checklist can ask for. Phone is always required. */
export type Need = "phone" | "identity" | "profile";

/**
 * SBU.png's "Tribe worlds", mapped onto flows the app really has: each world asks only for what
 * that feature needs, and Home opens it once setup is done.
 */
export const WORLDS: Record<WorldId, { title: string; needs: Need[]; landing: string | null; note?: string }> = {
  global: { title: "Global payments", needs: ["phone", "identity", "profile"], landing: null, note: "USD, GBP and EUR accounts are issued within hours of your request being approved." },
  crypto: { title: "Crypto", needs: ["phone"], landing: "/receive/USDT", note: "Your crypto wallets are ready as soon as you finish." },
  card: { title: "Virtual card", needs: ["phone", "identity"], landing: "/card-new", note: "Dollar cards need a verified identity. It takes about a minute." },
  bills: { title: "Bills", needs: ["phone"], landing: "/pay", note: "Pay airtime, data, TV and light right after this." },
};

export const BASE_NEEDS: Need[] = ["phone"];
