/** Parses a Tribe pay code: tribe://pay/@tag, a tribe.africa/pay/tag link, or a bare @tag. Returns the tag. */
export function parseTribeCode(data: string): string | null {
  const s = data.trim();
  const m = s.match(/^(?:tribe:\/\/pay\/|https?:\/\/(?:www\.)?tribe\.africa\/pay\/)?@?([a-z0-9_.]{3,20})$/i);
  return m && (s.startsWith("tribe://") || s.includes("tribe.africa/pay/") || s.startsWith("@")) ? m[1].toLowerCase() : null;
}
