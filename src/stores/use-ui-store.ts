import { DEMO_MS } from "@/utils/demo";
import * as Haptics from "expo-haptics";
import { create } from "zustand";

export type ToastTone = "default" | "success" | "danger";
type Toast = { id: number; message: string; tone: ToastTone };

type UiState = {
  toast: Toast | null;
  /** label for the global Tribe loader ("Signing you in…"); null = hidden */
  loading: string | null;
  show: (message: string, tone?: ToastTone) => void;
  hide: () => void;
  setLoading: (label: string | null) => void;
};

let timer: ReturnType<typeof setTimeout> | undefined;

/** Global, non-persisted UI state: the single toast and the full-screen Tribe loader. */
export const useUiStore = create<UiState>()((set) => ({
  toast: null,
  loading: null,
  show: (message, tone = "default") => {
    clearTimeout(timer);
    Haptics.notificationAsync(tone === "danger" ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success).catch(() => {});
    set({ toast: { id: Date.now(), message, tone } });
    timer = setTimeout(() => set({ toast: null }), 2200);
  },
  hide: () => set({ toast: null }),
  setLoading: (loading) => set({ loading }),
}));

/** Shorthand for non-component code: toast("Copied"). */
export const toast = (message: string, tone?: ToastTone) => useUiStore.getState().show(message, tone);

/**
 * Shows the Tribe loader while a request is "in flight" (devnote: one loader across the app),
 * then runs `fn`. The prototype has no backend, so `ms` stands in for the network.
 */
export function withLoader<T>(label: string, fn: () => T, ms: number = DEMO_MS.loader): Promise<T> {
  useUiStore.getState().setLoading(label);
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(fn());
      } catch (e) {
        reject(e);
      } finally {
        useUiStore.getState().setLoading(null);
      }
    }, ms),
  );
}
