/** Auto-lock after this long without a touch (or this long in the background). */
export const AUTO_LOCK_MS = 10 * 60_000;
/** The lock PIN unlocks the app. It is NOT the 4-digit transaction PIN. */
export const LOCK_PIN_LENGTH = 6;
/** Wrong lock PINs before we ask for the password instead. */
export const LOCK_MAX_TRIES = 3;
/** Email codes (sign-up and password reset). */
export const EMAIL_CODE_LENGTH = 4;

export type PasswordRule = { id: string; label: string; test: (v: string) => boolean };

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "special", label: "One special character (e.g. !@#$%^&*)", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export const passwordOk = (v: string) => PASSWORD_RULES.every((r) => r.test(v));
