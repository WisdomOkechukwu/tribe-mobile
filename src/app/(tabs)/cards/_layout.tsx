import { Stack } from "expo-router";
import { TAB_ROOT, useTabStackOptions } from "@/components/stack-options";

// Deep links straight to a pushed screen (Home → More → Token Vault) keep the tab's root
// underneath, so there's always a back button.
export const unstable_settings = { initialRouteName: "index" };

export default function Layout() {
  const options = useTabStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: "Cards", ...TAB_ROOT }} />
      <Stack.Screen name="details" options={{ title: "Card details" }} />
      <Stack.Screen name="all" options={{ title: "My cards" }} />
      <Stack.Screen name="wallet" options={{ title: "Wallet & payments" }} />
    </Stack>
  );
}
