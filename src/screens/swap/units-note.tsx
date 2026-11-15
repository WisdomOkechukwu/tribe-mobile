import { View } from "react-native";
import { Button } from "@/components/button";
import { Icon, type IconName } from "@/components/icon";
import { Text } from "@/components/text";
import { overlay } from "@/stores/use-overlay-store";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { fonts, palette, radius, spacing, useColors } from "@/theme";

/** Kept with the other dismissed tips (prefs.dismissedPromos): "Got it" means never again. */
const UNITS_NOTE = "swap-units-note";

const POINTS: { icon: IconName; text: string }[] = [
  { icon: "lock", text: "The amount you type is locked in. It never changes." },
  { icon: "percent", text: "We work out the other amounts from it and round them off." },
  { icon: "swapVertical", text: "Switch where you type and they can move by a tiny bit. That's normal." },
];

/**
 * Why the amounts move when you switch what you type in: a sticker, the two amounts on screen
 * (the one just locked in, the one worked out from it), three short lines and a promise. Plain
 * words, no finance talk.
 */
function UnitsNote({ exact, worked, close }: { exact: string; worked: string; close: (after?: () => void) => void }) {
  const c = useColors();
  return (
    <View style={{ paddingHorizontal: spacing.mdl, gap: spacing.md }}>
      <View style={{ gap: spacing.sm }}>
        {/* orange is the app's highlight colour: a tilted sticker, as on receipts and setup */}
        <View style={{ alignSelf: "flex-start", transform: [{ rotate: "-4deg" }], backgroundColor: palette.orange[500], borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 4 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: palette.white, letterSpacing: 0.2 }}>quick heads-up</Text>
        </View>
        <Text variant="largeTitle" accessibilityRole="header">
          Amounts moved a little? That&apos;s okay.
        </Text>
      </View>

      {/* the two amounts on screen right now: solid = typed, dashed = worked out */}
      <View style={{ flexDirection: "row", alignItems: "stretch", gap: spacing.sm }}>
        <View style={{ flex: 1, gap: spacing.xs, backgroundColor: c.brandSoft, borderRadius: radius.group, borderCurve: "continuous", borderWidth: 1.5, borderColor: c.brand, padding: spacing.smd }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Icon name="lock" size={11} color={c.brandText} weight="bold" />
            <Text variant="caption" tone="brand">
              You typed
            </Text>
          </View>
          <Text variant="amount" numberOfLines={1} adjustsFontSizeToFit>
            {exact}
          </Text>
        </View>
        <View style={{ flex: 1, gap: spacing.xs, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", borderWidth: 1.5, borderStyle: "dashed", borderColor: c.borderStrong, padding: spacing.smd }}>
          <Text variant="caption" tone="muted">
            We worked out
          </Text>
          <Text variant="amount" tone="muted" numberOfLines={1} adjustsFontSizeToFit>
            ≈ {worked}
          </Text>
        </View>
      </View>

      <View style={{ gap: spacing.smd }}>
        {POINTS.map((p) => (
          <View key={p.icon} style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
              <Icon name={p.icon} size={14} color={c.textMuted} />
            </View>
            <Text variant="body" style={{ flex: 1 }}>
              {p.text}
            </Text>
          </View>
        ))}
      </View>

      <Text variant="subhead" tone="muted">
        No surprises: you see the final amounts before you swap.
      </Text>
      <Button title="Got it" onPress={() => close(() => usePrefsStore.getState().dismissPromo(UNITS_NOTE))} />
    </View>
  );
}

/** Shown when the amounts re-base on another unit, until it's acknowledged once. */
export function openUnitsNote(amounts: { exact: string; worked: string }) {
  if (usePrefsStore.getState().dismissedPromos.includes(UNITS_NOTE)) return;
  overlay.sheet({ content: (close) => <UnitsNote {...amounts} close={close} /> });
}
