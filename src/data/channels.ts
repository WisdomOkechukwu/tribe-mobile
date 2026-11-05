import type { AssetCode } from "./assets";

/**
 * How money leaves Tribe for someone outside it (Send - Global currencies.png "Select channel").
 * Each channel lists the payment details it needs; the recipient form is built from this.
 * Fees are illustrative and quoted in USD, converted to whatever you pay with.
 */
export type FieldSpec = {
  key: string;
  label: string;
  kind?: "text" | "digits" | "select" | "email" | "phone" | "code";
  options?: string[];
  /** exact digits (digits) or [min, max] characters */
  length?: number;
  range?: [number, number];
  /** sort codes show as 12-34-56 */
  format?: "sortcode";
  optional?: boolean;
  placeholder?: string;
};

export type Channel = {
  id: string;
  name: string;
  /** one line under the name in the picker */
  blurb: string;
  eta: string;
  feeUsd: number;
  currencies: AssetCode[];
  fields: FieldSpec[];
};

const NAME: FieldSpec = { key: "name", label: "Account holder's full name", placeholder: "Account holder's full name" };
const ADDRESS: FieldSpec = { key: "address", label: "Account holder's address", placeholder: "Account holder's address" };
const PURPOSE: FieldSpec = { key: "purpose", label: "Payment purpose", kind: "select", options: ["Family support", "Gift", "Rent", "School fees", "Business payment", "Salary", "Savings", "Other"], placeholder: "Payment purpose" };

export const FPS_FIELDS: FieldSpec[] = [
  { key: "accountType", label: "Account type", kind: "select", options: ["Personal", "Corporate"], placeholder: "Account type" },
  NAME,
  { key: "account", label: "Account number", kind: "digits", length: 8, placeholder: "8-digit account number" },
  { key: "sortCode", label: "Sort code", kind: "digits", length: 6, format: "sortcode", placeholder: "Sort code (12-34-56)" },
  { key: "reference", label: "Reference", optional: true, placeholder: "Reference (optional)" },
];
const SEPA_FIELDS: FieldSpec[] = [NAME, { key: "iban", label: "IBAN", kind: "code", range: [15, 34], placeholder: "IBAN" }, { key: "bic", label: "BIC / SWIFT", kind: "code", range: [8, 11], optional: true, placeholder: "BIC (optional)" }, { key: "reference", label: "Reference", optional: true, placeholder: "Reference (optional)" }];

export const NG_BANKS = ["GTBank", "Access Bank", "Kuda", "Opay", "Zenith Bank", "UBA", "Moniepoint", "First Bank", "Wema Bank"];

