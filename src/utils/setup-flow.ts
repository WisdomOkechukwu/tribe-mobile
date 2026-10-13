import { router, type Href } from "expo-router";
import type { IconName } from "@/components/icon";
import { useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";

export type SetupTaskId = "phone" | "pin" | "identity" | "profile";

export type SetupTask = { id: SetupTaskId; title: string; body: string; icon: IconName; href: Href; done: boolean; /** rough minutes, for "about N min left" */ mins: number; /** what finishing it unlocks */ unlocks: string };

type SessionSnapshot = Pick<ReturnType<typeof useSessionStore.getState>, "phoneVerified" | "pin" | "kycTier" | "world" | "globalAccounts">;

/**
 * Everything setup can still ask for, in order. Nothing here blocks the app: new users land on
 * Home right after picking a world and finish these from the "Finish setup" card (or just in time:
 * the PIN is created on the first payment, ID checks when a feature needs them).
 */
export function setupTasks(s: SessionSnapshot = useSessionStore.getState()): SetupTask[] {
  const tasks: SetupTask[] = [
    { id: "phone", title: "Verify your phone", body: "A quick code by SMS", icon: "phone", href: "/setup/phone", done: s.phoneVerified, mins: 0.5, unlocks: "Keeps your account safe" },
    { id: "pin", title: "Create your payment PIN", body: "4 digits that approve payments", icon: "key", href: "/setup/pin-intro", done: !!s.pin, mins: 0.5, unlocks: "Send, swap and pay bills" },
    { id: "identity", title: "Verify your identity", body: "Your BVN, matched to your name", icon: "verified", href: "/setup/bvn", done: s.kycTier >= 1, mins: 1, unlocks: "Higher limits and dollar cards" },
  ];
  if (s.world === "global") tasks.push({ id: "profile", title: "Get USD, GBP & EUR accounts", body: "Six quick questions", icon: "globe", href: "/setup/profile", done: s.globalAccounts !== "none", mins: 2, unlocks: "Get paid from abroad" });
  return tasks;
}

/** Leave setup and go back to wherever the app was (Home). */
export const exitSetup = () => router.dismissTo("/");

/** Next unfinished task, or close setup with a little cheer when everything's done. */
export function continueSetup() {
  const next = setupTasks().find((t) => !t.done);
  if (next) router.push(next.href);
  else {
    exitSetup();
    toast("You're all set up", "success");
  }
}
