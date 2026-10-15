import type { ReactNode } from "react";
import { create } from "zustand";
import type { IconName } from "@/components/icon";

/**
 * Every picker, menu, confirm and success pop-up in the app is OURS (no ActionSheetIOS /
 * Alert): one overlay at a time, rendered by <OverlayHost/> above everything (incl. modals).
 */
export type SelectOption = { value: string; label: string; sub?: string; leading?: ReactNode; trailing?: string; destructive?: boolean };
/** A row in an action menu (⋯): an icon disc, a label, an optional line under it. */
export type MenuItem = { value: string; label: string; sub?: string; icon: IconName; destructive?: boolean };
type Tone = "brand" | "danger" | "success" | "accent";
type Action = { label: string; onPress?: () => void; tone?: "primary" | "secondary" | "destructive" };

export type Overlay =
  | { id: number; kind: "select"; title: string; subtitle?: string; options: SelectOption[]; value?: string; onSelect: (value: string) => void }
  | { id: number; kind: "menu"; title: string; subtitle?: string; leading?: ReactNode; items: MenuItem[]; onSelect: (value: string) => void }
  | { id: number; kind: "sheet"; title?: string; subtitle?: string; leading?: ReactNode; content: (close: (after?: () => void) => void) => ReactNode }
  | { id: number; kind: "confirm"; icon?: IconName; tone?: Tone; title: string; body?: string; confirmLabel: string; cancelLabel?: string; destructive?: boolean; onConfirm: () => void }
  | { id: number; kind: "notice"; icon?: IconName; tone?: Tone; title: string; body?: string; actions?: Action[] };

type OverlayState = {
  current: Overlay | null;
  open: (o: Overlay) => void;
  close: () => void;
};

export const useOverlayStore = create<OverlayState>()((set) => ({
  current: null,
  open: (current) => set({ current }),
  close: () => set({ current: null }),
}));

type WithoutMeta<T> = T extends Overlay ? Omit<T, "id" | "kind"> : never;
const open = (o: Overlay) => useOverlayStore.getState().open(o);

export const overlay = {
  select: (o: WithoutMeta<Extract<Overlay, { kind: "select" }>>) => open({ ...o, id: Date.now(), kind: "select" }),
  /** actions, not choices: no radio, the sheet closes and runs the one you tapped */
  menu: (o: WithoutMeta<Extract<Overlay, { kind: "menu" }>>) => open({ ...o, id: Date.now(), kind: "menu" }),
  sheet: (o: WithoutMeta<Extract<Overlay, { kind: "sheet" }>>) => open({ ...o, id: Date.now(), kind: "sheet" }),
  confirm: (o: WithoutMeta<Extract<Overlay, { kind: "confirm" }>>) => open({ ...o, id: Date.now(), kind: "confirm" }),
  notice: (o: WithoutMeta<Extract<Overlay, { kind: "notice" }>>) => open({ ...o, id: Date.now(), kind: "notice" }),
  close: () => useOverlayStore.getState().close(),
};
