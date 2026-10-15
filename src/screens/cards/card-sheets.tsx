import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { Button } from "@/components/button";
import { VirtualCardFace } from "@/components/card-face";
import { Icon, type IconName } from "@/components/icon";
import { Text } from "@/components/text";
import type { VirtualCard } from "@/data/seed";
import { useCardsStore } from "@/stores/use-cards-store";
import { useFlowStore } from "@/stores/use-flow-store";
import { overlay } from "@/stores/use-overlay-store";
import { toast } from "@/stores/use-ui-store";
import { radius, spacing, useColors } from "@/theme";
import { PAY } from "@/utils/pay-platform";

type Close = (after?: () => void) => void;
type Point = { icon: IconName; text: string; tone?: "danger" | "success" };

/** What will happen, as a short grouped list: an icon disc and one line each. */
function Points({ items }: { items: Point[] }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", paddingVertical: spacing.xs }}>
      {items.map((p, i) => {
        const [bg, fg] = p.tone === "danger" ? [c.dangerSoft, c.danger] : p.tone === "success" ? [c.successSoft, c.success] : [c.surfaceAlt, c.text];
        return (
          <View key={p.text}>
            {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginLeft: spacing.md + 34 + spacing.smd }} />}
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, paddingVertical: spacing.smd }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
                <Icon name={p.icon} size={15} color={fg} />
              </View>
              <Text variant="body" style={{ flex: 1 }}>
                {p.text}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** The sheet's frame: the card as the hero, a title and line, the points, then the actions. */
function CardSheet({ art, title, body, points, actions }: { art: ReactNode; title: string; body: string; points: Point[]; actions: ReactNode }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.sm, gap: spacing.lg }}>
      <View style={{ alignItems: "center", gap: spacing.md }}>
        {art}
        <View style={{ alignItems: "center", gap: spacing.xs }}>
          <Text variant="title" align="center">
            {title}
          </Text>
          <Text variant="body" tone="muted" align="center">
            {body}
          </Text>
        </View>
      </View>
      <Points items={points} />
      <View style={{ gap: spacing.sm }}>{actions}</View>
    </ScrollView>
  );
}

function useFaceWidth() {
  const { width } = useWindowDimensions();
  return Math.min(width - spacing.mdl * 2 - 60, 280);
}

function FreezeSheet({ card, close }: { card: VirtualCard; close: Close }) {
  const reduce = useReducedMotion();
  const w = useFaceWidth();
  const frozen = card.frozen;
  const confirm = () =>
    close(() => {
      useCardsStore.getState().toggleFreeze(card.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast(frozen ? `${card.label} is active again` : `${card.label} is frozen`, "success");
    });
  return (
    <CardSheet
      // the card as it will be: frost on to freeze, frost off to unfreeze
      art={
        <Animated.View entering={reduce ? undefined : FadeIn.duration(320)}>
          <VirtualCardFace card={{ ...card, frozen: !frozen }} width={w} />
        </Animated.View>
      }
      title={frozen ? `Unfreeze ${card.label}?` : `Freeze ${card.label}?`}
      body={frozen ? "It works again straight away, online and everywhere it's saved." : "A quick pause, not goodbye. Unfreeze it any time in a tap."}
      points={
        frozen
          ? [
              { icon: "checkCircle", text: "Payments and subscriptions go through again", tone: "success" },
              { icon: "card", text: "Same number, CVV and balance" },
            ]
          : [
              { icon: "close", text: "New payments and subscriptions are declined", tone: "danger" },
              { icon: "wallet2", text: `Your $${card.balance.toFixed(2)} stays safe on the card` },
              { icon: "refresh", text: "Refunds can still land on it" },
            ]
      }
      actions={
        <>
          <Button title={frozen ? "Unfreeze card" : "Freeze card"} icon="snowflake" onPress={confirm} />
          <Button title="Not now" variant="tertiary" size="md" onPress={() => close()} />
        </>
      }
    />
  );
}

function DeleteSheet({ card, close }: { card: VirtualCard; close: Close }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const w = useFaceWidth();
  const points: Point[] = [
    { icon: "card", text: "Its number, expiry and CVV stop working everywhere they're saved", tone: "danger" },
    card.balance > 0 ? { icon: "wallet2", text: `Its $${card.balance.toFixed(2)} goes back to your USD wallet`, tone: "success" } : { icon: "wallet2", text: "There's no money on it to refund" },
    ...(card.inWallet ? [{ icon: "close" as const, text: `It's removed from ${PAY.name}` }] : []),
    { icon: "lock", text: "You'll confirm with your PIN. This can't be undone" },
  ];
  const proceed = () =>
    close(() => {
      useFlowStore.getState().begin({ kind: "card-delete", cardId: card.id });
      router.push("/pin");
    });
  return (
    <CardSheet
      // the card on its way out: faded, a trash badge on its corner
      art={
        <Animated.View entering={reduce ? undefined : FadeIn.duration(320)}>
          <View style={{ opacity: 0.55 }}>
            <VirtualCardFace card={card} width={w} />
          </View>
          <View style={{ position: "absolute", right: -10, bottom: -10, width: 40, height: 40, borderRadius: 20, backgroundColor: c.danger, borderWidth: 3, borderColor: c.bg, alignItems: "center", justifyContent: "center" }}>
            <Icon name="trash" size={17} color="#fff" />
          </View>
        </Animated.View>
      }
      title={`Delete ${card.label}?`}
      body={`${card.network === "visa" ? "Visa" : "Mastercard"} •• ${card.last4} will be closed for good.`}
      points={points}
      actions={
        <>
          <Button title="Delete with PIN" icon="lock" colors={{ bg: c.danger, fg: "#ffffff" }} onPress={proceed} />
          <Button title="Keep my card" variant="tertiary" size="md" onPress={() => close()} />
        </>
      }
    />
  );
}

/** Freeze or unfreeze: the card with (or without) its frost, what changes, one tap to confirm. */
export function openFreezeSheet(card: VirtualCard) {
  overlay.sheet({ content: (close) => <FreezeSheet card={card} close={close} /> });
}

/** Delete: what's lost and what's refunded, then the transaction PIN (→ /pin → /success). */
export function openDeleteSheet(card: VirtualCard) {
  overlay.sheet({ content: (close) => <DeleteSheet card={card} close={close} /> });
}
