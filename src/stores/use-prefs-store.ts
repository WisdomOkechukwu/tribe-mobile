import { Appearance as RNAppearance } from "react-native";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DisplayCurrency } from "@/utils/format";
import { persistStorage } from "./storage";

export type Appearance = "system" | "light" | "dark";
export type NotificationKey = "transactions" | "security" | "cashpoints" | "promos";

type PrefsState = {
  display: DisplayCurrency;
  appearance: Appearance;
  hideBalances: boolean;
  dismissedPromos: string[];
  notifications: Record<NotificationKey, boolean>;
  setDisplay: (d: DisplayCurrency) => void;
  setAppearance: (a: Appearance) => void;
  toggleHideBalances: () => void;
  dismissPromo: (id: string) => void;
  restorePromo: (id: string) => void;
  setNotification: (key: NotificationKey, on: boolean) => void;
};

/** Light / dark / system, app-wide. Applied the moment prefs load (before the first render). */
function applyAppearance(a: Appearance) {
  // not implemented on react-native-web — the browser follows the system scheme there
  if (typeof RNAppearance.setColorScheme !== "function") return;
  RNAppearance.setColorScheme(a === "system" ? "unspecified" : a);
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      display: "NGN",
      appearance: "system",
      hideBalances: false,
      dismissedPromos: [],
      notifications: { transactions: true, security: true, cashpoints: true, promos: false },
      setDisplay: (display) => set({ display }),
      setAppearance: (appearance) => {
        applyAppearance(appearance);
        set({ appearance });
      },
      toggleHideBalances: () => set((s) => ({ hideBalances: !s.hideBalances })),
      dismissPromo: (id) => set((s) => ({ dismissedPromos: [...new Set([...s.dismissedPromos, id])] })),
      restorePromo: (id) => set((s) => ({ dismissedPromos: s.dismissedPromos.filter((d) => d !== id) })),
      setNotification: (key, on) => set((s) => ({ notifications: { ...s.notifications, [key]: on } })),
    }),
    {
      name: "tribe:prefs",
      storage: persistStorage,
      version: 2,
      migrate: (state) => ({ dismissedPromos: [], notifications: { transactions: true, security: true, cashpoints: true, promos: false }, ...(state as object) }) as unknown as PrefsState,
      onRehydrateStorage: () => (state) => {
        if (state) applyAppearance(state.appearance);
      },
    },
  ),
);
