import type { ComponentProps, ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useServiceOff, type ServiceCode } from "@/utils/services";
import { ListRow } from "./list";

/**
 * Wraps a tile, card or button an admin has switched off (`useServiceOff`): greyed out and not
 * tappable, with the reason read out to screen readers. With no message it's a plain View, so
 * the layout is the same either way.
 */
export function ServiceOff({ message, style, children }: { message: string | null; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <View style={[style, message ? { opacity: 0.45 } : null]} pointerEvents={message ? "none" : "auto"} accessibilityState={message ? { disabled: true } : undefined} accessibilityHint={message ?? undefined}>
      {children}
    </View>
  );
}

/**
 * A list row that leads into a service: greyed out and not tappable once an admin has switched
 * ALL of `services` off. For rows built in a loop, where the hook can't be called per row.
 */
export function ServiceRow({ services, ...row }: ComponentProps<typeof ListRow> & { services: ServiceCode[] }) {
  return <ListRow {...row} off={useServiceOff(...services)} />;
}
