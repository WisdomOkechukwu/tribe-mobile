/**
 * What the Tribe API sends (`/api/mobile/v1`). Money is always a decimal STRING.
 * `mappers.ts` turns these into the app's own types.
 */
export type TransactionResource = {
  id: string;
  reference: string;
  /** detailed backend type, e.g. card_fund */
  kind: string;
  /** the app's type: receive|send|swap|bill|giftcard|card|cashpoint|referral */
  type: string;
  category: string;
  direction: "in" | "out";
  status: string;
  title: string;
  subtitle: string;
  asset: string;
  amount: string;
  to_asset: string | null;
  to_amount: string | null;
  fee_asset: string | null;
  fee: string;
  usd_value: string;
  failure_reason: string | null;
  meta: Record<string, unknown> | null;
  date: string;
  completed_at: string | null;
};

export type SwapLegResource = { step: number; from_asset: string; to_asset: string; from_amount: string; to_amount: string; rate: string; via_ngn_rail: boolean };

export type QuoteResource = {
  id: string;
  from_asset: string;
  to_asset: string;
  /** total paid, fee included */
  from_amount: string;
  fee: string;
  to_amount: string;
  rate: string;
  uses_ngn_rail: boolean;
  route: SwapLegResource[];
  expires_at: string;
};

export type WalletsResource = {
  balances: Record<string, string>;
  opened: string[];
  wallets: { asset_code: string; balance: string; balance_units: string; decimal_places: number; account_number?: string }[];
  referral_balance: string;
};

export type AssetResource = { code: string; name: string; kind: "fiat" | "crypto"; symbol: string; decimal_places: number };

export type RateEntry = { usd: string; ngn: string; change_today_percent: string };
export type RatesEvent = { version: number; collected_at: string; is_stale: boolean; rates: Record<string, RateEntry> };

export type CardResource = {
  id: string;
  label: string;
  network: "visa" | "mastercard";
  design_finish: string;
  design_settings: Record<string, string>;
  holder_name: string;
  currency: string;
  last_four: string;
  expiry: string;
  balance: string;
  frozen: boolean;
  online_payments_enabled: boolean;
  monthly_limit: string;
  billing_address: { street?: string; city?: string; state?: string; postal?: string };
  in_wallet: boolean;
  created_at: string;
  version: number;
};

export type CardDesignResource = { id: string; kind: "theme" | "swatch" | "pattern"; name: string; finish: string; hex_color: string | null; pattern: string | null; enabled: boolean; sort_order: number; version: number };
export type CardDesignsResource = { themes: CardDesignResource[]; swatches: CardDesignResource[]; patterns: CardDesignResource[] };

export type VaultTokenResource = { id: string; provider: string; meter: string; amount: string; kwh: number | string; token: string; paid_with: string | null; loaded_on: string | null; bought: string };

export type InboxResource = { id: string; kind: string; title: string; body: string; href: string | null; data: Record<string, unknown> | null; read_at: string | null; created_at: string };

export type RecurringResource = {
  id: string;
  biller_id: string;
  target: string;
  plan_id: string | null;
  amount_ngn: string;
  pay_with_asset: string;
  frequency: "weekly" | "biweekly" | "monthly";
  next_run_at: string;
  active: boolean;
  last_paid_at: string | null;
  last_result: string | null;
  version: number;
  created_at: string;
};

export type ReferralsResource = {
  code: string;
  balance: string;
  earnings: { id: string; friend: string; what: string; amount: string; date: string }[];
  withdrawals: { id: string; amount_ngn: string; to: string; tx_id: string; date: string }[];
  invited: number;
};

export type BeneficiaryResource = {
  id: string;
  kind: "tribe" | "bank" | "wallet";
  name: string;
  handle: string;
  asset_code: string;
  channel_id: string | null;
  network: string | null;
  country: string | null;
  details: Record<string, string> | null;
  created_at: string;
};

export type DeviceResource = { id: string; name: string; platform: string; model: string; status: string; is_current: boolean; last_seen_at: string | null; created_at: string };

export type BillerPlanResource = { id: string; name: string; price: number | string; period?: "daily" | "weekly" | "monthly" };
export type BillerResource = { id: string; name: string; category: "airtime" | "data" | "tv" | "electricity"; field: "phone" | "smartcard" | "meter"; plans: BillerPlanResource[] | null; background: string; foreground: string; enabled: boolean; sort_order: number };

export type GiftBrandResource = { id: string; name: string; sell_rate_ngn: string; buy_markup_percent: string; minimum_usd: number; maximum_usd: number; background: string; foreground: string; enabled: boolean; sort_order: number };

export type ChannelResource = { id: string; name: string; eta: string; fee_usd: string; currencies: string[] };

export type CashpointResource = { id: string; code: string; amount: string; status: string; transaction_id: string; created_at: string; redeemed_at: string | null };

export type ReceiveResource = { asset_code: string; kind: "fiat" | "crypto"; fields?: { label: string; value: string }[]; address?: string; simulated?: boolean };
