import type { WorldId } from "@/stores/use-signup-store";

/**
 * SBU.png's "Tribe worlds", mapped onto flows the app really has: Home opens the world's landing
 * once after sign-up; Global payments also adds the USD/GBP/EUR questions to Finish setup.
 */
export const WORLDS: Record<WorldId, { title: string; landing: string | null; note?: string }> = {
  global: { title: "Global payments", landing: null, note: "USD, GBP and EUR accounts are issued within hours of your request being approved." },
  crypto: { title: "Crypto", landing: "/receive/USDT", note: "Your crypto wallets are ready as soon as you finish." },
  card: { title: "Virtual card", landing: "/card-new", note: "Dollar cards need a verified identity. It takes about a minute." },
  bills: { title: "Bills", landing: "/pay", note: "Pay airtime, data, TV and light right after this." },
};
