import type { ImageSourcePropType } from "react-native";

export type AssetCode = "USDT" | "BTC" | "ETH" | "USDC" | "SOL" | "NGN" | "USD" | "GBP" | "EUR" | "KES" | "GHS" | "CAD";

export type Network = { id: string; name: string; fee: number; eta: string };

/** One way money can arrive in a fiat account, with the details to share for it (demo values). */
export type Rail = { id: string; name: string; eta: string; fee: string; fields: { label: string; value: string }[] };

export type Asset = {
  code: AssetCode;
  name: string;
  kind: "crypto" | "fiat";
  /** Illustrative USD value of one unit — demo only, same as the landing page. */
  usd: number;
  change24h: number;
  decimals: number;
  symbol: string;
  glyph: string;
  /** fallback coin face while the logo loads */
  bg: string;
  fg: string;
  logo: ImageSourcePropType;
  networks?: Network[];
  account?: { label: string; fields: { label: string; value: string }[] };
};

export const ASSETS: Asset[] = [
  {
    code: "USDT", name: "Tether", kind: "crypto", usd: 1, change24h: 0.01, decimals: 2, symbol: "₮", glyph: "₮", bg: "#279442", fg: "#fff",
    logo: require("@/assets/logos/crypto/usdt.svg"),
    networks: [
      { id: "trc20", name: "Tron (TRC20)", fee: 1, eta: "~2 min" },
      { id: "bep20", name: "BNB Chain (BEP20)", fee: 0.3, eta: "~1 min" },
      { id: "erc20", name: "Ethereum (ERC20)", fee: 4.5, eta: "~5 min" },
    ],
  },
  {
    code: "BTC", name: "Bitcoin", kind: "crypto", usd: 98_400, change24h: 3.1, decimals: 6, symbol: "₿", glyph: "₿", bg: "#ff6220", fg: "#fff",
    logo: require("@/assets/logos/crypto/btc.svg"),
    networks: [
      { id: "btc", name: "Bitcoin", fee: 0.00002, eta: "~30 min" },
      { id: "lightning", name: "Lightning", fee: 0.0000001, eta: "Instant" },
    ],
  },
  {
    code: "ETH", name: "Ethereum", kind: "crypto", usd: 3_620, change24h: 1.8, decimals: 5, symbol: "Ξ", glyph: "Ξ", bg: "#4b097a", fg: "#f0e7f7",
    logo: require("@/assets/logos/crypto/eth.svg"),
    networks: [
      { id: "erc20", name: "Ethereum", fee: 0.0012, eta: "~5 min" },
      { id: "base", name: "Base", fee: 0.00002, eta: "~1 min" },
    ],
  },
  {
    code: "USDC", name: "USD Coin", kind: "crypto", usd: 1, change24h: 0, decimals: 2, symbol: "$", glyph: "◎", bg: "#0088e8", fg: "#fff",
    logo: require("@/assets/logos/crypto/usdc.svg"),
    networks: [
      { id: "sol", name: "Solana", fee: 0.1, eta: "~1 min" },
      { id: "base", name: "Base", fee: 0.1, eta: "~1 min" },
    ],
  },
  {
    code: "SOL", name: "Solana", kind: "crypto", usd: 182, change24h: -2.4, decimals: 4, symbol: "◎", glyph: "S", bg: "#201f1f", fg: "#ba90d9",
    logo: require("@/assets/logos/crypto/sol.svg"),
    networks: [{ id: "sol", name: "Solana", fee: 0.00005, eta: "Instant" }],
  },
  {
    code: "NGN", name: "Naira", kind: "fiat", usd: 1 / 1_540, change24h: -0.2, decimals: 2, symbol: "₦", glyph: "₦", bg: "#1f7434", fg: "#fff",
    logo: require("@/assets/flags/ng.png"),
    account: { label: "Your Naira account", fields: [{ label: "Account number", value: "8123 456 790" }, { label: "Bank", value: "Tribe MFB (Partner)" }, { label: "Account name", value: "Ada Okafor" }] },
  },
  {
    code: "USD", name: "US Dollar", kind: "fiat", usd: 1, change24h: 0, decimals: 2, symbol: "$", glyph: "$", bg: "#0095ff", fg: "#fff",
    logo: require("@/assets/flags/us.png"),
    account: { label: "Your USD account (ACH)", fields: [{ label: "Account number", value: "4400 1928 3374" }, { label: "Routing number", value: "021 000 021" }, { label: "Bank", value: "Partner Bank, N.A." }] },
  },
  {
    code: "GBP", name: "British Pound", kind: "fiat", usd: 1.31, change24h: 0.3, decimals: 2, symbol: "£", glyph: "£", bg: "#9b5dc7", fg: "#fff",
    logo: require("@/assets/flags/gb.png"),
    account: { label: "Your GBP account", fields: [{ label: "Account number", value: "4182 9937" }, { label: "Sort code", value: "04-00-75" }, { label: "Bank", value: "Partner Bank UK" }] },
  },
  {
    code: "EUR", name: "Euro", kind: "fiat", usd: 1.12, change24h: 0.2, decimals: 2, symbol: "€", glyph: "€", bg: "#006ab5", fg: "#fff",
    logo: require("@/assets/flags/eu.png"),
    account: { label: "Your EUR account (SEPA)", fields: [{ label: "IBAN", value: "DE89 3704 0044 0532 0130 00" }, { label: "BIC", value: "COBADEFFXXX" }] },
  },
  {
    code: "KES", name: "Kenyan Shilling", kind: "fiat", usd: 1 / 129, change24h: 0.1, decimals: 2, symbol: "KSh", glyph: "KSh", bg: "#ffda35", fg: "#201f1f",
    logo: require("@/assets/flags/ke.png"),
    account: { label: "M-Pesa paybill", fields: [{ label: "Paybill", value: "880 100" }, { label: "Account", value: "TRIBE-ADA21" }] },
  },
  {
    code: "GHS", name: "Ghana Cedi", kind: "fiat", usd: 1 / 15.4, change24h: -0.4, decimals: 2, symbol: "₵", glyph: "₵", bg: "#b54617", fg: "#fff",
    logo: require("@/assets/flags/gh.png"),
    account: { label: "Mobile money", fields: [{ label: "MoMo number", value: "024 555 0182" }, { label: "Name", value: "Tribe Wallet / Ada" }] },
  },
  {
    code: "CAD", name: "Canadian Dollar", kind: "fiat", usd: 0.73, change24h: 0.1, decimals: 2, symbol: "C$", glyph: "C$", bg: "#e81717", fg: "#fff",
    logo: require("@/assets/flags/ca.png"),
    account: { label: "Your CAD account (EFT)", fields: [{ label: "Account", value: "5521 8890" }, { label: "Institution", value: "621" }, { label: "Transit", value: "16001" }] },
  },
];

