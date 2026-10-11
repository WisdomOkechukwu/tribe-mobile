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
  plan?: string;
  amountNgn: number;
  payWith: AssetCode;
  frequency: Frequency;
  nextRun: string;
  active: boolean;
  createdAt: string;
  lastPaid?: string;
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

const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString();

function seed(): Schedule[] {
  return [
    { id: "r1", billerId: "mtn", target: "08035550142", plan: "10GB · 30 days", amountNgn: 3_500, payWith: "NGN", frequency: "monthly", nextRun: inDays(12), active: true, createdAt: inDays(-48), lastPaid: inDays(-18) },
    { id: "r2", billerId: "dstv", target: "7023 •••• 3317", plan: "Compact", amountNgn: 15_700, payWith: "NGN", frequency: "monthly", nextRun: inDays(4), active: true, createdAt: inDays(-90), lastPaid: inDays(-26) },
  ];
}

type RecurringState = {
  schedules: Schedule[];
  add: (s: Omit<Schedule, "id" | "createdAt" | "active">) => Schedule;
  toggle: (id: string) => void;
  update: (id: string, patch: Partial<Omit<Schedule, "id">>) => void;
  remove: (id: string) => void;
  /** a payment for this schedule went through — roll the next date forward */
  markPaid: (id: string) => void;
  reset: () => void;
};

/**
 * Recurring bills (live): data, TV and light that renew themselves. In this demo schedules don't
 * debit in the background — they show the next date and can be paid now from Pay › Recurring.
 */
export const useRecurringStore = create<RecurringState>()(
  persist(
    (set, get) => ({
      schedules: seed(),
      add: (s) => {
        const schedule: Schedule = { ...s, id: `r${Date.now().toString(36)}`, createdAt: new Date().toISOString(), active: true };
        set({ schedules: [schedule, ...get().schedules] });
        return schedule;
      },
      toggle: (id) => set({ schedules: get().schedules.map((s) => (s.id === id ? { ...s, active: !s.active } : s)) }),
      update: (id, patch) => set({ schedules: get().schedules.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
      remove: (id) => set({ schedules: get().schedules.filter((s) => s.id !== id) }),
      markPaid: (id) =>
        set({
          schedules: get().schedules.map((s) => (s.id === id ? { ...s, lastPaid: new Date().toISOString(), nextRun: nextDate(new Date(), s.frequency).toISOString() } : s)),
        }),
      reset: () => set({ schedules: seed() }),
    }),
    { name: "tribe:recurring", storage: persistStorage, version: 1 },
  ),
);
