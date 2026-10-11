import { Stack } from "expo-router";
import { useTabStackOptions } from "@/components/stack-options";

// Deep links straight to a pushed screen (Home → More → Token Vault) keep the tab's root
// underneath, so there's always a back button.
export const unstable_settings = { initialRouteName: "index" };

export default function Layout() {
  const options = useTabStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: "Me", headerTitle: "" }} />
      <Stack.Screen name="edit" options={{ title: "Personal details" }} />
      <Stack.Screen name="qr" options={{ title: "Your Tribe tag" }} />
      <Stack.Screen name="invite" options={{ title: "Invite friends" }} />
      <Stack.Screen name="security" options={{ title: "Security" }} />
      <Stack.Screen name="change-pin" options={{ title: "Transaction PIN", headerTransparent: false, headerStyle: { backgroundColor: options.contentStyle.backgroundColor } }} />
      <Stack.Screen name="lock-pin" options={{ title: "Lock PIN", headerTransparent: false, headerStyle: { backgroundColor: options.contentStyle.backgroundColor } }} />
      <Stack.Screen name="password" options={{ title: "Change password" }} />
      <Stack.Screen name="devices" options={{ title: "Devices" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="statements" options={{ title: "Statements" }} />
    </Stack>
  );
}
