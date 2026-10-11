import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { EmptyState, Note } from "@/components/bits";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { FlowScreen } from "@/components/flow-screen";
import { ListSection } from "@/components/list";
import { Text } from "@/components/text";
import { TransactionRow } from "@/components/transaction-row";
import { useInboxStore } from "@/stores/use-inbox-store";
import { ISSUE_REASON, reasonsFor, useSupportStore, type IssueReason } from "@/stores/use-support-store";
import { toast } from "@/stores/use-ui-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { spacing, useColors } from "@/theme";

function ReasonRow({ reason, selected, onPress }: { reason: IssueReason; selected: boolean; onPress: () => void }) {
  const c = useColors();
  const r = ISSUE_REASON[reason];
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={r.label}>
      {({ pressed }) => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, paddingVertical: spacing.smd, minHeight: 60, backgroundColor: pressed ? c.surfaceAlt : "transparent" }}>
          <View style={{ flex: 1, gap: 1 }}>
            <Text variant="bodyStrong">{r.label}</Text>
            <Text variant="caption" tone="muted">
              {r.sub}
            </Text>
          </View>
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: selected ? 7 : 1.5, borderColor: selected ? c.brand : c.borderStrong }} />
        </View>
      )}
    </Pressable>
  );
}

/** Report a problem with one transaction: pick what went wrong, add detail, send to support. */
export default function ReportIssue() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx = useWalletStore((s) => s.transactions.find((t) => t.id === id));
  const openTicket = useSupportStore((s) => s.open);
  const [reason, setReason] = useState<IssueReason | null>(null);
  const [details, setDetails] = useState("");

  if (!tx) {
    return (
      <FlowScreen title="Report an issue" cancel="x">
        <EmptyState icon="info" title="Transaction not found" body="Open the receipt again and retry." />
      </FlowScreen>
    );
  }

  const needsDetail = reason === "other";
  const ready = !!reason && (!needsDetail || details.trim().length >= 10);

  return (
    <FlowScreen
      title="Report an issue"
      cancel="x"
      footer={
        <Button
          title="Send to support"
          disabled={!ready}
          onPress={() => {
            const ticket = openTicket({ txId: tx.id, reason: reason!, details: details.trim() });
            useInboxStore.getState().push({ kind: "support", title: `Ticket ${ticket.id} opened`, body: `${ISSUE_REASON[reason!].label} · ${tx.title}. We'll reply here, usually within a few hours.`, href: `/transaction/${tx.id}` });
            toast("Sent to support", "success");
            router.back();
          }}
        />
      }
    >
      <ListSection inset={spacing.md}>
        <TransactionRow tx={tx} interactive={false} />
      </ListSection>

      <ListSection title="What went wrong?" inset={spacing.md}>
        {reasonsFor(tx.type).map((r) => (
          <ReasonRow key={r} reason={r} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </ListSection>

      {reason === "not-me" && (
        <Note icon="shield" tone="warning">
          If you think someone else has access to your account, change your PIN in Security centre and freeze your cards. Support will review your recent activity.
        </Note>
      )}

      <Field
        label={needsDetail ? "Tell us what happened" : "Anything else? (optional)"}
        value={details}
        onChangeText={setDetails}
        placeholder="What you expected, and what happened instead"
        multiline
        maxLength={500}
        autoCorrect
        textAlignVertical="top"
        style={{ minHeight: 110, paddingTop: spacing.smd }}
        hint={`Reference ${tx.reference} is attached automatically.`}
      />
    </FlowScreen>
  );
}
