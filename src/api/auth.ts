import { router } from "expo-router";
import { deviceInfo } from "@/services/device-id";
import { clearUserData } from "@/stores/reset";
import { useSessionStore, type ProfileResource, type SignOutReason, type Tokens, type World } from "@/stores/use-session-store";
import type { SignupDraft } from "@/stores/use-signup-store";
import { toast } from "@/stores/use-ui-store";
import { api, ApiError, request, setSessionEndedHandler } from "./http";
import { queryClient } from "./query-client";
import { resources } from "./client";

/**
 * Sign-up, sign-in (including the new-phone check), sign-out, and the account settings that
 * live on the profile (PIN, phone, password, KYC, onboarding). Screens call these; they keep the
 * session store in step with the API.
 */

const SIGN_OUT_TOAST: Partial<Record<SignOutReason, string>> = {
  "device-replaced": "You signed in on another phone",
  "session-expired": "Your session ended. Sign in again.",
};

/**
 * Forget the user's data: stores first, then the query cache. The other way round, each store
 * reset is mirrored back into the cache (`sync`) as fresh empty data, so the next sign-in showed a
 * $0, NGN-only Home until a pull-to-refresh.
 */
function forgetUserData() {
  clearUserData();
  queryClient.clear();
}

/** Drop the session on this phone: tokens, cached data, queries. */
export function endSessionLocally(reason: SignOutReason) {
  const was = useSessionStore.getState().signedIn;
  useSessionStore.getState().signOut(reason);
  forgetUserData();
  if (was && SIGN_OUT_TOAST[reason]) toast(SIGN_OUT_TOAST[reason]!, "danger");
}

// http.ts calls this for 401 DEVICE_NOT_ACTIVE and a dead refresh token
setSessionEndedHandler(endSessionLocally);

type AuthPayload = { user: ProfileResource; tokens: Tokens };

/** A new session: if another account used this phone before, forget its cached data first. */
function begin({ user, tokens }: AuthPayload) {
  if (useSessionStore.getState().userId && useSessionStore.getState().userId !== user.id) forgetUserData();
  useSessionStore.getState().startSession(user, tokens);
  queryClient.setQueryData(resources.profile.key, user);
  // whatever the cache still holds is from before this session: load it all again
  queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== resources.profile.key[0] }).catch(() => {});
}

// ─── sign-up ────────────────────────────────────────────────────────────

export const checkEmail = (email: string) => api.post<{ available: boolean }>("auth/email/check", { email }, { auth: false }).then((r) => r.available);

/** Emails a code. Locally the API also returns it (`debugCode`) so dev builds can show it. */
export const sendEmailCode = (email: string, purpose: "signup" | "password_reset" = "signup") =>
  api.post<{ sent: boolean; debug_code?: string }>("auth/email/send-code", { email, purpose }, { auth: false }).then((r) => ({ debugCode: r.debug_code }));

export const verifyEmailCode = (email: string, code: string, purpose: "signup" | "password_reset" = "signup") =>
  api.post<{ verification_token: string }>("auth/email/verify", { email, code, purpose }, { auth: false }).then((r) => r.verification_token);

export const tagAvailable = (tag: string, signal?: AbortSignal) =>
  request<{ available: boolean }>(`auth/tags/${encodeURIComponent(tag)}/available`, { auth: false, signal }).then((r) => r.data.available);

export async function register(draft: SignupDraft, password: string, verificationToken: string) {
  const phone = draft.phone.replace(/\s+/g, "");
  const payload = await api.post<AuthPayload>(
    "auth/register",
    {
      email: draft.email,
      verification_token: verificationToken,
      password,
      first_name: draft.firstName,
      last_name: draft.lastName,
      tag: draft.tag,
      phone: phone.length > 4 ? phone : undefined,
      country: draft.country,
      referral_code: draft.referral || undefined,
      heard_from: draft.heardFrom || undefined,
      device: await deviceInfo(),
    },
    { auth: false },
  );
  begin(payload);
  return payload.user;
}

// ─── sign-in ────────────────────────────────────────────────────────────

export type SignInResult = { next: "home" } | { next: "verify_new_device"; verificationId: string; email: string; debugCode?: string };

/** Same phone (or the first one): signed in. Another phone: a 6-digit code is emailed first. */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  const res = await request<AuthPayload & { next: string; verification_id?: string; email?: string; debug_code?: string }>("auth/login", {
    method: "POST",
    auth: false,
    body: { email: email.trim().toLowerCase(), password, device: await deviceInfo() },
  });
  if (res.status === 202 || res.data.next === "verify_new_device") {
    return { next: "verify_new_device", verificationId: res.data.verification_id ?? "", email: res.data.email ?? email, debugCode: res.data.debug_code };
  }
  begin(res.data);
  return { next: "home" };
}

