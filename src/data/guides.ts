import type { GlyphName } from "@/components/glyphs";
import { railsFor, type Asset } from "./assets";

export type GuideKind = "receive" | "send" | "swap";
export type GuideStep = { title: string; body: string; glyph: GlyphName };

/**
 * Short, punchy how-tos for each currency page: three steps, a title you can read at a glance
 * and one line under it. At most one slang line per guide, never in a security warning.
 */
export function guideSteps(a: Asset, g: GuideKind): GuideStep[] {
  const crypto = a.kind === "crypto";
  if (g === "receive") {
    if (crypto)
      return [
        { title: "Pick a network", body: `Tap Receive and choose ${a.networks?.map((n) => n.name.split(" ")[0]).join(", ")}.`, glyph: "crypto" },
        { title: "Copy or show the QR", body: `Your ${a.code} address, ready to paste or scan.`, glyph: "qr" },
        { title: "It lands, you chill", body: "Only send on the network you picked. Funds land after network confirmations.", glyph: "tray" },
      ];
    const rails = railsFor(a);
    return [
      { title: "Grab your details", body: rails.length > 1 ? `Tap Receive and pick how it's coming: ${rails.map((r) => r.name).join(", ")}.` : `Tap Receive to see your ${a.name} account details.`, glyph: "tray" },
      { title: "Drop them anywhere", body: "Your client, your boss, your aunty abroad. Anyone can pay in.", glyph: "at" },
      { title: "Get paid", body: `It lands in your ${a.code} balance, ${rails[0]?.eta.toLowerCase() ?? "within minutes"}. That's literally it.`, glyph: "spark" },
    ];
  }
  if (g === "send")
    return crypto
      ? [
          { title: "Paste or pick", body: "A wallet address, or a Tribe @tag for free, instant sends.", glyph: "at" },
          { title: "Choose the network", body: "Pick the network and amount. You see the fee before anything moves.", glyph: "crypto" },
          { title: "Approve, done", body: "PIN or Face ID and it's on its way.", glyph: "outgoing" },
        ]
      : [
          { title: "Who's getting it?", body: a.code === "NGN" ? "Any Nigerian bank account, or a Tribe @tag." : `Their ${a.code} account details, or a Tribe @tag.`, glyph: "at" },
          { title: "Set the amount", body: "You see the fee and the arrival time up front. No surprises.", glyph: "naira" },
          { title: "Approve, done", body: "PIN or Face ID. @tag sends are instant and free.", glyph: "outgoing" },
        ];
  return [
    { title: "Pick a pair", body: `${a.code} into anything: Naira, dollars, pounds or crypto.`, glyph: "crypto" },
    { title: "Lock the rate", body: "Your rate is held for 30 seconds while you decide.", glyph: "spark" },
    { title: "Swap it", body: "Both balances update instantly. 0.5% fee, that's the whole deal.", glyph: "outgoing" },
  ];
}
