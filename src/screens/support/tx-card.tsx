import { View } from "react-native";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { TxArt } from "@/components/receipt-poster";
import { Text } from "@/components/text";
import type { Transaction } from "@/data/seed";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset, relativeDate } from "@/utils/format";
import { txTitle } from "@/utils/tx";

/** "+$200.00" / "−₦5,000.00": the amount with the direction it went. */
export const signedAmount = (tx: Transaction) => formatAsset(tx.amount, tx.asset, { sign: tx.direction === "in" ? "+" : "−" });

/**
 * A transaction pinned to a support chat: its art, what it was, the amount and when. `onRemove`
 * adds an ✕ (new chat, before sending); `onPress` opens it (the receipt, in the chat).
 */
export function TxCard({ tx, label, onPress, onRemove }: { tx: Transaction; label?: string; onPress?: () => void; onRemove?: () => void }) {
  const c = useColors();
  return (
    <PressableScale
      disabled={!onPress}
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label ?? "Attached"}: ${txTitle(tx)}, ${signedAmount(tx)}`}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.smd, borderWidth: 1.5, borderColor: c.brandSoft }}
    >
      <TxArt tx={tx} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        {label && (
          <Text variant="caption" tone="brand">
            {label}
          </Text>
        )}
        <Text variant="bodyStrong" numberOfLines={1}>
          {txTitle(tx)}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {signedAmount(tx)}, {relativeDate(tx.date).toLowerCase()}
        </Text>
      </View>
      {onRemove ? (
        <PressableScale onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel="Remove the transaction" style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
          <Icon name="close" size={12} color={c.textMuted} weight="bold" />
        </PressableScale>
      ) : (
        onPress && <Icon name="chevron" size={13} color={c.textSubtle} />
      )}
    </PressableScale>
  );
}
