import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { KeyboardFrame } from "@/components/keyboard-frame";
import { PressableScale } from "@/components/pressable-scale";
import { TxArt } from "@/components/receipt-poster";
import { Text } from "@/components/text";
import { useTransaction, useTransactions } from "@/api/queries";
import { startChat } from "@/api/support";
import { errorMessage } from "@/api/http";
import { TOPICS, topicById } from "@/screens/support/topics";
import { signedAmount, TxCard } from "@/screens/support/tx-card";
import { overlay } from "@/stores/use-overlay-store";
import { toast } from "@/stores/use-ui-store";
import { fonts, radius, spacing, useColors } from "@/theme";
import { relativeDate } from "@/utils/format";
import { txTitle } from "@/utils/tx";

/** How many recent transactions the picker offers. */
const PICK_FROM = 25;

/**
 * A new chat: what it's about (one tap), what's going on, and (if it's about one) the transaction
 * itself, so Tribe sees exactly which payment you mean. `topic` and `tx` params pre-fill them.
 */
export default function NewChat() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { topic: start, tx: startTx } = useLocalSearchParams<{ topic?: string; tx?: string }>();
  const [topic, setTopic] = useState(topicById(start)?.id ?? (startTx ? "payment" : null));
  const [body, setBody] = useState("");
  const [txId, setTxId] = useState<string | null>(startTx ?? null);
  const [busy, setBusy] = useState(false);
  const recent = useTransactions();
  const list = recent.data ?? [];
  // the attached one: from the recent list if it's there, else fetched by id (an older one, a deep link)
  const fromList = txId ? list.find((t) => t.id === txId) : undefined;
  const fetched = useTransaction(txId && !fromList ? txId : undefined);
  const attached = fromList ?? fetched.data?.tx;
  const chosen = topicById(topic ?? undefined);
  const ready = !!chosen && body.trim().length >= 3;

  const pickTransaction = () => {
    if (!list.length) return toast(recent.isPending ? "Loading your transactions…" : "No transactions to attach yet");
    overlay.select({
      title: "Attach a transaction",
      subtitle: "Pick the one this is about. Tribe sees it with your message.",
      value: txId ?? undefined,
      options: list.slice(0, PICK_FROM).map((t) => ({ value: t.id, label: txTitle(t), sub: `${signedAmount(t)}, ${relativeDate(t.date).toLowerCase()}`, leading: <TxArt tx={t} size={36} /> })),
      onSelect: (v) => {
        setTxId(v);
        if (!topic) setTopic("payment");
      },
    });
  };

  const send = async () => {
    if (!chosen) return;
    setBusy(true);
    try {
      const id = await startChat(chosen.subject, body.trim(), txId ?? undefined);
      router.replace({ pathname: "/support/[id]", params: { id } });
    } catch (e) {
      toast(errorMessage(e), "danger");
      setBusy(false);
    }
  };

  return (
    <KeyboardFrame backgroundColor={c.bg}>
      <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.mdl, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="headline">What&apos;s it about?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} accessibilityRole="radiogroup">
            {TOPICS.map((t) => {
              const on = topic === t.id;
              return (
                <PressableScale
                  key={t.id}
                  onPress={() => setTopic(t.id)}
                  scaleTo={0.96}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.sm, backgroundColor: on ? c.brand : c.surface }}
                >
                  <Icon name={on ? "check" : t.icon} size={13} color={on ? c.onBrand : c.brandText} weight={on ? "bold" : undefined} />
                  <Text variant="subhead" style={{ color: on ? c.onBrand : c.text }}>
                    {t.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="headline">What&apos;s going on?</Text>
          <TextInput
            value={body}
            onChangeText={(t) => setBody(t.slice(0, 2000))}
            placeholder="Tell us in your own words. Amounts, dates and what you expected help us sort it faster."
            placeholderTextColor={c.textSubtle}
            multiline
            autoFocus={!!chosen}
            textAlignVertical="top"
            style={{ minHeight: 132, backgroundColor: c.surface, borderRadius: radius.input, borderCurve: "continuous", padding: spacing.md, color: c.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }}
          />
        </View>

        {/* the transaction this is about, pinned to the chat */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="headline">About a transaction?</Text>
          {attached ? (
            <TxCard tx={attached} label="Attached" onRemove={() => setTxId(null)} />
          ) : txId && fetched.isPending ? (
            <View style={{ backgroundColor: c.surface, borderRadius: radius.group, padding: spacing.md }}>
              <Text variant="caption" tone="muted">
                Loading the transaction…
              </Text>
            </View>
          ) : (
            <PressableScale
              onPress={pickTransaction}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel="Attach a transaction"
              style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, borderRadius: radius.group, borderCurve: "continuous", borderWidth: 1.5, borderStyle: "dashed", borderColor: c.borderStrong, padding: spacing.md }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name="link" size={15} color={c.brandText} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">Attach a transaction</Text>
                <Text variant="caption" tone="muted">
                  Optional. Tribe sees exactly which payment you mean.
                </Text>
              </View>
              <Icon name="chevron" size={13} color={c.textSubtle} />
            </PressableScale>
          )}
        </View>

        <Text variant="caption" tone="subtle" style={{ paddingHorizontal: spacing.xs }}>
          Never share your PIN or password. Tribe will never ask for them.
        </Text>
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.mdl, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.md) }}>
        <Button title={chosen ? "Send to Tribe" : "Pick a topic"} icon="paperplane" disabled={!ready} loading={busy} onPress={send} />
      </View>
    </KeyboardFrame>
  );
}
