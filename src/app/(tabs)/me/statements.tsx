import { useState } from "react";
import { View } from "react-native";
import { Note } from "@/components/bits";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { formatDay, openDateRange, startOfDay } from "@/components/date-range-sheet";
import { Dropdown } from "@/components/dropdown";
import { ListRow, ListSection } from "@/components/list";
import { Screen } from "@/components/screen";
import { ChipRow, useChipText } from "@/components/sheet";
import { Text } from "@/components/text";
import { ASSETS_FIAT_FIRST, type AssetCode } from "@/data/assets";
import { overlay } from "@/stores/use-overlay-store";
import { useSessionStore } from "@/stores/use-session-store";
import { toast, withLoader } from "@/stores/use-ui-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { spacing } from "@/theme";

type Period = "last-month" | "3m" | "6m" | "year" | "custom";
const PERIODS: Period[] = ["last-month", "3m", "6m", "year", "custom"];
const PERIOD_LABEL: Record<Period, string> = { "last-month": "Last month", "3m": "Last 3 months", "6m": "Last 6 months", year: "This year", custom: "Custom" };
/** Statements go back this far. */
const HISTORY_MONTHS = 24;

/** The dates a preset covers, ending today (Last month = the whole previous calendar month). */
function presetRange(p: Exclude<Period, "custom">): [Date, Date] {
  const today = startOfDay(new Date());
  if (p === "last-month") return [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)];
  if (p === "year") return [new Date(today.getFullYear(), 0, 1), today];
  const months = p === "3m" ? 3 : 6;
  return [new Date(today.getFullYear(), today.getMonth() - months, today.getDate() + 1), today];
}

/**
 * Statements: pick the account, then the period (a preset or your own dates on our calendar),
 * and we email it as a PDF to the address on the account (mock).
 */
export default function Statements() {
  const chipText = useChipText();
  const opened = useWalletStore((s) => s.opened);
  const email = useSessionStore((s) => s.account?.email ?? s.user.email);
  const accounts = ASSETS_FIAT_FIRST.filter((x) => opened.includes(x.code));
  const [code, setCode] = useState<AssetCode>(accounts[0]?.code ?? "NGN");
  const [period, setPeriod] = useState<Period>("last-month");
  const [custom, setCustom] = useState<[Date, Date] | null>(null);
  const a = ASSETS_FIAT_FIRST.find((x) => x.code === code)!;
  const range = period === "custom" ? custom : presetRange(period);
  const today = startOfDay(new Date());
  const earliest = new Date(today.getFullYear(), today.getMonth() - HISTORY_MONTHS, today.getDate());
  const span = range ? `${formatDay(range[0])} – ${formatDay(range[1])}` : "";

  const pickAccount = () =>
    overlay.select({
      title: "Account",
      subtitle: "Which statement do you need?",
      value: code,
      options: accounts.map((x) => ({ value: x.code, label: x.name, sub: `${x.code} ${x.kind === "crypto" ? "wallet" : "account"}`, leading: <CoinIcon code={x.code} size={36} /> })),
      onSelect: (v) => setCode(v as AssetCode),
    });

  const pickDates = () => openDateRange({ title: "Statement period", initial: custom, min: earliest, max: today, onApply: (start, end) => setCustom([start, end]) });

  const send = () => {
    if (!range) return;
    overlay.confirm({
      icon: "envelope",
      title: "Email your statement?",
      body: `Your ${a.code} statement for ${span} goes to ${email} as a PDF. It usually arrives within a few minutes.`,
      confirmLabel: "Send to my email",
      onConfirm: () => withLoader("Preparing your statement…", () => toast(`Statement sent to ${email}`, "success")),
    });
  };

  return (
    <Screen footer={<Button title="Email statement" icon="envelope" disabled={!range} onPress={send} />}>
      <Dropdown label="Account" value={a.name} sub={`${a.code} ${a.kind === "crypto" ? "wallet" : "account"}`} leading={<CoinIcon code={a.code} size={36} />} onPress={pickAccount} />

      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          Period
        </Text>
        <ChipRow
          options={PERIODS}
          value={period}
          onChange={(p) => {
            setPeriod(p);
            if (p === "custom" && !custom) pickDates();
          }}
          bleed={spacing.md}
          render={(v, on) => (
            <Text variant="subhead" style={{ color: chipText(on) }}>
              {PERIOD_LABEL[v]}
            </Text>
          )}
        />
        {period === "custom" && (
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Dropdown label="From" value={custom ? formatDay(custom[0]) : undefined} placeholder="Start date" onPress={pickDates} />
            </View>
            <View style={{ flex: 1 }}>
              <Dropdown label="To" value={custom ? formatDay(custom[1]) : undefined} placeholder="End date" onPress={pickDates} />
            </View>
          </View>
        )}
      </View>

      <ListSection title="Your statement">
        <ListRow icon="docLine" title={`${a.name} statement`} subtitle={range ? span : "Pick your dates"} value="PDF" valueTone="muted" />
        <ListRow icon="envelope" title="Sent to" subtitle={email} />
      </ListSection>
      <Note icon="info">Statements are PDFs your bank, embassy or landlord will accept.</Note>
    </Screen>
  );
}
