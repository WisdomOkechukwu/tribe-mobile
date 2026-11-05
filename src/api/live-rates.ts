import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import EventSource from "react-native-sse";
import type { AssetCode } from "@/data/assets";
import { useRatesStore } from "@/stores/use-rates-store";
import { useSessionStore } from "@/stores/use-session-store";
import { changeToday, hasRates, ngnPerUsd, rateReady, usdRate } from "@/utils/rates";
import { API_BASE, api, streamAuth } from "./http";
import type { RatesEvent } from "./types";

/**
 * Live rates while a rate screen is open (swap, send, card funding, gift cards, review…).
 *
 * Every screen that calls `useLiveRates()` holds one reference; the SSE connection to
 * `GET rates/stream` opens with the first and closes (after a short grace, so moving between
 * two rate screens doesn't reconnect) when the last one unmounts. `rates.snapshot` and
 * `rates.updated` events go into the (memory-only) rates store; `: heartbeat` comments keep the line
 * open. If the stream drops (or can't open), `GET rates` is polled until it comes back.
 * Rates are never kept on the device: a signed-in session loads them once (`useSessionRates`
 * in the root layout) and every screen waits for the server's (`ready`) before converting.
 */
type RateEvents = "rates.snapshot" | "rates.updated";

const POLL_MS = 10_000;
const RETRY_STREAM_MS = 15_000;
const RELEASE_GRACE_MS = 2_000;

let refs = 0;
let source: EventSource<RateEvents> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;

const store = () => useRatesStore.getState();

function apply(data: string | null, flash: boolean) {
  if (!data) return;
  try {
    store().apply(JSON.parse(data) as RatesEvent, { flash });
  } catch {
    // a malformed event: ignore it, the next one replaces it
  }
}

/** One `GET rates` (shared while in flight). Rejects on failure so callers can retry. */
function fetchRates() {
  inFlight ??= api
    .get<RatesEvent>("rates")
    .then((event) => {
      if (useSessionStore.getState().signedIn) store().apply(event, { flash: store().version > 0 });
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

async function fetchOnce() {
  try {
    await fetchRates();
  } catch {
    // offline or signed out: keep the rates already loaded this session (none = screens wait)
  }
}

function startPolling() {
  if (pollTimer) return;
  store().setSource("polling");
  void fetchOnce();
  pollTimer = setInterval(fetchOnce, POLL_MS);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function closeStream() {
  source?.removeAllEventListeners();
  source?.close();
  source = null;
}

async function openStream() {
  if (source || refs === 0 || !useSessionStore.getState().signedIn) return;
  // getting the token can refresh it, which fails while offline: poll meanwhile and retry later
  let auth: Awaited<ReturnType<typeof streamAuth>>;
  try {
    auth = await streamAuth();
  } catch {
    if (refs === 0) return;
    startPolling();
    if (!retryTimer)
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void openStream();
      }, RETRY_STREAM_MS);
    return;
  }
  const { token, device } = auth;
  if (!token || refs === 0 || source) return;
  const es = new EventSource<RateEvents>(`${API_BASE}/rates/stream`, {
    headers: { Authorization: `Bearer ${token}`, "X-Device-Imei": device, Accept: "text/event-stream" },
    // a stream the server ends cleanly reopens after 5 s; errors (401 once the token expires)
    // are handled below with a fresh token
    pollingInterval: 5_000,
    timeoutBeforeConnection: 0,
  });
  source = es;
  es.addEventListener("open", () => {
    stopPolling();
    store().setSource("stream");
  });
  es.addEventListener("rates.snapshot", (e) => apply(e.data, true));
  es.addEventListener("rates.updated", (e) => apply(e.data, true));
  es.addEventListener("error", () => {
    // dropped, refused (401 after the token expired), or the server restarted:
    // poll meanwhile (polling also refreshes the token), then try the stream again
    closeStream();
    if (refs === 0) return;
    startPolling();
    if (!retryTimer)
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void openStream();
      }, RETRY_STREAM_MS);
  });
}

function acquire() {
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  refs += 1;
  if (refs > 1) return;
  // fetch now rather than wait for the stream's snapshot (the server's rates, never a stored copy)
  void fetchOnce();
  void openStream();
}

function shutdown() {
  closeStream();
  stopPolling();
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  store().setSource("idle");
}

function release() {
  refs = Math.max(0, refs - 1);
  if (refs > 0) return;
  releaseTimer = setTimeout(() => {
    releaseTimer = null;
    if (refs === 0) shutdown();
  }, RELEASE_GRACE_MS);
}

// the app went to the background: drop the connection; reopen when it's back
AppState.addEventListener("change", (status) => {
  if (status === "active") {
    if (refs > 0) {
      void fetchOnce();
      void openStream();
    }
  } else if (refs > 0) {
    closeStream();
    stopPolling();
  }
});
// signing out closes it straight away
useSessionStore.subscribe((s, prev) => {
  if (prev.signedIn && !s.signedIn) shutdown();
});

/**
 * Subscribe a screen to live rates. Re-renders when a new version arrives.
 * `usd(code)`: USD per unit · `ngnPerUsd()` · `change(code)`: today's move in %.
 * `ready`: the server's rates have arrived · `has(codes)`: those assets' rates have (until then `usd` is NaN).
 */
export function useLiveRates() {
  useEffect(() => {
    acquire();
    return release;
  }, []);
  const version = useRatesStore((s) => s.version);
  const stale = useRatesStore((s) => s.stale);
  const updatedAt = useRatesStore((s) => s.updatedAt);
  return { version, stale, updatedAt, ready: hasRates(version), has: (codes: AssetCode | AssetCode[]) => rateReady(codes, version), usd: (code: AssetCode) => usdRate(code, version), ngnPerUsd: () => ngnPerUsd(version), change: (code: AssetCode) => changeToday(code, version) };
}

/** For screens that only show balances in another currency: re-render on new rates, no stream. */
export const useRatesVersion = () => useRatesStore((s) => s.version);

/**
 * Signed in (root layout): load the server's rates once as the session starts, retrying until they
 * arrive, and again when the app comes back to the foreground. No stream: screens that need live
 * prices still call `useLiveRates()`.
 */
export function useSessionRates() {
  const signedIn = useSessionStore((s) => s.signedIn);
  useQuery({ queryKey: ["rates"], queryFn: () => fetchRates().then(() => true), enabled: signedIn, staleTime: 0, retry: true, retryDelay: (n) => Math.min(30_000, 1_000 * 2 ** n) });
}
