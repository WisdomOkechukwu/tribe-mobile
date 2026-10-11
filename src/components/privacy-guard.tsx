import * as ScreenCapture from "expo-screen-capture";
import { useEffect } from "react";
import { toast } from "@/stores/use-ui-store";

/**
 * Render on any screen showing secrets (Cashpoint codes, electricity tokens, card number/CVV,
 * gift card codes). While mounted, the OS blanks the app in screenshots and screen recordings
 * (iOS + Android), and iOS blurs it in the app switcher. Render it conditionally to protect only
 * when secrets are actually on screen.
 */
export function PrivacyGuard() {
  ScreenCapture.usePreventScreenCapture("tribe-sensitive");
  ScreenCapture.useScreenshotListener(() => toast("Sensitive details are hidden in screenshots"));
  useEffect(() => {
    ScreenCapture.enableAppSwitcherProtectionAsync(0.8).catch(() => {});
    return () => {
      ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, []);
  return null;
}
