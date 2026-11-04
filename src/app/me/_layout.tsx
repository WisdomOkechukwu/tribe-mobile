import { router, Stack } from "expo-router";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { useTabStackOptions } from "@/components/stack-options";
import { useColors } from "@/theme";

// Deep links straight to a pushed screen (Home → More → Token Vault) keep the tab's root
// underneath, so there's always a back button.
export const unstable_settings = { initialRouteName: "index" };

export default function Layout() {
  const options = useTabStackOptions();
  const c = useColors();
  return (
    <Stack screenOptions={options}>
      {/* Me isn't a tab any more: it's opened over the tabs (avatar on Home), so its first screen needs its own way back */}
      <Stack.Screen
        name="index"
        options={{
          title: "Me",
          headerTitle: "",
          headerLeft: () => (
            <PressableScale onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={12} accessibilityLabel="Back" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
              <Icon name="back" size={16} color={c.text} />
            </PressableScale>
          ),
        }}
      />
      <Stack.Screen name="edit" options={{ title: "Personal details" }} />
      <Stack.Screen name="qr" options={{ title: "Your Tribe tag" }} />
      <Stack.Screen name="invite" options={{ title: "Invite friends" }} />
      <Stack.Screen name="security" options={{ title: "Security" }} />
      <Stack.Screen name="change-pin" options={{ title: "Transaction PIN", headerTransparent: false, headerStyle: { backgroundColor: options.contentStyle.backgroundColor } }} />
      <Stack.Screen name="password" options={{ title: "Change password" }} />
      <Stack.Screen name="devices" options={{ title: "Devices" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="statements" options={{ title: "Statements" }} />
    </Stack>
  );
}
