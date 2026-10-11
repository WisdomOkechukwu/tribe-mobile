import { useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";

/**
 * KeyboardAvoidingView that works inside sheets and modals. RN's KAV compares the keyboard's
 * screen Y with its *parent-relative* frame, so inside a page sheet (which starts ~120pt down
 * the screen) it under-pads and the CTA hides behind the keyboard. We measure where the frame
 * really sits on screen and pass that as the offset.
 */
export function KeyboardFrame({ children, backgroundColor }: { children: ReactNode; backgroundColor: string }) {
  const ref = useRef<View>(null);
  const [top, setTop] = useState(0);
  return (
    <View ref={ref} style={{ flex: 1, backgroundColor }} onLayout={() => ref.current?.measureInWindow((_x, y) => setTop(y))}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={top} style={{ flex: 1 }}>
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}
