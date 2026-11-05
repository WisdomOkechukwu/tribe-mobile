import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssetCode } from "@/data/assets";
import { persistStorage } from "./storage";

export type Frequency = "weekly" | "biweekly" | "monthly";

export type Schedule = {
  id: string;
  billerId: string;
  /** phone / smartcard / meter, as shown */
  target: string;
  /** the plan's name, for display */
  plan?: string;
  planId?: string;
  amountNgn: number;
  payWith: AssetCode;
  frequency: Frequency;
  nextRun: string;
  active: boolean;
  createdAt: string;
  lastPaid?: string;
  /** the server's row version (PATCH sends it so a stale edit is refused) */
  version?: number;
};

export const FREQUENCY_LABEL: Record<Frequency, string> = { weekly: "Weekly", biweekly: "Every 2 weeks", monthly: "Monthly" };

/** The date after `from` for a schedule. */
export function nextDate(from: Date, f: Frequency) {
  const d = new Date(from);
  if (f === "weekly") d.setDate(d.getDate() + 7);
  else if (f === "biweekly") d.setDate(d.getDate() + 14);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

type RecurringState = {
  /** as last loaded from GET /recurring-bills */
  schedules: Schedule[];
  setSchedules: (schedules: Schedule[]) => void;
  /** optimistic edits while a PATCH / DELETE is in flight */
  patch: (id: string, patch: Partial<Omit<Schedule, "id">>) => void;
  drop: (id: string) => void;
  reset: () => void;
};

/** Recurring bills (live): the API pays due schedules at 07:00. */
export const useRecurringStore = create<RecurringState>()(
  persist(
    (set, get) => ({
      schedules: [],
      setSchedules: (schedules) => set({ schedules }),
      patch: (id, patch) => set({ schedules: get().schedules.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
      drop: (id) => set({ schedules: get().schedules.filter((s) => s.id !== id) }),
      reset: () => set({ schedules: [] }),
    }),
    {
      name: "tribe:recurring",
      storage: persistStorage,
      version: 2,
      migrate: (state, version) => (version < 2 ? { schedules: [] } : state) as RecurringState,
    },
  ),
);