/** Same list, local money first (NGN, USD, GBP…) then crypto — the order for currency chips. */
export const ASSETS_FIAT_FIRST: Asset[] = [...ASSETS.filter((a) => a.kind === "fiat"), ...ASSETS.filter((a) => a.kind === "crypto")];

export const assetByCode = (code: string): Asset => ASSETS.find((a) => a.code === code) ?? ASSETS[0];

/** Demo crypto deposit addresses, keyed by asset + network. */
export const DEPOSIT_ADDRESSES: Record<string, string> = {
  "USDT:trc20": "TQ7ndYh8YwQw5mJ9Uk2Fk1vS3aNbr8XcVq",
  "USDT:bep20": "0x8f3C1a74b2E9F04dC1E7a5B6f2D9c3E1A4b7C2d9",
  "USDT:erc20": "0x8f3C1a74b2E9F04dC1E7a5B6f2D9c3E1A4b7C2d9",
  "BTC:btc": "bc1qtr1be7xk9m2w4u0yq8l5s6dz3g0hn4p2vfa8c",
  "BTC:lightning": "ada@tribe.africa",
  "ETH:erc20": "0x8f3C1a74b2E9F04dC1E7a5B6f2D9c3E1A4b7C2d9",
  "ETH:base": "0x8f3C1a74b2E9F04dC1E7a5B6f2D9c3E1A4b7C2d9",
  "USDC:sol": "7Tr1beQ4x9Z2kD8cWm5Lp3VnY6hJfR1sBuE0aGqK4tX",
  "USDC:base": "0x8f3C1a74b2E9F04dC1E7a5B6f2D9c3E1A4b7C2d9",
  "SOL:sol": "7Tr1beQ4x9Z2kD8cWm5Lp3VnY6hJfR1sBuE0aGqK4tX",
};

export const SWAP_FEE = 0.005;
export const NGN_PER_USD = 1_540;

const ADA = { label: "Account name", value: "Ada Okafor" };

