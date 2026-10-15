import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { overlay } from "@/stores/use-overlay-store";
import { spacing, useColors } from "@/theme";
import { Button } from "./button";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_FMT = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const DAY_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && a.getTime() === b.getTime();
/** "1 Jul 2026" */
export const formatDay = (d: Date) => DAY_FMT.format(d);

/** One month as 6 rows of 7 days (Monday first); blanks outside the month. */
function monthGrid(month: Date): (Date | null)[] {
  const lead = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, i) => {
    const day = i - lead + 1;
    return day >= 1 && day <= days ? new Date(month.getFullYear(), month.getMonth(), day) : null;
  });
}

function RangeCalendar({ initial, min, max, close, onApply }: { initial: [Date, Date] | null; min: Date; max: Date; close: (after?: () => void) => void; onApply: (start: Date, end: Date) => void }) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const [month, setMonth] = useState(() => firstOfMonth(initial?.[1] ?? max));
  const [start, setStart] = useState<Date | null>(initial?.[0] ?? null);
  const [end, setEnd] = useState<Date | null>(initial?.[1] ?? null);
  const cell = Math.floor((Math.min(width, 520) - spacing.mdl * 2) / 7);
  const canBack = addMonths(month, -1) >= firstOfMonth(min);
  const canNext = addMonths(month, 1) <= firstOfMonth(max);

  const tap = (d: Date) => {
    Haptics.selectionAsync().catch(() => {});
    // first tap starts a range; the second ends it (or restarts it if it's earlier)
    if (!start || end || d < start) {
      setStart(d);
      setEnd(null);
    } else setEnd(d);
  };

  return (
    <View style={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.sm, gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <PressableScale disabled={!canBack} onPress={() => setMonth(addMonths(month, -1))} accessibilityLabel="Previous month" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", opacity: canBack ? 1 : 0.35 }}>
          <Icon name="back" size={14} color={c.text} />
        </PressableScale>
        <Text variant="headline" accessibilityRole="header">
          {MONTH_FMT.format(month)}
        </Text>
        <PressableScale disabled={!canNext} onPress={() => setMonth(addMonths(month, 1))} accessibilityLabel="Next month" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", opacity: canNext ? 1 : 0.35 }}>
          <Icon name="chevron" size={14} color={c.text} />
        </PressableScale>
      </View>

      <View>
        <View style={{ flexDirection: "row" }}>
          {WEEKDAYS.map((w) => (
            <Text key={w} variant="caption" tone="muted" align="center" style={{ width: cell }}>
              {w}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: spacing.xs }}>
          {monthGrid(month).map((d, i) => {
            if (!d) return <View key={`b${i}`} style={{ width: cell, height: cell - 6 }} />;
            const off = d < min || d > max;
            const isStart = sameDay(d, start);
            const isEnd = sameDay(d, end);
            const between = !!start && !!end && d > start && d < end;
            const edge = isStart || isEnd;
            // the band joins start → end; the ends are discs
            const band = between || (isStart && !!end && !isEnd) || (isEnd && !isStart);
            return (
              <Pressable key={d.getTime()} disabled={off} onPress={() => tap(d)} accessibilityRole="button" accessibilityState={{ selected: edge, disabled: off }} accessibilityLabel={formatDay(d)} style={{ width: cell, height: cell - 6, justifyContent: "center", alignItems: "center" }}>
                {band && <View style={{ position: "absolute", top: 4, bottom: 4, left: isStart ? cell / 2 : 0, right: isEnd ? cell / 2 : 0, backgroundColor: c.brandSoft }} />}
                <View style={{ width: cell - 10, height: cell - 10, borderRadius: (cell - 10) / 2, alignItems: "center", justifyContent: "center", backgroundColor: edge ? c.brand : "transparent" }}>
                  <Text variant="subhead" style={{ color: edge ? c.onBrand : off ? c.textSubtle : c.text }}>
                    {d.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text variant="subhead" tone="muted" align="center">
        {start ? `${formatDay(start)} – ${end ? formatDay(end) : "pick an end date"}` : "Pick a start date"}
      </Text>
      <Button title="Apply" disabled={!start || !end} onPress={() => start && end && close(() => onApply(start, end))} />
    </View>
  );
}

/**
 * Our own date-range picker (no native pickers): month paging, tap a start then an end day.
 * Days after `max` or before `min` can't be picked.
 */
export function openDateRange({ title = "Pick dates", initial, min, max, onApply }: { title?: string; initial: [Date, Date] | null; min: Date; max: Date; onApply: (start: Date, end: Date) => void }) {
  overlay.sheet({ title, content: (close) => <RangeCalendar initial={initial} min={startOfDay(min)} max={startOfDay(max)} close={close} onApply={onApply} /> });
}
