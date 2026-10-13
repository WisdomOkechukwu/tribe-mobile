import { Stack } from "expo-router";
import { useColors } from "@/theme";

/**
 * Finish setup: phone, payment PIN (+ Face ID), identity, global-accounts questions. Opened from
 * Home as a modal; every step can be skipped and each finished step hands on to the next
 * (utils/setup-flow.ts). None of it is required to use the app.
 */
export default function SetupLayout() {
  const c = useColors();
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: c.bg } }} />;
}
