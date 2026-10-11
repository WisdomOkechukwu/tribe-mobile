import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { CopyField } from "@/components/bits";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { FlowScreen } from "@/components/flow-screen";
import { ListSection } from "@/components/list";
import { SuccessBurst } from "@/components/success-burst";
import { Text } from "@/components/text";
import { assetByCode, DEPOSIT_ADDRESSES } from "@/data/assets";
import { spacing } from "@/theme";

/** Open a new currency · done: celebrate, then show the details straight away. */
export default function CurrencyOpened() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const a = assetByCode(code);
  const fields = a.kind === "fiat" ? (a.account?.fields ?? []) : [{ label: `${a.networks?.[0]?.name} address`, value: DEPOSIT_ADDRESSES[`${a.code}:${a.networks?.[0]?.id}`] ?? "" }];
  const close = () => (router.canDismiss() ? router.dismissAll() : router.back());

  return (
    <FlowScreen
      title=""
      cancel="none"
      footer={
        <>
          <Button
            title={`Receive ${a.code}`}
            icon="receive"
            onPress={() => {
              close();
              router.back();
              router.push({ pathname: "/receive/[code]", params: { code: a.code } });
            }}
          />
          <Button
            title="Done"
            variant="tertiary"
            onPress={() => {
              close();
              router.back();
            }}
          />
        </>
      }
    >
      <View style={{ alignItems: "center", gap: spacing.md, paddingTop: spacing.lg }}>
        <View>
          <SuccessBurst size={132} />
          <View style={{ position: "absolute", right: -6, bottom: -6 }}>
            <CoinIcon code={a.code} size={48} ring="#fff" />
          </View>
        </View>
        <Animated.View entering={FadeInDown.delay(250)} style={{ alignItems: "center", gap: spacing.xs }}>
          <Text variant="largeTitle" align="center">
            {a.code} is open
          </Text>
          <Text variant="body" tone="muted" align="center">
            {a.kind === "fiat" ? "Share these details to get paid like a local." : "Send to this address to fund it."}
          </Text>
        </Animated.View>
      </View>
      <Animated.View entering={FadeInDown.delay(380)}>
        <ListSection inset={spacing.md}>
          {fields.map((f) => (
            <CopyField key={f.label} label={f.label} value={f.value} mono={a.kind === "crypto"} />
          ))}
        </ListSection>
      </Animated.View>
    </FlowScreen>
  );
}