/** Every way to get paid in each fiat currency. Illustrative partner-bank details, demo only. */
export const RAILS: Partial<Record<AssetCode, Rail[]>> = {
  NGN: [{ id: "nip", name: "Bank transfer (NIP)", eta: "Instant", fee: "Free", fields: [{ label: "Account number", value: "8123 456 790" }, { label: "Bank", value: "Tribe MFB (Partner)" }, ADA] }],
  USD: [
    { id: "ach", name: "ACH", eta: "1–2 working days", fee: "Free", fields: [{ label: "Account number", value: "4400 1928 3374" }, { label: "Routing number (ACH)", value: "021 000 021" }, { label: "Account type", value: "Checking" }, { label: "Bank", value: "Partner Bank, N.A." }, ADA] },
    { id: "wire", name: "Domestic wire", eta: "Same working day", fee: "Free", fields: [{ label: "Account number", value: "4400 1928 3374" }, { label: "Routing number (wire)", value: "026 009 593" }, { label: "Bank", value: "Partner Bank, N.A." }, { label: "Bank address", value: "100 Pine St, San Francisco, CA" }, ADA] },
    { id: "swift", name: "SWIFT", eta: "1–3 working days", fee: "Sender's bank fees", fields: [{ label: "SWIFT / BIC", value: "PBNAUS33" }, { label: "Account number", value: "4400 1928 3374" }, { label: "Bank", value: "Partner Bank, N.A." }, { label: "Bank address", value: "100 Pine St, San Francisco, CA" }, ADA] },
  ],
  GBP: [
    { id: "fps", name: "Faster Payments", eta: "Usually instant", fee: "Free", fields: [{ label: "Account number", value: "4182 9937" }, { label: "Sort code", value: "04-00-75" }, { label: "Bank", value: "Partner Bank UK" }, ADA] },
    { id: "bacs", name: "BACS", eta: "3 working days", fee: "Free", fields: [{ label: "Account number", value: "4182 9937" }, { label: "Sort code", value: "04-00-75" }, { label: "Bank", value: "Partner Bank UK" }, ADA] },
    { id: "swift", name: "SWIFT", eta: "1–3 working days", fee: "Sender's bank fees", fields: [{ label: "IBAN", value: "GB33 PBUK 0400 7541 8299 37" }, { label: "SWIFT / BIC", value: "PBUKGB2L" }, { label: "Bank", value: "Partner Bank UK" }, ADA] },
  ],
  EUR: [
    { id: "sepa", name: "SEPA", eta: "Within 1 working day", fee: "Free", fields: [{ label: "IBAN", value: "DE89 3704 0044 0532 0130 00" }, { label: "BIC", value: "COBADEFFXXX" }, ADA] },
    { id: "sepa-instant", name: "SEPA Instant", eta: "In seconds", fee: "Free", fields: [{ label: "IBAN", value: "DE89 3704 0044 0532 0130 00" }, { label: "BIC", value: "COBADEFFXXX" }, ADA] },
    { id: "swift", name: "SWIFT", eta: "1–3 working days", fee: "Sender's bank fees", fields: [{ label: "IBAN", value: "DE89 3704 0044 0532 0130 00" }, { label: "SWIFT / BIC", value: "COBADEFFXXX" }, { label: "Bank", value: "Partner Bank Europe" }, ADA] },
  ],
  CAD: [
    { id: "eft", name: "EFT", eta: "1–2 working days", fee: "Free", fields: [{ label: "Account", value: "5521 8890" }, { label: "Institution", value: "621" }, { label: "Transit", value: "16001" }, ADA] },
    { id: "interac", name: "Interac e-Transfer", eta: "Within 30 minutes", fee: "Free", fields: [{ label: "Interac email", value: "ada@tribe.africa" }, ADA] },
    { id: "wire", name: "Wire", eta: "1 working day", fee: "Sender's bank fees", fields: [{ label: "Account", value: "5521 8890" }, { label: "Institution", value: "621" }, { label: "Transit", value: "16001" }, { label: "SWIFT / BIC", value: "PBNACATT" }, ADA] },
  ],
  KES: [
    { id: "mpesa", name: "M-Pesa Paybill", eta: "Instant", fee: "Free", fields: [{ label: "Paybill", value: "880 100" }, { label: "Account", value: "TRIBE-ADA21" }] },
    { id: "bank", name: "Bank transfer", eta: "1 working day", fee: "Free", fields: [{ label: "Account number", value: "0110 2283 1100" }, { label: "Bank", value: "Partner Bank Kenya" }, { label: "Branch", value: "Nairobi CBD" }, ADA] },
  ],
  GHS: [
    { id: "momo", name: "Mobile money", eta: "Instant", fee: "Free", fields: [{ label: "MoMo number", value: "024 555 0182" }, { label: "Name", value: "Tribe Wallet / Ada" }] },
    { id: "bank", name: "Bank transfer", eta: "1 working day", fee: "Free", fields: [{ label: "Account number", value: "1401 0039 8812" }, { label: "Bank", value: "Partner Bank Ghana" }, { label: "Branch", value: "Accra" }, ADA] },
  ],
};

/** The rails a currency can receive on; falls back to its single account. */
export function railsFor(a: Asset): Rail[] {
  if (RAILS[a.code]) return RAILS[a.code]!;
  return a.account ? [{ id: "main", name: a.account.label.replace(/^Your /, ""), eta: "Within minutes", fee: "Free", fields: a.account.fields }] : [];
}
