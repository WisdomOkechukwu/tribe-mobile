import { Stack } from "expo-router";
import { useTabStackOptions } from "@/components/stack-options";

// Deep links straight to a pushed screen (Home → More → Token Vault) keep the tab's root
// underneath, so there's always a back button.
export const unstable_settings = { initialRouteName: "index" };

export default function Layout() {
  const options = useTabStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ headerShown: false, title: "Home" }} />
      <Stack.Screen name="activity" options={{ title: "History" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
    </Stack>
  );
}
