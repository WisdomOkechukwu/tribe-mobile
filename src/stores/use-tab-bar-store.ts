import { create } from "zustand";

/**
 * Whether the tab bar is hidden (a pushed screen, not a tab root). Written by <TabBarDriver/>,
 * which alone follows the route; the tab bar subscribes to just this boolean, so navigating
 * never re-renders the tab navigator (it used to on every push and modal).
 */
export const useTabBarStore = create<{ hidden: boolean; setHidden: (v: boolean) => void }>()((set) => ({
  hidden: false,
  setHidden: (hidden) => set({ hidden }),
}));
