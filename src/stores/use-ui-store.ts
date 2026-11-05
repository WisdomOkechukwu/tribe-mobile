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

/** Loaders that would only flash: a request this quick finishes before the loader shows. */
const SHOW_AFTER_MS = 120;
/** Once shown, stay up this long so it reads as a beat, not a flicker. */
const MIN_VISIBLE_MS = 450;

let loaderSeq = 0;

/**
 * Shows the full-screen Tribe loader (`label`, e.g. "Signing you in…") for exactly as long as
 * `work` (a real request) takes, then resolves or rejects with its result. Quick answers never
 * flash the loader; a shown loader stays up for a short minimum so it doesn't flicker.
 */
export async function runWithLoader<T>(label: string, work: Promise<T> | (() => Promise<T>)): Promise<T> {
  const id = ++loaderSeq;
  let shownAt = 0;
  const timer = setTimeout(() => {
    shownAt = Date.now();
    useUiStore.getState().setLoading(label);
  }, SHOW_AFTER_MS);
  try {
    return await (typeof work === "function" ? work() : work);
  } finally {
    clearTimeout(timer);
    if (shownAt) {
      const left = MIN_VISIBLE_MS - (Date.now() - shownAt);
      if (left > 0) await new Promise((r) => setTimeout(r, left));
    }
    // a newer loader took over: leave it up
    if (id === loaderSeq) useUiStore.getState().setLoading(null);
  }
}
