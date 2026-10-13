import Constants from "expo-constants";
import { router } from "expo-router";
import { Share, View } from "react-native";
import { MeAvatar } from "@/components/avatar";
import { copyToClipboard, Pill } from "@/components/bits";
import { BrandSwitch } from "@/components/brand-switch";
import { Icon, type IconName } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { REFERRAL } from "@/data/referrals";
import { overlay } from "@/stores/use-overlay-store";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";
import { palette, radius, spacing, useColors } from "@/theme";
import { pickAppearance, pickDisplayCurrency } from "@/utils/pickers";
import * as WebBrowser from "expo-web-browser";
import { LEGAL_URL } from "@/data/links";

const APPEARANCE_LABEL = { system: "System", light: "Light", dark: "Dark" } as const;

function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} style={{ flex: 1, alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous" }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color={c.text} weight="medium" />
      </View>
      <Text variant="subhead">{label}</Text>
    </PressableScale>
  );
}

/**
 * Me: profile header, quick actions, the referral banner, then settings in grouped lists.
 * One icon language throughout — outline glyphs in neutral circles; colour only for status.
 */
export default function Me() {
  const c = useColors();
  const user = useSessionStore((s) => s.user);
  const tier = useSessionStore((s) => s.kycTier);
  const kycStatus = useSessionStore((s) => s.kycStatus);
  const devices = useSessionStore((s) => s.devices);
  const logOut = useSessionStore((s) => s.logOut);
  const display = usePrefsStore((s) => s.display);
  const setDisplay = usePrefsStore((s) => s.setDisplay);
  const appearance = usePrefsStore((s) => s.appearance);
  const setAppearance = usePrefsStore((s) => s.setAppearance);
  const hidden = usePrefsStore((s) => s.hideBalances);
  const toggleHidden = usePrefsStore((s) => s.toggleHideBalances);

  return (
    <Screen>
      {/* profile header */}
      <View style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <PressableScale onPress={() => router.push("/me/edit")} accessibilityLabel="Edit profile photo">
            <MeAvatar size={72} />
            <View style={{ position: "absolute", right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: c.brand, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.surface }}>
              <Icon name="pencil" size={11} color={c.onBrand} weight="bold" />
            </View>
          </PressableScale>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="title" numberOfLines={1}>
              {user.firstName} {user.lastName}
            </Text>
            <PressableScale onPress={() => copyToClipboard(`@${user.tag}`, "Tag copied")} accessibilityLabel={`Copy your tag @${user.tag}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" }}>
              <Text variant="subhead" tone="muted">
                @{user.tag}
              </Text>
              <Icon name="copy" size={11} color={c.textSubtle} />
            </PressableScale>
            <PressableScale onPress={() => router.push("/verify")} accessibilityLabel="Verification and limits" style={{ alignSelf: "flex-start" }}>
              {tier ? <Pill label={`Tier ${tier} · Verified`} tone="success" icon="verified" /> : <Pill label={kycStatus === "pending" ? "Verification pending" : "Not verified · Verify now"} tone="warning" icon="shield" />}
            </PressableScale>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: c.border }} />
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <QuickAction icon="qrLine" label="My QR" onPress={() => router.push("/me/qr")} />
          <QuickAction icon="scanLine" label="Scan" onPress={() => router.push("/scan")} />
          <QuickAction icon="shareLine" label="Share tag" onPress={() => Share.share({ message: `Pay me on Tribe: @${user.tag}\nhttps://tribe.africa/pay/${user.tag}` })} />
        </View>
      </View>

      {/* referrals — earn for life */}
      <PressableScale onPress={() => router.push("/me/invite")} scaleTo={0.98} accessibilityLabel="Invite friends" style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: palette.purple[700], borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="giftLine" size={20} color={palette.orange[300]} />
        </View>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="bodyStrong" style={{ color: "#fff" }}>
            Earn from friends, for life
          </Text>
          <Text variant="caption" style={{ color: palette.purple[100] }}>
            ₦{REFERRAL.perTransactionNgn} every time someone you invite makes a transaction.
          </Text>
        </View>
        <Icon name="chevron" size={13} color={palette.purple[100]} />
      </PressableScale>

      <ListSection title="Account">
        <ListRow icon="personLine" title="Personal details" subtitle="Name, photo, email and @tag" onPress={() => router.push("/me/edit")} />
        <ListRow icon="shieldLine" title="Verification & limits" subtitle={tier ? `Tier ${tier} · higher limits on` : "Unverified · unlock higher limits"} onPress={() => router.push("/verify")} />
        <ListRow icon="docLine" title="Statements" subtitle="Monthly PDFs, sent to your email" onPress={() => router.push("/me/statements")} />
      </ListSection>

      <ListSection title="Security">
        <ListRow icon="lockLine" title="Security centre" subtitle="PIN, Face ID and 2-step verification" onPress={() => router.push("/me/security")} />
        <ListRow icon="devicesLine" title="Devices" subtitle={`${devices.length} signed in`} onPress={() => router.push("/me/devices")} />
      </ListSection>

      <ListSection title="Preferences">
        <ListRow icon="globeLine" title="Display currency" value={display === "NGN" ? "Naira" : "Dollars"} valueTone="muted" chevron onPress={() => pickDisplayCurrency(display, setDisplay)} />
        <ListRow icon="appearance" title="Appearance" value={APPEARANCE_LABEL[appearance]} valueTone="muted" chevron onPress={() => pickAppearance(appearance, setAppearance)} />
        <ListRow icon="bellLine" title="Notifications" onPress={() => router.push("/me/notifications")} />
        <ListRow icon="eyeOff" title="Hide balances" subtitle="Mask amounts on every screen" trailing={<BrandSwitch label="Hide balances" value={hidden} onValueChange={toggleHidden} />} />
      </ListSection>

      <ListSection title="Support">
        <ListRow icon="chatLine" title="Help & chat" subtitle="Chat with support, 24/7" onPress={() => toast("Chat opens in the full app")} />
        <ListRow icon="starLine" title="Rate Tribe" onPress={() => toast("Ratings open in the App Store")} />
        <ListRow icon="legalLine" title="Legal" subtitle="Terms, privacy and licences" onPress={() =>
            // the legal page in an in-app browser sheet (Safari View Controller / Custom Tabs), in our colours
            WebBrowser.openBrowserAsync(LEGAL_URL, { toolbarColor: c.bg, controlsColor: c.brand, presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET }).catch(() => toast("Couldn't open the legal page", "danger"))
          }
        />
      </ListSection>

      <ListSection>
        <ListRow
          icon="logoutLine"
          destructive
          title="Log out"
          onPress={() =>
            overlay.confirm({
              icon: "logout",
              title: "Log out?",
              body: "You'll need your email and password to sign back in. Your money stays safe.",
              confirmLabel: "Log out",
              destructive: true,
              onConfirm: logOut,
            })
          }
        />
      </ListSection>
      <Text variant="caption" tone="subtle" align="center">
        Tribe {Constants.expoConfig?.version ?? "1.0.0"}
      </Text>
    </Screen>
  );
}
