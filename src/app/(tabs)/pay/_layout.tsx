import { Stack } from "expo-router";
import { TAB_ROOT, useTabStackOptions } from "@/components/stack-options";

// Deep links straight to a pushed screen (Home → More → Token Vault) keep the tab's root
// underneath, so there's always a back button.
export const unstable_settings = { initialRouteName: "index" };

export default function Layout() {
  const options = useTabStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: "Pay", ...TAB_ROOT }} />
      <Stack.Screen name="vault" options={{ title: "Token Vault" }} />
      <Stack.Screen name="gift-cards" options={{ title: "Gift cards" }} />
      <Stack.Screen name="recurring" options={{ title: "Recurring bills" }} />
    </Stack>
  );
}
