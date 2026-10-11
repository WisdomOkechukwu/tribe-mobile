import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { DEMO, SEED_USER } from "@/data/seed";
import { useBeneficiariesStore } from "@/stores/use-beneficiaries-store";
import { useCardsStore } from "@/stores/use-cards-store";
import { useSendDraft } from "@/stores/use-send-draft";
import { resetDemoData } from "@/stores/reset";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { useSessionStore } from "@/stores/use-session-store";
import type { CardTheme } from "@/data/seed";

/**
 * DEV ONLY — deep-link helper for simulator screenshots and QA, e.g.
 *   xcrun simctl openurl booted "exp://<host>:<port>/--/dev?action=onboard"
 * - `onboard`: signs in to the demo account, set up, transaction PIN 1234, lock PIN 123456
 * - `showcase`: the same, fully verified (marketing screenshots); `&theme=lime` re-skins the card
 * - `lock`: locks the app now; `signout`: signs out (keeps the account); `reset`: forgets everything
 * - `hide`: toggles hidden balances
 * `&demo=send` pre-fills a global send (GBP to Amara Obi by Faster Payments) for /send/amount.
 * `&to=/some/route` lands there afterwards. In production builds this route just redirects home.
 */
export default function Dev() {
  const { action, to, theme, demo } = useLocalSearchParams<{ action?: string; to?: string; theme?: string; demo?: string }>();
  useEffect(() => {
    if (!__DEV__) return;
    const s = useSessionStore.getState();
    if (action === "onboard" || action === "showcase") {
      s.createAccount({ email: DEMO.account.email, country: "NG", password: DEMO.account.password, user: { ...SEED_USER } });
      s.setPin(DEMO.pin);
      s.setLockPin(DEMO.lockPin);
      s.completeOnboarding();
      if (action === "showcase") s.setKyc({ tier: 2, status: "approved" });
      if (theme) useCardsStore.getState().setTheme(useCardsStore.getState().cards[0]?.id ?? "c1", theme as CardTheme);
      if (demo === "send") {
        const b = useBeneficiariesStore.getState().items.find((x) => x.channelId === "fps");
        const d = useSendDraft.getState();
        d.start({ scope: "global", asset: "GBP", country: "GB" });
        if (b) d.setRecipient({ kind: b.kind, name: b.name, handle: b.handle, channelId: b.channelId, details: b.details, beneficiaryId: b.id });
      }
    } else if (action === "lock") s.lock();
    else if (action === "signout") s.signOut("user");
    else if (action === "reset") {
      resetDemoData();
      s.wipe();
    } else if (action === "hide") usePrefsStore.getState().toggleHideBalances();
  }, [action, theme, demo]);
  return <Redirect href={(__DEV__ && to ? to : action === "reset" || action === "signout" ? "/intro" : "/") as never} />;
}
