import * as Application from "expo-application";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { secureGet, secureSet } from "./secure-storage";

/**
 * The phone's id for the single-device rule (`X-Device-Imei`). iOS and modern Android don't let
 * apps read the real IMEI, so this is the most stable id the OS allows:
 * Android ID on Android, identifierForVendor on iOS, else a UUID kept in SecureStore
 * (web, simulators that return nothing). Read once, then cached for the app's lifetime.
 */
const FALLBACK_KEY = "tribe.device-id";

let cached: string | null = null;
let loading: Promise<string> | null = null;

async function readNativeId(): Promise<string | null> {
  try {
    if (Platform.OS === "android") return Application.getAndroidId() || null;
    if (Platform.OS === "ios") return await Application.getIosIdForVendorAsync();
  } catch {
    // fall through to the stored id
  }
  return null;
}

async function load(): Promise<string> {
  const native = await readNativeId();
  if (native) return `${Platform.OS}-${native}`;
  const stored = await secureGet(FALLBACK_KEY);
  if (stored) return stored;
  const fresh = `${Platform.OS}-${Crypto.randomUUID()}`;
  await secureSet(FALLBACK_KEY, fresh);
  return fresh;
}

export function getDeviceId(): Promise<string> {
  if (cached) return Promise.resolve(cached);
  loading ??= load().then((id) => {
    cached = id;
    return id;
  });
  return loading;
}

/** The phone as the backend's `device` object (sign-up and sign-in). */
export async function deviceInfo() {
  return {
    imei: await getDeviceId(),
    name: (Device.deviceName ?? Device.modelName ?? "Phone").slice(0, 100),
    platform: Platform.OS,
    model: (Device.modelName ?? "").slice(0, 100),
    app_version: (Application.nativeApplicationVersion ?? "dev").slice(0, 32),
  };
}
