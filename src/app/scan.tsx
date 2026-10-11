import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MeAvatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Icon, type IconName } from "@/components/icon";
import { Text } from "@/components/text";
import { findTribeUser } from "@/data/contacts";
import { useSendDraft } from "@/stores/use-send-draft";
import { useSessionStore } from "@/stores/use-session-store";
import { palette, radius, spacing, useColors } from "@/theme";
import { parseTribeCode } from "@/utils/tribe-code";

const DIM = "rgba(8, 3, 14, 0.62)";

function GlassButton({ icon, label, onPress, active }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: active ? "#fff" : "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
      <Icon name={icon} size={18} color={active ? palette.purple[900] : "#fff"} />
    </Pressable>
  );
}

/** Viewfinder: dimmed mask with a rounded cut-out, pulsing corner brackets and a scan line. */
function Viewfinder({ box }: { box: number }) {
  const reduce = useReducedMotion();
  const line = useSharedValue(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    line.set(withRepeat(withSequence(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) })), -1));
    pulse.set(withRepeat(withSequence(withTiming(1.03, { duration: 900 }), withTiming(1, { duration: 900 })), -1));
  }, [line, pulse, reduce]);
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: line.get() * (box - 24) }] }));
  const frame = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));
  const arm = 34;
  const corner = (pos: object, edges: object) => <View style={[{ position: "absolute", width: arm, height: arm, borderColor: "#fff", borderRadius: 4 }, pos, edges]} />;
  return (
    <Animated.View style={[{ width: box, height: box }, frame]}>
      {corner({ top: 0, left: 0 }, { borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 22 })}
      {corner({ top: 0, right: 0 }, { borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 22 })}
      {corner({ bottom: 0, left: 0 }, { borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 22 })}
      {corner({ bottom: 0, right: 0 }, { borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 22 })}
      <Animated.View style={[{ position: "absolute", left: 18, right: 18, top: 12, height: 3, borderRadius: 2, backgroundColor: palette.orange[400], boxShadow: `0 0 18px 4px ${palette.orange[500]}` }, lineStyle]} />
    </Animated.View>
  );
}

/** "bitcoin:bc1q…?amount=…" / "ethereum:0x…@1" → the bare address. */
const bareAddress = (data: string) => data.trim().replace(/^[a-z]+:/i, "").split(/[?@]/)[0];

/**
 * Scan to pay: full-screen camera; a Tribe QR jumps straight to Send with the person filled in.
 * `?mode=address` (from Send crypto): any wallet QR fills the address field and comes back.
 */
export default function Scan() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const addressMode = mode === "address";
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const user = useSessionStore((s) => s.user);
  const [permission, request] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [notTribe, setNotTribe] = useState(false);
  const handled = useRef(false);
  const box = Math.min(width * 0.68, 280);
  const top = Math.max(insets.top + 120, height * 0.22);

  const goSend = (tag: string) => {
    const d = useSendDraft.getState();
    d.start({ scope: "local", asset: "NGN", country: "NG" });
    d.setRecipient({ kind: "tribe", name: findTribeUser(tag)?.name ?? `@${tag}`, handle: `@${tag}` });
    router.replace("/send/amount");
  };

  const topBar = (
    <View style={{ position: "absolute", top: insets.top + spacing.sm, left: spacing.md, right: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <GlassButton icon="close" label="Close" onPress={() => router.back()} />
      <Text variant="headline" style={{ color: "#fff" }}>
        {addressMode ? "Scan wallet address" : "Scan to pay"}
      </Text>
      {permission?.granted ? <GlassButton icon="bolt" label={torch ? "Turn torch off" : "Turn torch on"} active={torch} onPress={() => setTorch((t) => !t)} /> : <View style={{ width: 44 }} />}
    </View>
  );

  const bottom = (
    <View style={{ position: "absolute", left: spacing.md, right: spacing.md, bottom: Math.max(insets.bottom, spacing.md) + spacing.sm, gap: spacing.sm }}>
      <Pressable
        onPress={() => {
          router.back();
          router.push("/me/qr", { withAnchor: true });
        }} accessibilityRole="button" accessibilityLabel="Show my code">
        {({ pressed }) => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: c.bg, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.smd, opacity: pressed ? 0.85 : 1 }}>
            <MeAvatar size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Show my code</Text>
              <Text variant="caption" tone="muted">
                Get paid to @{user.tag}
              </Text>
            </View>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="qr" size={20} color={c.brandText} />
            </View>
          </View>
        )}
      </Pressable>
      <Button title="Type a @tag instead" variant="onDark" icon="send" onPress={() => router.replace("/send")} />
    </View>
  );

  // permission states — explain first, ask in context
  if (!permission || !permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.purple[900] }}>
        <StatusBar style="light" />
        {topBar}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.md }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="scan" size={44} color="#fff" />
          </View>
          <Text variant="title" align="center" style={{ color: "#fff" }}>
            Pay anyone with a scan
          </Text>
          <Text variant="body" align="center" style={{ color: palette.purple[100] }}>
            Point your camera at a Tribe code and we fill in who you&apos;re paying. The camera is only used to read QR codes.
          </Text>
          {permission && !permission.canAskAgain ? (
            <Button title="Open Settings" variant="white" inline onPress={() => Linking.openSettings()} />
          ) : (
            <Button title="Allow camera" variant="white" inline icon="camera" onPress={request} />
          )}
        </View>
        {!addressMode && bottom}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" />
      <CameraView
        style={{ position: "absolute", inset: 0 }}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current) return;
          if (addressMode) {
            handled.current = true;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            useSendDraft.getState().setAddress(bareAddress(data));
            router.back();
            return;
          }
          const tag = parseTribeCode(data);
          if (!tag) {
            setNotTribe(true);
            return;
          }
          handled.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          goSend(tag);
        }}
      />
      {/* dimmed mask around a clear square */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
        <View style={{ height: top, backgroundColor: DIM }} />
        <View style={{ flexDirection: "row", height: box }}>
          <View style={{ flex: 1, backgroundColor: DIM }} />
          <View style={{ width: box, borderRadius: 26, overflow: "hidden" }} />
          <View style={{ flex: 1, backgroundColor: DIM }} />
        </View>
        <View style={{ flex: 1, backgroundColor: DIM }} />
      </View>
      <View pointerEvents="none" style={{ position: "absolute", top, left: (width - box) / 2 }}>
        <Viewfinder box={box} />
      </View>
      <View pointerEvents="none" style={{ position: "absolute", top: top + box + spacing.lg, left: 0, right: 0, alignItems: "center", gap: 4 }}>
        <Text variant="bodyStrong" style={{ color: "#fff" }}>
          {addressMode ? "Point at a wallet QR code" : notTribe ? "That isn't a Tribe code" : "Point at a Tribe QR code"}
        </Text>
        <Text variant="caption" style={{ color: "rgba(255,255,255,0.7)" }}>
          You&apos;ll always review before any money moves
        </Text>
      </View>
      {topBar}
      {!addressMode && bottom}
    </View>
  );
}
