import { isLiquidGlassAvailable } from "expo-glass-effect";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColors } from "@/theme";
import { GlassTabs, useTabBarHidden } from "./glass-tab-bar";

/** Evaluated once — tab navigators must not swap at runtime. */
const NATIVE_GLASS = isLiquidGlassAvailable();

/**
 * iOS 26+: the system Liquid Glass tab bar (NativeTabs — no background override, so the glass
 * shows, and it minimises on scroll). Everywhere else: our floating frosted capsule.
 */
export default function AppTabs() {
  const c = useColors();
  const hidden = useTabBarHidden();
  if (!NATIVE_GLASS) return <GlassTabs />;
  return (
    <NativeTabs hidden={hidden} minimizeBehavior="onScrollDown" tintColor={c.brand} labelStyle={{ fontFamily: "Poppins_500Medium", fontSize: 10 }}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet">
        <NativeTabs.Trigger.Label>Wallet</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "wallet.bifold", selected: "wallet.bifold.fill" }} md="account_balance_wallet" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pay">
        <NativeTabs.Trigger.Label>Pay</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} md="grid_view" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cards">
        <NativeTabs.Trigger.Label>Cards</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} md="credit_card" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="me">
        <NativeTabs.Trigger.Label>Me</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
