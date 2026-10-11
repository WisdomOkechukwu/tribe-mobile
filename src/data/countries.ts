import type { AssetCode } from "./assets";

/**
 * Countries Tribe works with. `flag` is the asset code whose PNG flag CoinIcon draws (we ship
 * flags per currency, so euro countries share the EU flag). Phone digits exclude the leading 0.
 */
export type Country = { iso: string; name: string; dial: string; digits: number; currency: AssetCode; flag: AssetCode };

export const COUNTRIES: Country[] = [
  { iso: "NG", name: "Nigeria", dial: "+234", digits: 10, currency: "NGN", flag: "NGN" },
  { iso: "GH", name: "Ghana", dial: "+233", digits: 9, currency: "GHS", flag: "GHS" },
  { iso: "KE", name: "Kenya", dial: "+254", digits: 9, currency: "KES", flag: "KES" },
  { iso: "GB", name: "United Kingdom", dial: "+44", digits: 10, currency: "GBP", flag: "GBP" },
  { iso: "US", name: "United States", dial: "+1", digits: 10, currency: "USD", flag: "USD" },
  { iso: "CA", name: "Canada", dial: "+1", digits: 10, currency: "CAD", flag: "CAD" },
  { iso: "DE", name: "Germany", dial: "+49", digits: 11, currency: "EUR", flag: "EUR" },
  { iso: "FR", name: "France", dial: "+33", digits: 9, currency: "EUR", flag: "EUR" },
  { iso: "IE", name: "Ireland", dial: "+353", digits: 9, currency: "EUR", flag: "EUR" },
  { iso: "NL", name: "Netherlands", dial: "+31", digits: 9, currency: "EUR", flag: "EUR" },
  { iso: "ES", name: "Spain", dial: "+34", digits: 9, currency: "EUR", flag: "EUR" },
];

/** Where you can sign up (you verify with an ID from one of these). */
export const SIGNUP_COUNTRIES = COUNTRIES.filter((k) => ["NG", "GH", "KE", "GB", "US", "CA"].includes(k.iso));

export const countryByIso = (iso: string) => COUNTRIES.find((k) => k.iso === iso) ?? COUNTRIES[0];
