import { Stack } from "expo-router";
import { useColors } from "@/theme";

// Signed-out group: intro carousel → create account / sign in / forgot password.
export const unstable_settings = { initialRouteName: "intro" };

export default function AuthLayout() {
  const c = useColors();
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: c.bg } }} />;
}
