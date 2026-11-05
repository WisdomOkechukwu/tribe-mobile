import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { endSessionLocally, logOut, signIn } from "@/api/auth";
import { errorMessage } from "@/api/http";
import { useBeneficiariesStore } from "@/stores/use-beneficiaries-store";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { useSendDraft } from "@/stores/use-send-draft";
import { useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";

/** The seeded demo customer in tribe-backend (database/seeders): PIN 2580. */
const DEMO_LOGIN = { email: "ada@example.com", password: "Tribe@2026" };

/**
 * DEV ONLY — deep-link helper for simulator screenshots and QA, e.g.
 *   xcrun simctl openurl booted "exp://<host>:<port>/--/dev?action=signin"
 * - `signin`: signs in to the backend's seeded customer (`&email=`/`&password=` for another);
 *   a phone that isn't the account's active one goes through "Verify this phone" first
 * - `signout`: signs out (server + phone); `reset`: forgets everything on this phone
 * - `hide`: toggles hidden balances
 * `&demo=send` pre-fills a global send to the first saved GBP Faster Payments beneficiary.
 * `&to=/some/route` lands there afterwards. In production builds this route just redirects home.
 */
export default function Dev() {
  const { action, to, demo, email, password } = useLocalSearchParams<{ action?: string; to?: string; demo?: string; email?: string; password?: string }>();
  const [done, setDone] = useState(action !== "signin");
  useEffect(() => {
    if (!__DEV__) return;
    const s = useSessionStore.getState();
    if (action === "signin") {
      signIn(email ?? DEMO_LOGIN.email, password ?? DEMO_LOGIN.password)
        .then((r) => {
          if (r.next === "verify_new_device") toast("Check the email code to verify this phone");
        })
        .catch((e) => toast(errorMessage(e), "danger"))
        .finally(() => setDone(true));
    } else if (action === "signout") void logOut();
    else if (action === "reset") {
      endSessionLocally("user");
      s.wipe();
    } else if (action === "hide") usePrefsStore.getState().toggleHideBalances();
    if (demo === "send") {
      const b = useBeneficiariesStore.getState().items.find((x) => x.channelId === "fps");
      const d = useSendDraft.getState();
      d.start({ scope: "global", asset: "GBP", country: "GB" });
      if (b) d.setRecipient({ kind: b.kind, name: b.name, handle: b.handle, channelId: b.channelId, details: b.details, beneficiaryId: b.id });
    }
  }, [action, demo, email, password]);
  if (!done) return null;
  return <Redirect href={(__DEV__ && to ? to : action === "reset" || action === "signout" ? "/intro" : "/") as never} />;
}
