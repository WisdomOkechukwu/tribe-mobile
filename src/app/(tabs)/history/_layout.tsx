import { Stack } from "expo-router";
import { useTabStackOptions } from "@/components/stack-options";

/** History tab: every transaction, with the same filters as Home › See all. */
export default function Layout() {
  const options = useTabStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: "History" }} />
    </Stack>
  );
}
