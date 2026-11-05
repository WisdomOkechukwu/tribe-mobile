import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { previewLatency } from "@/api/query-client";
import { DEMO, SEED_USER } from "@/data/seed";
import { useBeneficiariesStore } from "@/stores/use-beneficiaries-store";
import { useCardsStore } from "@/stores/use-cards-store";
import { useSendDraft } from "@/stores/use-send-draft";
import { resetDemoData, startNewAccount } from "@/stores/reset";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { useSessionStore } from "@/stores/use-session-store";
import { parseFinish } from "@/utils/card-finish";

/**
 * DEV ONLY — deep-link helper for simulator screenshots and QA, e.g.
 *   xcrun simctl openurl booted "exp://<host>:<port>/--/dev?action=onboard"
 * - `onboard`: signs in to the demo account, set up, transaction PIN 1234 — like a
 *   fresh sign-up: no virtual card yet, not verified
 * - `showcase`: the same, fully verified (tier 3) with the seeded card (marketing screenshots);
 *   `&theme=lime` (or `custom:5A2A82:rings`) re-skins the card
 * - `signout`: signs out (keeps the account); `reset`: forgets everything
 * - `hide`: toggles hidden balances
 * - `latency&ms=1500`: every data query reloads with that much fake network, to preview the
 *   skeletons (`ms=0` turns it off)
 * `&demo=send` pre-fills a global send (GBP to Amara Obi by Faster Payments) for /send/amount.
 * `&to=/some/route` lands there afterwards. In production builds this route just redirects home.
 */
export default function Dev() {
  const { action, to, theme, demo, ms } = useLocalSearchParams<{ action?: string; to?: string; theme?: string; demo?: string; ms?: string }>();
  useEffect(() => {
    if (!__DEV__) return;
    const s = useSessionStore.getState();
    if (action === "onboard" || action === "showcase") {
      if (action === "showcase") resetDemoData();
      else startNewAccount();
      s.createAccount({ email: DEMO.account.email, country: "NG", password: DEMO.account.password, user: { ...SEED_USER } });
      s.setPin(DEMO.pin);
      s.setPhoneVerified(true);
      s.completeOnboarding();
      if (action === "showcase") s.setKyc({ tier: 3, status: "approved" });
      if (theme) useCardsStore.getState().setTheme(useCardsStore.getState().cards[0]?.id ?? "c1", parseFinish(theme));
      if (demo === "send") {
        const b = useBeneficiariesStore.getState().items.find((x) => x.channelId === "fps");
        const d = useSendDraft.getState();
        d.start({ scope: "global", asset: "GBP", country: "GB" });
        if (b) d.setRecipient({ kind: b.kind, name: b.name, handle: b.handle, channelId: b.channelId, details: b.details, beneficiaryId: b.id });
      }
    } else if (action === "signout") s.signOut("user");
    else if (action === "reset") {
      resetDemoData();
      s.wipe();
    } else if (action === "hide") usePrefsStore.getState().toggleHideBalances();
    else if (action === "latency") previewLatency(Number(ms ?? 1500) || 0);
  }, [action, theme, demo, ms]);
  return <Redirect href={(__DEV__ && to ? to : action === "reset" || action === "signout" ? "/intro" : "/") as never} />;
}
