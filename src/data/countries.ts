import type { AssetCode } from "./assets";

/**
 * Countries Tribe works with. `flag` is the asset code whose PNG flag CoinIcon draws (flags per
 * currency, so euro countries share the EU flag there); `CountryFlag` draws the country's own.
 * Phone digits exclude the leading 0.
 */
export type Region = "Africa" | "Europe" | "Americas";
export type Country = { iso: string; name: string; dial: string; digits: number; currency: AssetCode; flag: AssetCode; region: Region };

/** Global send groups destinations by these, in this order. */
export const REGIONS: Region[] = ["Africa", "Europe", "Americas"];

export const COUNTRIES: Country[] = [
  { iso: "NG", name: "Nigeria", dial: "+234", digits: 10, currency: "NGN", flag: "NGN", region: "Africa" },
  { iso: "GH", name: "Ghana", dial: "+233", digits: 9, currency: "GHS", flag: "GHS", region: "Africa" },
  { iso: "KE", name: "Kenya", dial: "+254", digits: 9, currency: "KES", flag: "KES", region: "Africa" },
  { iso: "GB", name: "United Kingdom", dial: "+44", digits: 10, currency: "GBP", flag: "GBP", region: "Europe" },
  { iso: "US", name: "United States", dial: "+1", digits: 10, currency: "USD", flag: "USD", region: "Americas" },
  { iso: "CA", name: "Canada", dial: "+1", digits: 10, currency: "CAD", flag: "CAD", region: "Americas" },
  { iso: "DE", name: "Germany", dial: "+49", digits: 11, currency: "EUR", flag: "EUR", region: "Europe" },
  { iso: "FR", name: "France", dial: "+33", digits: 9, currency: "EUR", flag: "EUR", region: "Europe" },
  { iso: "IE", name: "Ireland", dial: "+353", digits: 9, currency: "EUR", flag: "EUR", region: "Europe" },
  { iso: "NL", name: "Netherlands", dial: "+31", digits: 9, currency: "EUR", flag: "EUR", region: "Europe" },
  { iso: "ES", name: "Spain", dial: "+34", digits: 9, currency: "EUR", flag: "EUR", region: "Europe" },
];

/** Where you can sign up (you verify with an ID from one of these). */
export const SIGNUP_COUNTRIES = COUNTRIES.filter((k) => ["NG", "GH", "KE", "GB", "US", "CA"].includes(k.iso));

export const countryByIso = (iso: string) => COUNTRIES.find((k) => k.iso === iso) ?? COUNTRIES[0];
