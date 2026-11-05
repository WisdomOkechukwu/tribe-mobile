import { Stack } from "expo-router";
import { useTabStackOptions } from "@/components/stack-options";
import { useSupportSocket } from "@/api/support";

/**
 * Help & chat: the chats list, a new chat, and one conversation with the Tribe team. The support
 * WebSocket stays open while any of these is on screen, so replies land live everywhere here.
 */
export default function Layout() {
  const options = useTabStackOptions();
  useSupportSocket();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ headerShown: false, title: "Help & chat" }} />
      <Stack.Screen name="new" options={{ title: "New chat" }} />
      <Stack.Screen name="[id]" options={{ title: "Chat" }} />
    </Stack>
  );
}
