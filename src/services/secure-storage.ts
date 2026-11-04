import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Small secrets (session tokens, the fallback device id) in the Keychain / Keystore.
 * expo-secure-store has no web implementation, so the web build (dev previews only) falls
 * back to AsyncStorage.
 */
const web = Platform.OS === "web";

export async function secureGet(key: string): Promise<string | null> {
  try {
    return web ? await AsyncStorage.getItem(key) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  try {
    if (web) await AsyncStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
  } catch {
    // a full keychain shouldn't crash the app; the session just won't survive a restart
  }
}

export async function secureDelete(key: string): Promise<void> {
  try {
    if (web) await AsyncStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // already gone
  }
}
