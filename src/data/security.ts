/** Email codes (sign-up and password reset). */
export const EMAIL_CODE_LENGTH = 4;

export type PasswordRule = { id: string; label: string; test: (v: string) => boolean };

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "special", label: "One special character (e.g. !@#$%^&*)", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export const passwordOk = (v: string) => PASSWORD_RULES.every((r) => r.test(v));
