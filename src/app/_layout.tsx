// per-weight imports: the package barrels require() every weight (25 TTFs) into the bundle
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque/800ExtraBold";
import { Poppins_400Regular } from "@expo-google-fonts/poppins/400Regular";
import { Poppins_500Medium } from "@expo-google-fonts/poppins/500Medium";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins/600SemiBold";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Appearance } from "react-native";
import { BrandSplash } from "@/components/brand-splash";
import { headerTitle } from "@/components/header-title";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { enableFreeze } from "react-native-screens";
import { OverlayHost } from "@/components/overlay-host";
import { ToastHost } from "@/components/toast";
import { LoadingHost } from "@/components/tribe-loader";
import { useInboxStore } from "@/stores/use-inbox-store";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { fonts, useTheme } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});
// Screens that aren't visible (other tabs, screens under a pushed one) stop re-rendering on store
// changes until they're shown again.
enableFreeze(true);

const GATED = [useSessionStore, useWalletStore, usePrefsStore, useInboxStore] as const;
const allHydrated = () => GATED.every((s) => s.persist.hasHydrated());

/** True once the stores the first screen reads have rehydrated from AsyncStorage. */
function useStoresHydrated() {
  const [ready, setReady] = useState(allHydrated);
  useEffect(() => {
    if (ready) return;
    const check = () => setReady(allHydrated());
    const subs = GATED.map((s) => s.persist.onFinishHydration(check));
    check();
    return () => subs.forEach((u) => u());
  }, [ready]);
  return ready;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold });
  const hydrated = useStoresHydrated();
  const appearance = usePrefsStore((s) => s.appearance);
  const signedIn = useSessionStore((s) => s.signedIn);
  const hasOnboarded = useSessionStore((s) => s.hasOnboarded);
  const { scheme, colors } = useTheme();
  const inApp = signedIn && hasOnboarded;

  // Appearance preference overrides the system scheme app-wide (useColorScheme follows it).
  useEffect(() => {
    // Not implemented on react-native-web — the browser follows the system scheme there.
    if (typeof Appearance.setColorScheme !== "function") return;
    Appearance.setColorScheme(appearance === "system" ? "unspecified" : appearance);
  }, [appearance]);

  const [splashDone, setSplashDone] = useState(false);
  // the native splash stays up until fonts + stores are in; BrandSplash then takes over and hides it
  if (!fontsLoaded || !hydrated) return null;

  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: colors.brand, background: colors.bg, card: colors.bg, text: colors.text, border: colors.border, notification: colors.accent },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerBackButtonDisplayMode: "minimal",
            headerTitle,
            headerShadowVisible: false,
            headerTitleStyle: { fontFamily: fonts.semibold, color: colors.text },
            headerLargeTitleStyle: { fontFamily: fonts.display },
            headerTintColor: colors.brandText,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          {/* signed out: intro carousel, sign in, create account, forgot password */}
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>

          {/* signed up, not set up yet: pick a world → welcome pass → Home (Finish setup is in-app: /setup) */}
          <Stack.Protected guard={signedIn && !hasOnboarded}>
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={inApp}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="asset/[code]" options={{ title: "", headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: true }} />
            <Stack.Screen name="verify/index" options={{ title: "Verification", headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: true }} />
            <Stack.Screen name="verify/[tier]" options={{ title: "", headerStyle: { backgroundColor: colors.bg } }} />
            {/* modals — each flow folder has its own stack with native headers */}
            <Stack.Screen name="transaction/[id]" options={{ presentation: "modal" }} />
            <Stack.Screen name="report/[id]" options={{ presentation: "modal" }} />
            <Stack.Screen name="receive/[code]" options={{ presentation: "modal" }} />
            <Stack.Screen name="search" options={{ presentation: "modal" }} />
            <Stack.Screen name="scan" options={{ presentation: "fullScreenModal", headerShown: false, animation: "fade" }} />
            <Stack.Screen name="send" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="swap" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="cashpoint" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="bill" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="gift" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="recurring" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="card-fund" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="card-withdraw" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="card-new" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="setup" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="add-currency" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="referral-withdraw" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="pin" options={{ presentation: "fullScreenModal", headerShown: false, animation: "fade" }} />
            <Stack.Screen name="success" options={{ presentation: "transparentModal", headerShown: false, animation: "fade", gestureEnabled: false, contentStyle: { backgroundColor: "transparent" } }} />
          </Stack.Protected>

          {/* dev-only deep-link helper (no-op redirect in production) — see src/app/dev.tsx. Keep last:
              protected-route redirects go to the first available screen. */}
          <Stack.Screen name="dev" options={{ headerShown: false, animation: "none" }} />
        </Stack>
        {/* order = stacking: overlays, then the loader, then toasts on top */}
        <OverlayHost />
        <LoadingHost />
        <ToastHost />
        {!splashDone && <BrandSplash onDone={() => setSplashDone(true)} />}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
