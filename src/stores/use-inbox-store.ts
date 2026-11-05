import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { InboxItem } from "@/data/inbox";
import { persistStorage } from "./storage";

type InboxState = {
  /** as last loaded from GET /inbox (the API writes a message for every money movement) */
  items: InboxItem[];
  setItems: (items: InboxItem[]) => void;
  /** optimistic read marks while POST inbox/:id/read is in flight */
  markRead: (id: string) => void;
  markAllRead: () => void;
  reset: () => void;
};

/** In-app notifications (the bell on Home). */
export const useInboxStore = create<InboxState>()(
  persist(
    (set) => ({
      items: [],
      setItems: (items) => set({ items }),
      markRead: (id) => set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: () => set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) })),
      reset: () => set({ items: [] }),
    }),
    {
      name: "tribe:inbox",
      storage: persistStorage,
      version: 2,
      migrate: (state, version) => (version < 2 ? { items: [] } : state) as InboxState,
    },
  ),
);

export const useUnreadCount = () => useInboxStore((s) => s.items.reduce((n, i) => n + (i.read ? 0 : 1), 0));
