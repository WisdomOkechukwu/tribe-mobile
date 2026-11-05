import * as Crypto from "expo-crypto";
import { getDeviceId } from "@/services/device-id";
import { isOnline, OFFLINE_MESSAGE } from "@/services/network";
import { useSessionStore, type SignOutReason, type Tokens } from "@/stores/use-session-store";

/**
 * The one way the app talks to the Tribe API (`/api/mobile/v1`).
 *
 * - Base URL from `EXPO_PUBLIC_API_URL` (see `.env.example`; the Android emulator reaches the
 *   host as `10.0.2.2`, a real phone needs the computer's LAN IP).
 * - Every request carries `X-Device-Imei`; signed-in ones carry `Authorization: Bearer …`.
 * - Every POST/PATCH/PUT/DELETE carries an `Idempotency-Key`. Pass `idempotencyKey` to reuse one
 *   across retries (money flows persist theirs before sending, see use-flow-store).
 * - An expired access token is refreshed through ONE in-flight `POST auth/refresh`, then the
 *   request is retried once.
 * - `401 DEVICE_NOT_ACTIVE` (this phone was replaced) and a dead refresh token end the session.
 * - Offline: nothing is sent; the caller gets `ApiError` with code `OFFLINE`.
 */
export const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8082").replace(/\/+$/, "");
export const API_BASE = `${API_ORIGIN}/api/mobile/v1`;

const TIMEOUT_MS = 20_000;
/** refresh this long before the access token actually expires */
const EXPIRY_SLACK_MS = 30_000;

export class ApiError extends Error {
  readonly status: number;
  /** the API's `code` (WRONG_PIN, INSUFFICIENT_FUNDS…), or OFFLINE / NETWORK / TIMEOUT from the app */
  readonly code: string;
  /** 422 form errors, per field */
  readonly fieldErrors: Record<string, string[]>;
  readonly data: unknown;
  constructor(status: number, code: string, message: string, fieldErrors: Record<string, string[]> = {}, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.data = data;
  }
  /** the first message for a field, for a form hint */
  field(name: string) {
    return this.fieldErrors[name]?.[0];
  }
  /** the request may not have reached the server: safe to retry with the same Idempotency-Key */
  get retryable() {
    return this.status === 0 || this.status >= 500 || this.code === "REQUEST_IN_PROGRESS";
  }
}

/** Anything thrown → a sentence to show. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export type ApiResponse<T> = { data: T; message: string; meta: Record<string, unknown> | undefined; status: number; replay: boolean };

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
export type RequestOptions = {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** default true: send the access token (and refresh it when needed) */
  auth?: boolean;
  /** reuse a key across retries; mutating requests get a fresh one otherwise */
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export const newIdempotencyKey = () => Crypto.randomUUID();

// ─── session hooks ─────────────────────────────────────────────────────────

type SessionEndedHandler = (reason: SignOutReason) => void;
let onSessionEnded: SessionEndedHandler = (reason) => useSessionStore.getState().signOut(reason);
/** `api/auth.ts` installs the full sign-out (clear caches, reset stores, tell the user). */
export const setSessionEndedHandler = (handler: SessionEndedHandler) => {
  onSessionEnded = handler;
};

let refreshing: Promise<Tokens | null> | null = null;

const expiresSoon = (tokens: Tokens) => new Date(tokens.access_token_expires_at).getTime() - EXPIRY_SLACK_MS <= Date.now();

