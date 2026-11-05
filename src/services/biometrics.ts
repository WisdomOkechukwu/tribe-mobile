import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

export const BIOMETRIC_LABEL = Platform.OS === "ios" ? "Face ID" : "Fingerprint";
export const BIOMETRIC_ICON = Platform.OS === "ios" ? "faceid" : "fingerprint";

/**
 * Web has no biometrics. In dev we simulate success there so the web build (used for QA and
 * the landing-page screenshots) can walk every flow; production web reports "unavailable".
 */
const SIMULATE = Platform.OS === "web" && __DEV__;

/** Is there a face/fingerprint scanner with something enrolled? */
export async function biometricsAvailable() {
  if (Platform.OS === "web") return SIMULATE;
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

/** Ask the OS to verify the owner. Resolves true only on a real match. */
export async function authenticate(reason: string) {
  if (Platform.OS === "web") return SIMULATE;
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: "Use PIN", disableDeviceFallback: true });
    return r.success;
  } catch {
    return false;
  }
}
