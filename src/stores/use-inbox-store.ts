import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedInbox, type InboxItem } from "@/data/inbox";
import { persistStorage } from "./storage";

type InboxState = {
  items: InboxItem[];
  push: (item: Omit<InboxItem, "id" | "date" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  reset: () => void;
};

/** In-app notifications (the bell on Home). Money flows push here when they complete. */
export const useInboxStore = create<InboxState>()(
  persist(
    (set) => ({
      items: seedInbox(),
      push: (item) => set((s) => ({ items: [{ ...item, id: `n${Date.now().toString(36)}`, date: new Date().toISOString(), read: false }, ...s.items].slice(0, 60) })),
      markRead: (id) => set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: () => set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) })),
      reset: () => set({ items: seedInbox() }),
    }),
    { name: "tribe:inbox", storage: persistStorage, version: 1 },
  ),
);

export const useUnreadCount = () => useInboxStore((s) => s.items.reduce((n, i) => n + (i.read ? 0 : 1), 0));
