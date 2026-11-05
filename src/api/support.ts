import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import { create } from "zustand";
import { useSessionStore } from "@/stores/use-session-store";
import { API_ORIGIN, api, streamAuth } from "./http";
import { queryClient } from "./query-client";

/**
 * Support chat (GET/POST support/tickets). A ticket is one conversation with the Tribe team:
 * `open` (waiting on Tribe), `pending` (Tribe replied, waiting on you), `resolved`. Replying to a
 * resolved ticket opens it again. Live updates come over a WebSocket (GET support/stream, see
 * useSupportSocket); polling is only the fallback while it's down.
 */

export type TicketStatus = "open" | "pending" | "resolved";
export type Ticket = { id: string; subject: string; status: TicketStatus; transactionId: string | null; createdAt: string; updatedAt: string };
export type ChatMessage = { id: string; from: "me" | "tribe" | "system"; author: string; body: string; createdAt: string; sending?: boolean };

type ThreadResource = { id: string; subject: string; status: string; transaction_id: string | null; created_at: string; updated_at: string };
type MessageResource = { id: string; sender_type: string; author_name: string; body: string; created_at: string };

const toTicket = (t: ThreadResource): Ticket => ({
  id: t.id,
  subject: t.subject,
  status: t.status === "resolved" ? "resolved" : t.status === "pending" ? "pending" : "open",
  transactionId: t.transaction_id,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
});
const toMessage = (m: MessageResource): ChatMessage => ({
  id: m.id,
  from: m.sender_type === "customer" ? "me" : m.sender_type === "system" ? "system" : "tribe",
  author: m.author_name,
  body: m.body,
  createdAt: m.created_at,
});

const TICKETS = ["support", "tickets"] as const;
const ticketKey = (id: string) => ["support", "ticket", id] as const;

/** Every chat, still-going ones first (open, then waiting on you), newest activity first. */
export function useTickets() {
  const signedIn = useSessionStore((s) => s.signedIn);
  return useQuery({
    queryKey: TICKETS,
    enabled: signedIn,
    queryFn: async ({ signal }) => {
      const list = (await api.get<ThreadResource[] | null>("support/tickets", undefined, signal)) ?? [];
      return list.map(toTicket);
    },
  });
}

/** One chat and its messages. While the socket is down it polls every 5 s; while it's live, it doesn't need to. */
export function useTicket(id: string) {
  const signedIn = useSessionStore((s) => s.signedIn);
  const live = useSupportLive((s) => s.live);
  return useQuery({
    queryKey: ticketKey(id),
    enabled: signedIn && !!id,
    refetchInterval: live ? false : 5000,
    queryFn: async ({ signal }) => {
      const r = await api.get<{ thread: ThreadResource; messages: MessageResource[] | null }>(`support/tickets/${id}`, undefined, signal);
      return { ticket: toTicket(r.thread), messages: (r.messages ?? []).map(toMessage) };
    },
  });
}

/** Opens a new chat with its first message. Returns the ticket id (the chat to go to). */
export async function startChat(subject: string, body: string, transactionId?: string) {
  const thread = await api.post<ThreadResource>("support/tickets", { subject, body, transaction_id: transactionId });
  queryClient.invalidateQueries({ queryKey: TICKETS });
  return thread.id;
}

/**
 * Sends a message. It shows straight away (marked `sending`), and the chat is reloaded from the
 * API once it's in; if sending fails the optimistic bubble is taken back out.
 */
export async function sendMessage(id: string, body: string, author: string) {
  const key = ticketKey(id);
  const draft: ChatMessage = { id: `local-${Date.now()}`, from: "me", author, body, createdAt: new Date().toISOString(), sending: true };
  queryClient.setQueryData<{ ticket: Ticket; messages: ChatMessage[] }>(key, (old) => (old ? { ...old, messages: [...old.messages, draft] } : old));
  try {
    await api.post(`support/tickets/${id}/messages`, { body });
  } catch (e) {
    queryClient.setQueryData<{ ticket: Ticket; messages: ChatMessage[] }>(key, (old) => (old ? { ...old, messages: old.messages.filter((m) => m.id !== draft.id) } : old));
    throw e;
  } finally {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: TICKETS });
  }
}

// ─── live: the support WebSocket ───────────────────────────────────────

/** Whether the support socket is connected right now (the chat shows a "live" dot). */
export const useSupportLive = create<{ live: boolean }>()(() => ({ live: false }));

/** Socket events closer together than this are applied as one refetch per chat. */
const BATCH_MS = 250;

/**
 * Keeps the support WebSocket open while mounted (the support screens mount it) and the app is in
 * the foreground. Each event names a chat; that chat and the list reload, so an agent's reply or a
 * status change appears at once. Drops reconnect with a growing wait (1 s up to 15 s).
 */
export function useSupportSocket() {
  const signedIn = useSessionStore((s) => s.signedIn);
  useEffect(() => {
    if (!signedIn) return;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let stopped = false;
    const pending = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRetry = () => {
      if (stopped || retry) return;
      attempt += 1;
      retry = setTimeout(() => {
        retry = null;
        void connect();
      }, Math.min(15000, 1000 * 2 ** Math.min(attempt, 4)));
    };

    const connect = async () => {
      if (stopped || AppState.currentState !== "active") return;
      // getting the token can refresh it, which fails while offline: try again later, quietly
      let auth: Awaited<ReturnType<typeof streamAuth>>;
      try {
        auth = await streamAuth();
      } catch {
        scheduleRetry();
        return;
      }
      const { token, device } = auth;
      if (stopped || !token) return;
      const url = `${API_ORIGIN.replace(/^http/, "ws")}/api/mobile/v1/support/stream`;
      // React Native's WebSocket takes headers as a third argument (the browser one doesn't)
      const Socket = WebSocket as unknown as new (url: string, protocols?: string[] | null, options?: { headers: Record<string, string> }) => WebSocket;
      const ws = new Socket(url, null, { headers: { Authorization: `Bearer ${token}`, "X-Device-Imei": device } });
      socket = ws;
      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(String(e.data)) as { type: string; thread_id?: string };
          if (event.type === "connected") {
            attempt = 0;
            useSupportLive.setState({ live: true });
            return;
          }
          // a reply and a status change often land together: collect the burst, then refetch
          // each chat once (and the list once) instead of once per event
          if (event.thread_id) pending.add(event.thread_id);
          if (!flushTimer)
            flushTimer = setTimeout(() => {
              flushTimer = null;
              for (const threadId of pending) queryClient.invalidateQueries({ queryKey: ticketKey(threadId) });
              pending.clear();
              queryClient.invalidateQueries({ queryKey: TICKETS });
            }, BATCH_MS);
        } catch {
          // not JSON: ignore
        }
      };
      ws.onclose = () => {
        useSupportLive.setState({ live: false });
        if (socket === ws) socket = null;
        scheduleRetry();
      };
      ws.onerror = () => ws.close();
    };

    // back in the foreground: reconnect now, and catch up on anything missed while away
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && !socket) {
        if (retry) clearTimeout(retry);
        retry = null;
        attempt = 0;
        queryClient.invalidateQueries({ queryKey: ["support"] });
        void connect();
      } else if (state !== "active") socket?.close();
    });
    void connect();
    return () => {
      stopped = true;
      sub.remove();
      if (retry) clearTimeout(retry);
      socket?.close();
      if (flushTimer) clearTimeout(flushTimer);
      useSupportLive.setState({ live: false });
    };
  }, [signedIn]);
}
