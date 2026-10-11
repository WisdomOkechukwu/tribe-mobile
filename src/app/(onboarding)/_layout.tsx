import { Stack } from "expo-router";
import { useColors } from "@/theme";

// Only the tabs' Home is "/"; signup starts at /welcome (two "/" routes left Home blank after onboarding).
export const unstable_settings = { initialRouteName: "welcome" };

export default function OnboardingLayout() {
  const c = useColors();
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: c.bg } }} />;
}
