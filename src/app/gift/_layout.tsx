import { Stack } from "expo-router";
import { useFlowStackOptions } from "@/components/stack-options";

export default function Layout() {
  return <Stack screenOptions={useFlowStackOptions()} />;
}
