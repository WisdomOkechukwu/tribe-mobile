import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage } from "zustand/middleware";

/** Shared persistence for every store. Keys are namespaced `tribe:<store>`. */
export const persistStorage = createJSONStorage(() => AsyncStorage);

/**
 * Stores that used to be persisted but now live in memory only (rates, balances, history,
 * referral balance): drop what older builds left on the device. Idempotent, so it runs every launch.
 */
AsyncStorage.multiRemove(["tribe:rates", "tribe:wallet", "tribe:referrals"]).catch(() => {});
