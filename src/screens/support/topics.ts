import type { IconName } from "@/components/icon";

/** Quick ways into a chat: each becomes the chat's subject. */
export const TOPICS: { id: string; label: string; subject: string; icon: IconName }[] = [
  { id: "payment", label: "A payment", subject: "Question about a payment", icon: "send" },
  { id: "card", label: "My card", subject: "Help with my card", icon: "card" },
  { id: "verify", label: "Verification", subject: "Help with verification", icon: "verified" },
  { id: "other", label: "Something else", subject: "I need help", icon: "help" },
];

export const topicById = (id?: string) => TOPICS.find((t) => t.id === id);
