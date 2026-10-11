import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage } from "zustand/middleware";

/** Shared persistence for every store. Keys are namespaced `tribe:<store>`. */
export const persistStorage = createJSONStorage(() => AsyncStorage);