/** One refresh at a time: every request waiting on a new token shares this promise. */
function refreshTokens(): Promise<Tokens | null> {
  refreshing ??= (async () => {
    const current = useSessionStore.getState().tokens;
    if (!current) return null;
    try {
      const res = await send<{ tokens: Tokens }>("auth/refresh", { method: "POST", body: { refresh_token: current.refresh_token }, auth: false });
      // signed out while the refresh was in flight: drop the new tokens
      if (!useSessionStore.getState().signedIn) return null;
      useSessionStore.getState().setTokens(res.data.tokens);
      return res.data.tokens;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        onSessionEnded(error.code === "DEVICE_NOT_ACTIVE" ? "device-replaced" : "session-expired");
        return null;
      }
      throw error;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function accessToken(): Promise<string | null> {
  const tokens = useSessionStore.getState().tokens;
  if (!tokens) return null;
  if (!expiresSoon(tokens)) return tokens.access_token;
  return (await refreshTokens())?.access_token ?? null;
}

// ─── the request ───────────────────────────────────────────────────────────

const buildUrl = (path: string, query?: RequestOptions["query"]) => {
  const url = `${API_BASE}/${path.replace(/^\/+/, "")}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `${url}?${params.join("&")}` : url;
};

async function send<T>(path: string, options: RequestOptions, token?: string | null): Promise<ApiResponse<T>> {
  if (!isOnline()) throw new ApiError(0, "OFFLINE", OFFLINE_MESSAGE);
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json", "X-Device-Imei": await getDeviceId() };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (method !== "GET") headers["Idempotency-Key"] = options.idempotencyKey ?? newIdempotencyKey();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const outer = options.signal;
  const forward = () => controller.abort();
  outer?.addEventListener("abort", forward);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: controller.signal });
  } catch {
    if (outer?.aborted) throw new ApiError(0, "CANCELLED", "Cancelled.");
    if (controller.signal.aborted) throw new ApiError(0, "TIMEOUT", "Tribe is taking too long to answer. Try again.");
    throw new ApiError(0, "NETWORK", isOnline() ? "We couldn't reach Tribe. Check your connection and try again." : OFFLINE_MESSAGE);
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", forward);
  }

  let json: { success?: boolean; message?: string; data?: T; meta?: Record<string, unknown>; code?: string; errors?: Record<string, string[]> } = {};
  try {
    json = await response.json();
  } catch {
    // an empty or non-JSON body (a proxy error page): handled by the status below
  }
  if (!response.ok || json.success === false) {
    const status = response.status;
    const fallback = status >= 500 ? "Something went wrong on our side. Please try again." : "That didn't work. Please try again.";
    throw new ApiError(status, json.code ?? (status === 401 ? "UNAUTHENTICATED" : `HTTP_${status}`), json.message || fallback, json.errors ?? {}, json.data);
  }
  return { data: json.data as T, message: json.message ?? "", meta: json.meta, status: response.status, replay: response.headers.get("Idempotent-Replay") === "true" };
}

/** Call the API. Resolves with the envelope's `data` (+ message/meta); rejects with `ApiError`. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const auth = options.auth ?? true;
  if (!auth) return send<T>(path, options);

  const token = await accessToken();
  if (!token) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in again.");
  try {
    return await send<T>(path, options, token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    if (error.code === "DEVICE_NOT_ACTIVE") {
      onSessionEnded("device-replaced");
      throw error;
    }
    // the token died early (server restart, clock skew): refresh once and retry the same request
    const fresh = await refreshTokens();
    if (!fresh) throw error;
    try {
      return await send<T>(path, options, fresh.access_token);
    } catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401) onSessionEnded(retryError.code === "DEVICE_NOT_ACTIVE" ? "device-replaced" : "session-expired");
      throw retryError;
    }
  }
}

/** Shorthands that return just `data`. */
export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) => request<T>(path, { query, signal }).then((r) => r.data),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) => request<T>(path, { ...options, method: "POST", body: body ?? {} }).then((r) => r.data),
  patch: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) => request<T>(path, { ...options, method: "PATCH", body: body ?? {} }).then((r) => r.data),
  delete: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) => request<T>(path, { ...options, method: "DELETE", body }).then((r) => r.data),
};

/** The current access token for the rate stream (SSE sets its own headers). */
export const streamAuth = async () => ({ token: await accessToken(), device: await getDeviceId() });
