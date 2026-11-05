import { DEMO } from "./seed";

/** Tribe users the demo account has paid before — the "Recent" row on Send. */
export type Contact = { name: string; tag: string };

export const RECENT_CONTACTS: Contact[] = [
  { name: "Tolulope A.", tag: "tolu" },
  { name: "Chiamaka E.", tag: "chiamaka" },
  { name: "Kwame O.", tag: "kwame" },
  { name: "Zainab M.", tag: "zainab_m" },
  { name: "Seun B.", tag: "seunb" },
];

/** True when @tag resolves to a Tribe user in the demo directory. */
export const isKnownTag = (tag: string) => (DEMO.takenTags as readonly string[]).includes(tag) || RECENT_CONTACTS.some((c) => c.tag === tag);

export const contactByTag = (tag: string) => RECENT_CONTACTS.find((c) => c.tag === tag);

/** Demo directory for "Send to a Tribe user" lookups by @username or email. */
export const TRIBE_DIRECTORY: { tag: string; name: string; email: string }[] = [
  { tag: "tolu", name: "Tolulope Adeyemi", email: "tolu@tribe.africa" },
  { tag: "chiamaka", name: "Chiamaka Eze", email: "chiamaka@gmail.com" },
  { tag: "kwame", name: "Kwame Mensah", email: "kwame.m@outlook.com" },
  { tag: "zainab_m", name: "Zainab Musa", email: "zainab@yahoo.com" },
  { tag: "seunb", name: "Seun Bakare", email: "seun@bakare.ng" },
  { tag: "ada", name: "Ada Okafor", email: "ada@tribe.africa" },
  { tag: "johnade", name: "John Doe Adekunle", email: "john.adekunle@gmail.com" },
];

/** Resolve "@tolu", "tolu" or "tolu@tribe.africa" to a Tribe user. */
export function findTribeUser(q: string) {
  const v = q.trim().toLowerCase();
  if (!v) return undefined;
  if (v.includes("@") && !v.startsWith("@")) return TRIBE_DIRECTORY.find((u) => u.email === v);
  const tag = v.replace(/^@/, "");
  return TRIBE_DIRECTORY.find((u) => u.tag === tag);
}
