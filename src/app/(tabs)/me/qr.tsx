import { router } from "expo-router";
import { Share, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { MeAvatar } from "@/components/avatar";
import { copyToClipboard } from "@/components/bits";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { Stripes } from "@/components/stripes";
import { Text } from "@/components/text";
import { useSessionStore } from "@/stores/use-session-store";
import { palette, radius, spacing } from "@/theme";

/** The shareable tag card. QR encodes tribe://pay/@tag so any Tribe app can scan it. */
function TagCard() {
  const user = useSessionStore((s) => s.user);
  const link = `tribe://pay/@${user.tag}`;
  return (
    <View style={{ borderRadius: radius.panel, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.purple[500], padding: spacing.lg, alignItems: "center", gap: spacing.md, boxShadow: "0 28px 50px -26px rgba(105,13,172,0.9)" }}>
      <View style={{ position: "absolute", right: -80, top: -70, width: 280, height: 240, overflow: "hidden", opacity: 0.4 }}>
        <Stripes band={16} gap={8} count={12} colors={[palette.purple[300], palette.orange[400]]} />
      </View>
      <View style={{ alignItems: "center", gap: spacing.sm }}>
        <MeAvatar size={64} />
        <Text variant="title" style={{ color: "#fff" }}>
          {user.firstName} {user.lastName}
        </Text>
        <Text variant="bodyStrong" style={{ color: palette.purple[100] }}>
          @{user.tag}
        </Text>
      </View>
      <View style={{ backgroundColor: "#fff", padding: spacing.md, borderRadius: radius.card, borderCurve: "continuous" }}>
        <QRCode value={link} size={188} color={palette.purple[900]} backgroundColor="#fff" />
      </View>
      <Text variant="caption" style={{ color: palette.purple[100] }}>
        Scan with Tribe to pay me instantly
      </Text>
    </View>
  );
}

export default function TagQr() {
  const user = useSessionStore((s) => s.user);
  return (
    <Screen>
      <TagCard />
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Button title="Share" icon="share" style={{ flex: 1 }} onPress={() => Share.share({ message: `Pay me on Tribe: @${user.tag}\nhttps://tribe.africa/pay/${user.tag}` })} />
        <Button title="Copy link" icon="link" variant="secondary" style={{ flex: 1 }} onPress={() => copyToClipboard(`https://tribe.africa/pay/${user.tag}`, "Link copied")} />
      </View>
      <Button title="Scan someone else's code" icon="scan" variant="tertiary" onPress={() => router.push("/scan")} />
    </Screen>
  );
}
