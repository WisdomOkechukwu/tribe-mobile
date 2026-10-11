import type { ReactNode } from "react";
import { Platform } from "react-native";
import { Text } from "./text";

/**
 * `headerTitle` for every native stack. iOS centres the system back chevron on the bar, but
 * Poppins' tall line box rendered our titles a touch low next to it, so headers looked
 * misaligned. A fixed line height and a small lift put the title on the chevron's centre line.
 */
export const headerTitle = ({ children }: { children: ReactNode }) => (
  <Text variant="headline" numberOfLines={1} style={{ lineHeight: 22, includeFontPadding: false, transform: [{ translateY: Platform.OS === "ios" ? -1.5 : 0 }] }}>
    {children}
  </Text>
);
