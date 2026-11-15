import { useRef, type ReactNode } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { MarkDisc } from "@/screens/auth/shell";
import { overlay } from "@/stores/use-overlay-store";
import { useSessionStore } from "@/stores/use-session-store";
import { fonts, palette, radius, spacing } from "@/theme";
import { captureImage, saveSharedImage, shareImage } from "@/utils/share-image";
import { Button } from "./button";
import { Stripes } from "./stripes";
import { TagPass } from "./tag-pass";
import { Text } from "./text";

type Shared = { message: string; name: string; title: string };

/**
 * A picture to share, previewed in a sheet (as receipts are). Share captures it, then CLOSES the
 * sheet before the system share sheet opens (our overlay sits above everything on iOS and would
 * cover it). The words go along with the picture (see `shareImage`).
 */
function ShareSheet({ close, shared, children }: { close: (after?: () => void) => void; shared: Shared; children: (width: number) => ReactNode }) {
  const ref = useRef<View>(null);
  const { width, height } = useWindowDimensions();
  const w = Math.min(width - spacing.mdl * 2, 360);
  // room for the whole picture on a tall phone; short phones scroll it (the capture is always whole)
  const room = Math.max(320, height - 340);
  const share = async () => {
    const uri = await captureImage(ref);
    close(() => void shareImage(uri, shared));
  };
  const save = async () => {
    const uri = await captureImage(ref);
    close(() => void saveSharedImage(uri, shared.name));
  };
  return (
    <View style={{ paddingHorizontal: spacing.mdl, gap: spacing.md }}>
      <ScrollView showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} style={{ maxHeight: room }} contentContainerStyle={{ alignItems: "center" }}>
        <View ref={ref} collapsable={false} style={{ width: w, backgroundColor: "transparent" }}>
          {children(w)}
        </View>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Button title="Save image" icon="download" variant="secondary" style={{ flex: 1 }} onPress={save} />
        <Button title="Share" icon="share" style={{ flex: 1 }} onPress={share} />
      </View>
    </View>
  );
}

/** "Share my tag": the pay pass as a picture, with the pay link as its words. */
export function openTagShare() {
  const { tag } = useSessionStore.getState().user;
  const web = `https://tribe.africa/pay/${tag}`;
  overlay.sheet({
    title: "Share my tag",
    content: (close) => (
      <ShareSheet close={close} shared={{ message: `Pay me on Tribe: @${tag}\n${web}`, name: `tribe-tag-${tag}`, title: "Share my tag" }}>
        {() => <TagPass link={`tribe://pay/@${tag}`} web={web} still />}
      </ShareSheet>
    ),
  });
}

const QR = 84;

/**
 * The invite as a picture: the Tribe mark, a tilted "you're invited" sticker (orange: a referral
 * moment), the pitch, then the code beside a QR of the sign-up link. Always the brand's dark
 * purple, whatever the app's theme (it's going into someone else's chat).
 */
function InviteCard({ code, link }: { code: string; link: string }) {
  const user = useSessionStore((s) => s.user);
  return (
    <View style={{ borderRadius: radius.panel, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.purple[900] }}>
      {/* the stripes stay in the top corner, clear of the headline */}
      <View pointerEvents="none" style={{ position: "absolute", right: -60, top: -80, width: 220, height: 170, overflow: "hidden", opacity: 0.4 }}>
        <Stripes band={14} gap={8} count={12} colors={[palette.purple[400], palette.orange[500]]} />
      </View>
      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <MarkDisc size={48} />
          <View style={{ transform: [{ rotate: "6deg" }], backgroundColor: palette.orange[500], borderRadius: radius.full, borderWidth: 3, borderColor: palette.white, paddingHorizontal: spacing.smd, paddingVertical: 4 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: palette.white, letterSpacing: 0.2 }}>you&apos;re invited</Text>
          </View>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: palette.white }}>
            Join me on Tribe.
          </Text>
          <Text variant="body" style={{ color: palette.purple[100] }}>
            Crypto, dollars, pounds, euros and bills. One app.
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="caption" style={{ color: palette.purple[200] }}>
              Sign up with my code
            </Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: fonts.display, fontSize: code.length > 10 ? 20 : code.length > 7 ? 24 : 30, lineHeight: 36, letterSpacing: 1, color: palette.white }}>
              {code}
            </Text>
          </View>
          <View accessible accessibilityLabel="QR code to join with this invite" style={{ backgroundColor: palette.white, padding: spacing.sm, borderRadius: radius.input, borderCurve: "continuous" }}>
            <QRCode value={link} size={QR} color={palette.purple[900]} backgroundColor={palette.white} quietZone={2} />
          </View>
        </View>
      </View>
      <View style={{ marginHorizontal: spacing.lg, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.26)" }} />
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 2 }}>
        <Text variant="caption" numberOfLines={1} style={{ color: palette.purple[200] }}>
          From {user.firstName} {user.lastName}
        </Text>
        <Text variant="subhead" numberOfLines={1} style={{ color: palette.white }}>
          {link.replace(/^https:\/\//, "")}
        </Text>
      </View>
    </View>
  );
}

/** "Invite friends": the invite picture, with the invite message as its words. */
export function openInviteShare(code: string) {
  const link = `https://tribe.africa/r/${code}`;
  overlay.sheet({
    title: "Invite friends",
    content: (close) => (
      <ShareSheet close={close} shared={{ message: `Join me on Tribe: crypto, dollars and bills in one app. Sign up with my code ${code}: ${link}`, name: `tribe-invite-${code}`, title: "Invite friends" }}>
        {() => <InviteCard code={code} link={link} />}
      </ShareSheet>
    ),
  });
}
