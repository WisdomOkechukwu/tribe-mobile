import { router } from "expo-router";
import { View } from "react-native";
import { EmptyState, Pill } from "@/components/bits";
import { BillerThumb } from "@/components/brand-tiles";
import { BrandSwitch } from "@/components/brand-switch";
import { Button } from "@/components/button";
import { ListRow, ListSection, RowIcon } from "@/components/list";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { billerById } from "@/data/catalog";
import { useFlowStore } from "@/stores/use-flow-store";
import { overlay } from "@/stores/use-overlay-store";
import { FREQUENCY_LABEL, useRecurringStore, type Frequency, type Schedule } from "@/stores/use-recurring-store";
import { toast } from "@/stores/use-ui-store";
import { spacing, useColors } from "@/theme";

const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/** Manage one schedule from our own sheet: pay now, change how often, pause, delete. */
function manage(s: Schedule, c: ReturnType<typeof useColors>) {
  const b = billerById(s.billerId);
  const store = useRecurringStore.getState();
  overlay.select({
    title: `${b.name}${s.plan ? ` · ${s.plan}` : ""}`,
    subtitle: `₦${s.amountNgn.toLocaleString()} ${FREQUENCY_LABEL[s.frequency].toLowerCase()} · next ${when(s.nextRun)}`,
    options: [
      { value: "pay", label: "Pay now", sub: "Runs this payment early; the schedule carries on", leading: <RowIcon name="bolt" tint={c.brandText} bg={c.brandSoft} /> },
      { value: "freq", label: "Change how often", sub: FREQUENCY_LABEL[s.frequency], leading: <RowIcon name="repeat" tint={c.brandText} bg={c.brandSoft} /> },
      { value: "pause", label: s.active ? "Pause" : "Resume", leading: <RowIcon name={s.active ? "clock" : "repeat"} tint={c.text} bg={c.surfaceAlt} /> },
      { value: "delete", label: "Delete", destructive: true, leading: <RowIcon name="trash" tint={c.danger} bg={c.dangerSoft} /> },
    ],
    onSelect: (v) => {
      if (v === "pay") {
        useFlowStore.getState().begin({ kind: "bill", billerId: s.billerId, amountNgn: s.amountNgn, payWith: s.payWith, target: s.target, plan: s.plan, recurringId: s.id });
        router.push("/bill/review");
      } else if (v === "freq") {
        overlay.select({
          title: "How often?",
          value: s.frequency,
          options: (["weekly", "biweekly", "monthly"] as Frequency[]).map((f) => ({ value: f, label: FREQUENCY_LABEL[f] })),
          onSelect: (f) => {
            store.update(s.id, { frequency: f as Frequency });
            toast(`Now ${FREQUENCY_LABEL[f as Frequency].toLowerCase()}`);
          },
        });
      } else if (v === "pause") {
        store.toggle(s.id);
        toast(s.active ? "Paused" : "Resumed");
      } else
        overlay.confirm({
          icon: "trash",
          title: "Delete this recurring bill?",
          body: `${b.name} will stop renewing automatically. Payments already made aren't affected.`,
          confirmLabel: "Delete",
          destructive: true,
          onConfirm: () => {
            store.remove(s.id);
            toast("Recurring bill deleted");
          },
        });
    },
  });
}

/** Pay › Recurring: every bill that renews itself. */
export default function Recurring() {
  const c = useColors();
  const schedules = useRecurringStore((s) => s.schedules);
  const toggle = useRecurringStore((s) => s.toggle);
  const active = schedules.filter((s) => s.active);
  const monthly = active.reduce((sum, s) => sum + s.amountNgn * (s.frequency === "weekly" ? 4.33 : s.frequency === "biweekly" ? 2.17 : 1), 0);

  return (
    <Screen footer={<Button title="Add a recurring bill" icon="add" onPress={() => router.push("/recurring/new")} />}>
      {schedules.length === 0 ? (
        <EmptyState icon="repeat" title="Nothing renewing yet" body="Set data, TV and light to renew themselves, so you never get cut off." />
      ) : (
        <>
          <View style={{ backgroundColor: c.surface, borderRadius: 18, padding: spacing.md, flexDirection: "row" }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="caption" tone="muted">
                Active
              </Text>
              <Text variant="title">{active.length}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: c.border, marginHorizontal: spacing.md }} />
            <View style={{ flex: 2, gap: 2 }}>
              <Text variant="caption" tone="muted">
                About per month
              </Text>
              <Text variant="title">₦{Math.round(monthly).toLocaleString()}</Text>
            </View>
          </View>
          <ListSection title="Your schedules" footer="Tap a schedule to pay now, change how often, pause or delete it.">
            {schedules.map((s) => {
              const b = billerById(s.billerId);
              return (
                <ListRow
                  key={s.id}
                  leading={<BillerThumb biller={b} size={40} />}
                  title={`${b.name}${s.plan ? ` · ${s.plan}` : ""}`}
                  subtitle={s.active ? `₦${s.amountNgn.toLocaleString()} · ${FREQUENCY_LABEL[s.frequency]} · next ${when(s.nextRun)}` : "Paused"}
                  trailing={
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <BrandSwitch label={`${b.name} renews automatically`} value={s.active} onValueChange={() => toggle(s.id)} />
                      <Pill label={s.payWith} tone="neutral" />
                    </View>
                  }
                  onPress={() => manage(s, c)}
                />
              );
            })}
          </ListSection>
        </>
      )}
    </Screen>
  );
}
