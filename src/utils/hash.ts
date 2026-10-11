/**
 * Demo-only password digest (FNV-1a, salted with the email) so the prototype never stores the
 * raw password. TODO(auth): real builds send the password to Tribe's backend over TLS and keep
 * nothing on device but a session token in expo-secure-store.
 */
export function demoHash(email: string, password: string) {
  let h = 0x811c9dc5;
  const input = `${email.trim().toLowerCase()}::${password}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** d*****20@gmail.com, the way codes are announced. */
export function maskEmail(email: string) {
  const [name = "", domain = ""] = email.trim().split("@");
  if (name.length <= 2) return `${name[0] ?? ""}***@${domain}`;
  return `${name[0]}${"*".repeat(Math.max(3, name.length - 3))}${name.slice(-2)}@${domain}`;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
