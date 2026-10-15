import { Platform } from "react-native";
import { fonts, useColors } from "@/theme";
import { headerTitle } from "./header-title";

/**
 * Screen options for each tab's stack: an OPAQUE header (screen background), so content never
 * scrolls "into" a see-through bar. Pushed screens keep the title inline, on the same row as the
 * back button; only a tab's root screen opts into a large title (see `TAB_ROOT`).
 */
// iOS keeps a custom `headerTitle` view on the bar even under the large title, so the roots use the
// native title text instead: it stays hidden until the large title scrolls away.
export const TAB_ROOT = Platform.OS === "ios" ? ({ headerLargeTitleEnabled: true, headerTitle: undefined } as const) : ({ headerLargeTitleEnabled: false } as const);

export function useTabStackOptions() {
  const c = useColors();
  return {
    headerLargeTitleEnabled: false,
    headerTransparent: false,
    headerShadowVisible: true,
    headerLargeTitleShadowVisible: false,
    headerLargeStyle: { backgroundColor: c.bg },
    headerStyle: { backgroundColor: c.bg },
    headerTitleStyle: { fontFamily: fonts.semibold, color: c.text },
    headerLargeTitleStyle: { fontFamily: fonts.display, color: c.text },
    headerTintColor: c.brandText,
    headerBackButtonDisplayMode: "minimal",
    headerTitle,
    contentStyle: { backgroundColor: c.bg },
  } as const;
}

/** Screen options for the stack inside a modal flow (send, swap, bills…). */
export function useFlowStackOptions() {
  const c = useColors();
  return {
    headerShadowVisible: false,
    headerStyle: { backgroundColor: c.bg },
    headerTitleStyle: { fontFamily: fonts.semibold, color: c.text },
    headerTintColor: c.brandText,
    headerBackButtonDisplayMode: "minimal",
    headerTitle,
    contentStyle: { backgroundColor: c.bg },
  } as const;
}