/** The emailed code makes this phone the active one (the old phone is signed out). */
export async function verifyNewDevice(verificationId: string, code: string) {
  const payload = await api.post<AuthPayload>("auth/device/verify", { verification_id: verificationId, code }, { auth: false });
  begin(payload);
}

/** Me › Log out: ends the session on the server too (best effort), then locally. */
export async function logOut() {
  try {
    await api.post("auth/logout");
  } catch {
    // offline or already revoked: signing out locally is what matters
  }
  endSessionLocally("user");
}

export const forgotPassword = (email: string) => api.post<{ sent: boolean; debug_code?: string }>("auth/password/forgot", { email: email.trim().toLowerCase() }, { auth: false }).then((r) => ({ debugCode: r.debug_code }));

export async function resetPassword(email: string, verificationToken: string, password: string) {
  await api.post("auth/password/reset", { email, verification_token: verificationToken, password }, { auth: false });
  // every phone is signed out by a reset
  if (useSessionStore.getState().signedIn) endSessionLocally("password-reset");
  else useSessionStore.setState({ signOutReason: "password-reset", rememberedEmail: email });
}

// ─── profile & security ─────────────────────────────────────────────────

const applyUser = (user: ProfileResource) => {
  useSessionStore.getState().applyProfile(user);
  queryClient.setQueryData(resources.profile.key, user);
  return user;
};

export const refreshProfile = () => queryClient.fetchQuery({ queryKey: resources.profile.key, queryFn: () => resources.profile.fetch(), staleTime: 0 });

export const updateProfile = (patch: { first_name?: string; last_name?: string; address?: string; date_of_birth?: string; world?: World; biometrics_enabled?: boolean; two_factor_enabled?: boolean }) =>
  api.patch<ProfileResource>("profile", patch).then(applyUser);

export const changeTag = (tag: string) => api.patch<ProfileResource>("profile/tag", { tag }).then(applyUser);

export const completeOnboarding = (world: World) => api.post<ProfileResource>("onboarding/complete", { world }).then(applyUser);

export async function createPin(pin: string) {
  await api.post("pin", { pin });
  useSessionStore.getState().setHasPin(true);
}

export const changePin = (currentPin: string, newPin: string) => api.post("pin/change", { current_pin: currentPin, new_pin: newPin });

export const changePassword = (currentPassword: string, newPassword: string) => api.post("password/change", { current_password: currentPassword, new_password: newPassword });

/** Texts a code. There's no wait between codes; a new one makes the last stop working. */
export const sendPhoneCode = (phone: string) =>
  api.post<{ sent?: boolean; debug_code?: string }>("phone/send-otp", { phone: phone.replace(/\s+/g, "") }).then((r) => ({ debugCode: r.debug_code }));

/** TOO_MANY_CODES (over the hourly cap): minutes until another code is allowed, else null. */
export function codeWaitMinutes(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.code !== "TOO_MANY_CODES") return null;
  const seconds = Number(error.field("retry_after"));
  return Math.max(1, Math.ceil((Number.isFinite(seconds) && seconds > 0 ? seconds : 600) / 60));
}

export const verifyPhone = (code: string) => api.post<ProfileResource>("phone/verify", { code }).then(applyUser);

/**
 * Sends one tier (POST kyc/tier-N). Tier 1 is checked straight away by the simulator; tiers 2 and
 * 3 wait for an admin. The tiers are refreshed before this resolves, so the next screen already
 * sees the tier as in review and can't offer it again. A refusal (VERIFICATION_IN_REVIEW,
 * ALREADY_VERIFIED) also refreshes, since it means this phone's copy was out of date.
 */
export async function submitKyc(tier: 1 | 2 | 3, body: { bvn?: string; date_of_birth?: string; nin?: string; document_type?: string; document_number?: string; address?: string }) {
  try {
    const user = applyUser(await api.post<ProfileResource>(`kyc/tier-${tier}`, body));
    await resources.kyc.fetch().catch(() => {});
    return user;
  } catch (e) {
    if (e instanceof ApiError && (e.code === "VERIFICATION_IN_REVIEW" || e.code === "ALREADY_VERIFIED")) await refreshProfile().catch(() => {});
    throw e;
  }
}

export const applyForGlobalAccounts = (answers: Record<string, string>) => api.post<ProfileResource>("global-accounts/apply", answers).then(applyUser);

/** Field errors from a 422 as one line, else the message. */
export function formError(error: unknown) {
  if (error instanceof ApiError) {
    const first = Object.values(error.fieldErrors)[0]?.[0];
    return first ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

/** Go to sign-in (the route guard does this on sign-out; this is for explicit links). */
export const toSignIn = () => router.replace("/sign-in");