export const CHANNELS: Channel[] = [
  {
    id: "ngn-bank",
    name: "Bank transfer (NIP)",
    blurb: "Any Nigerian bank or fintech account",
    eta: "Within minutes",
    feeUsd: 25 / 1540,
    currencies: ["NGN"],
    fields: [
      { key: "bank", label: "Bank", kind: "select", options: NG_BANKS, placeholder: "Select bank" },
      { key: "account", label: "Account number", kind: "digits", length: 10, placeholder: "10-digit account number" },
    ],
  },
  {
    id: "ach",
    name: "ACH",
    blurb: "US bank accounts · lowest fee",
    eta: "1–2 working days",
    feeUsd: 1,
    currencies: ["USD"],
    fields: [NAME, { key: "account", label: "Account number", kind: "digits", range: [6, 17], placeholder: "Account number" }, { key: "routing", label: "Routing number", kind: "digits", length: 9, placeholder: "Routing number" }, { key: "accountType", label: "Account type", kind: "select", options: ["Checking", "Savings"], placeholder: "Account type" }, ADDRESS, PURPOSE],
  },
  {
    id: "fedwire",
    name: "Fedwire",
    blurb: "US bank accounts · wire",
    eta: "Same working day",
    feeUsd: 8,
    currencies: ["USD"],
    fields: [NAME, { key: "account", label: "Account number", kind: "digits", range: [6, 17], placeholder: "Account number" }, { key: "routing", label: "Routing number", kind: "digits", length: 9, placeholder: "Routing number" }, ADDRESS, PURPOSE],
  },
  {
    id: "card",
    name: "Card payout",
    blurb: "Straight to a tokenized debit card",
    eta: "Within 30 minutes",
    feeUsd: 2,
    currencies: ["USD"],
    fields: [NAME, { key: "token", label: "Card token", kind: "code", range: [12, 64], placeholder: "Card token (tok_…)" }],
  },
  {
    id: "fps",
    name: "Faster Payments",
    blurb: "UK bank accounts",
    eta: "Usually instant",
    feeUsd: 0.5,
    currencies: ["GBP"],
    fields: FPS_FIELDS,
  },
  {
    id: "bacs",
    name: "BACS",
    blurb: "UK bank accounts · lowest fee",
    eta: "3 working days",
    feeUsd: 0.2,
    currencies: ["GBP"],
    fields: FPS_FIELDS,
  },
  {
    id: "sepa",
    name: "SEPA",
    blurb: "Euro accounts in 36 countries",
    eta: "Within 1 working day",
    feeUsd: 0.5,
    currencies: ["EUR"],
    fields: SEPA_FIELDS,
  },
  {
    id: "sepa-instant",
    name: "SEPA Instant",
    blurb: "Euro accounts · lands in seconds",
    eta: "In seconds",
    feeUsd: 1,
    currencies: ["EUR"],
    fields: SEPA_FIELDS,
  },
  {
    id: "swift",
    name: "SWIFT / Wire",
    blurb: "Banks worldwide",
    eta: "1–3 working days",
    feeUsd: 15,
    currencies: ["USD", "GBP", "EUR", "CAD"],
    fields: [NAME, { key: "iban", label: "IBAN or account number", kind: "code", range: [6, 34], placeholder: "IBAN or account number" }, { key: "bic", label: "SWIFT / BIC", kind: "code", range: [8, 11], placeholder: "SWIFT / BIC code" }, { key: "bank", label: "Bank name", placeholder: "Bank name" }, ADDRESS, PURPOSE],
  },
  {
    id: "interac",
    name: "Interac e-Transfer",
    blurb: "Canadian email or mobile transfers",
    eta: "Within 30 minutes",
    feeUsd: 1,
    currencies: ["CAD"],
    fields: [NAME, { key: "email", label: "Email or mobile", kind: "email", placeholder: "Recipient's email" }],
  },
  {
    id: "eft",
    name: "EFT",
    blurb: "Canadian bank accounts",
    eta: "1–2 working days",
    feeUsd: 1,
    currencies: ["CAD"],
    fields: [NAME, { key: "institution", label: "Institution number", kind: "digits", length: 3, placeholder: "Institution number (3 digits)" }, { key: "transit", label: "Transit number", kind: "digits", length: 5, placeholder: "Transit number (5 digits)" }, { key: "account", label: "Account number", kind: "digits", range: [7, 12], placeholder: "Account number" }],
  },
  {
    id: "momo",
    name: "Mobile money",
    blurb: "M-Pesa, MTN MoMo, Airtel Money and more",
    eta: "Usually instant",
    feeUsd: 0.4,
    currencies: ["KES", "GHS"],
    fields: [NAME, { key: "network", label: "Network", kind: "select", options: ["M-Pesa", "MTN MoMo", "Airtel Money", "Telecel Cash"], placeholder: "Network" }, { key: "phone", label: "Phone number", kind: "digits", length: 9, placeholder: "Phone number (without 0)" }],
  },
];

export const channelsFor = (code: AssetCode) => CHANNELS.filter((ch) => ch.currencies.includes(code));
export const channelById = (id?: string) => CHANNELS.find((ch) => ch.id === id);

/** Is one field's value complete? */
export function fieldOk(f: FieldSpec, raw = "") {
  const v = raw.trim();
  if (!v) return !!f.optional;
  if (f.kind === "digits") {
    const d = v.replace(/\D/g, "");
    return f.length ? d.length === f.length : f.range ? d.length >= f.range[0] && d.length <= f.range[1] : d.length > 0;
  }
  if (f.kind === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || /^\+?\d{10,13}$/.test(v.replace(/\s/g, ""));
  if (f.range) return v.replace(/\s/g, "").length >= f.range[0] && v.replace(/\s/g, "").length <= f.range[1];
  return v.length >= 2;
}

/** "•• 4321" style handle from the details, for lists and receipts. */
export function maskedHandle(ch: Channel, d: Record<string, string>) {
  const tail = (s = "") => `•• ${s.replace(/\s/g, "").slice(-4)}`;
  if (ch.id === "ngn-bank") return `${d.bank} ${tail(d.account)}`;
  if (ch.id === "fps") return `Sort ${(d.sortCode ?? "").replace(/(\d{2})(?=\d)/g, "$1-")} ${tail(d.account)}`;
  if (ch.id === "sepa" || ch.id === "swift") return `IBAN ${tail(d.iban)}`;
  if (ch.id === "interac") return d.email ?? "";
  if (ch.id === "momo") return `${d.network} ${tail(d.phone)}`;
  if (ch.id === "card") return `Card ${tail(d.token)}`;
  if (ch.id === "eft") return `Transit ${d.transit} ${tail(d.account)}`;
  return `${ch.name} ${tail(d.account)}`;
}
