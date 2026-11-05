/**
 * Exact decimal maths for money. The API sends and takes money as strings ("12.50",
 * "0.00500000"); doing sums on JS numbers drifts (0.1 + 0.2). Everything here works on
 * fixed-point BigInts scaled by 10^18, so totals, fees and balance checks stay exact.
 *
 * Screens still format numbers for display (`formatAsset`), which is fine for showing a value.
 * Anything sent to the API, or compared against a balance, goes through these helpers.
 */
const SCALE = 18;
const ONE = 10n ** BigInt(SCALE);

export type Decimal = bigint;

/** "12.5" / "-0.003" / 12.5 → fixed-point. Invalid input becomes 0. */
export function dec(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") return 0n;
  // a number's own digits: toFixed avoids "1e-7"; it never has more than 18 places here
  const text = typeof value === "number" ? (Number.isFinite(value) ? value.toFixed(SCALE) : "0") : value.trim();
  const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match) return 0n;
  const [, sign, whole = "", frac = ""] = match;
  const units = BigInt(whole || "0") * ONE + BigInt((frac + "0".repeat(SCALE)).slice(0, SCALE) || "0");
  return sign === "-" ? -units : units;
}

/** Fixed-point → "12.50" with `places` decimals, rounding half away from zero. */
export function decToString(value: Decimal, places: number): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const step = 10n ** BigInt(SCALE - places);
  const rounded = ((abs + step / 2n) / step) * step;
  const whole = rounded / ONE;
  const frac = (rounded % ONE).toString().padStart(SCALE, "0").slice(0, places);
  const body = places > 0 ? `${whole}.${frac}` : `${whole}`;
  return negative && rounded !== 0n ? `-${body}` : body;
}

export const decAdd = (...values: Decimal[]) => values.reduce((sum, v) => sum + v, 0n);
export const decSub = (a: Decimal, b: Decimal) => a - b;
export const decMul = (a: Decimal, b: Decimal) => (a * b) / ONE;
export const decDiv = (a: Decimal, b: Decimal) => (b === 0n ? 0n : (a * ONE) / b);
export const decCmp = (a: Decimal, b: Decimal) => (a === b ? 0 : a > b ? 1 : -1);
export const decMax = (a: Decimal, b: Decimal) => (a > b ? a : b);

/** For display only (formatAsset and friends take numbers). Never feed this back into maths. */
export const decToNumber = (value: Decimal) => Number(decToString(value, 12));

/**
 * A money string for the API: `amount` (a number from an amount field, or a string the API
 * sent) rounded to `places`. `amountString(12.5, 2)` → "12.50".
 */
export const amountString = (amount: string | number, places: number) => decToString(dec(amount), places);

/** Is `amount` more than `balance`? Both as the API or the keypad gave them. */
export const exceeds = (amount: string | number, balance: string | number) => dec(amount) > dec(balance);
