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
import { ISSUE_REASON, reasonsFor, type IssueReason } from "@/stores/use-support-store";
import { openTicket } from "@/api/actions";
import { errorMessage } from "@/api/http";
import { useTransaction } from "@/api/queries";
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
          <View style={{ flex: 1, gap: spacing.xxs }}>
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
  const cached = useWalletStore((s) => s.transactions.find((t) => t.id === id));
  const detail = useTransaction(cached ? undefined : id);
  const tx = cached ?? detail.data?.tx;
  const [busy, setBusy] = useState(false);
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
          loading={busy}
          onPress={async () => {
            setBusy(true);
            try {
              const ticket = await openTicket({ txId: tx.id, reason: reason!, subject: `${ISSUE_REASON[reason!].label} · ${tx.title}`, details: details.trim() });
              toast("Sent to support", "success");
              // straight into the chat, where Tribe's reply will land
              router.replace({ pathname: "/support/[id]", params: { id: ticket.id } });
            } catch (e) {
              toast(errorMessage(e), "danger");
            } finally {
              setBusy(false);
            }
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
