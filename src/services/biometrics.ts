import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
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

/**
 * Face ID approves payments by unlocking the PIN, which the API still checks: after a payment
 * approved with the typed PIN, it is kept in the Keychain / Keystore behind the OS biometric
 * prompt (`requireAuthentication`), and reading it back IS the Face ID check. Never on web.
 */
const BIO_PIN_KEY = "tribe.biometric-pin";

export async function rememberPinForBiometrics(pin: string) {
  if (Platform.OS === "web") return;
  try {
    await SecureStore.setItemAsync(BIO_PIN_KEY, pin, { requireAuthentication: true, keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY });
  } catch {
    // no passcode / biometrics changed: Face ID just won't offer to approve
  }
}

/** The PIN after a successful Face ID / fingerprint prompt, or null (cancelled, not saved yet). */
export async function pinFromBiometrics(reason: string): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    return await SecureStore.getItemAsync(BIO_PIN_KEY, { requireAuthentication: true, authenticationPrompt: reason });
  } catch {
    return null;
  }
}

export async function forgetBiometricPin() {
  try {
    await SecureStore.deleteItemAsync(BIO_PIN_KEY);
  } catch {
    // already gone
  }
}
