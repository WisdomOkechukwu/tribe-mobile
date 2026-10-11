import { Stack } from "expo-router";
import { useFlowStackOptions } from "@/components/stack-options";

export const unstable_settings = { initialRouteName: "new" };

export default function Layout() {
  return <Stack screenOptions={useFlowStackOptions()} />;
}
