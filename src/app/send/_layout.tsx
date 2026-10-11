import { Stack } from "expo-router";
import { useFlowStackOptions } from "@/components/stack-options";

// Deep links into a later step (e.g. a scanned QR → /send/amount) keep the recipient step beneath.
export const unstable_settings = { initialRouteName: "index" };

export default function Layout() {
  return <Stack screenOptions={useFlowStackOptions()} />;
}
