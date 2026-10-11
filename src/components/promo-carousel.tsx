import type { ReactNode } from "react";
import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { FadeOut, LinearTransition } from "react-native-reanimated";
import { usePrefsStore } from "@/stores/use-prefs-store";
import { radius, spacing, useColors } from "@/theme";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

export type Promo = { id: string; title: string; body: string; art: ReactNode; onPress: () => void; tone?: "brand" | "accent" | "neutral" };

/** Paged, dismissible promo cards. Dismissals persist (prefs.dismissedPromos). */
export function PromoCarousel({ promos, gutter = spacing.md }: { promos: Promo[]; gutter?: number }) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const dismissed = usePrefsStore((s) => s.dismissedPromos);
  const dismiss = usePrefsStore((s) => s.dismissPromo);
  const [page, setPage] = useState(0);
  const shown = promos.filter((p) => !dismissed.includes(p.id));
  if (!shown.length) return null;
  const cardW = width - gutter * 2;

  return (
    <Animated.View layout={LinearTransition} exiting={FadeOut} style={{ gap: spacing.sm }}>
      <ScrollView
        horizontal
        pagingEnabled={false}
        snapToInterval={cardW + spacing.sm}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        style={{ marginHorizontal: -gutter }}
        contentContainerStyle={{ paddingHorizontal: gutter, gap: spacing.sm }}
        onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (cardW + spacing.sm)))}
        scrollEventThrottle={32}
      >
        {shown.map((p) => {
          const bg = p.tone === "accent" ? c.accentSoft : p.tone === "neutral" ? c.surface : c.brandSoft;
          return (
            <View key={p.id} style={{ width: cardW }}>
              <PressableScale onPress={p.onPress} scaleTo={0.98} accessibilityLabel={`${p.title}. ${p.body}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: bg, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, paddingRight: spacing.xl }}>
                {p.art}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong">{p.title}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={2}>
                    {p.body}
                  </Text>
                </View>
              </PressableScale>
              {/* sibling, not child: a button can't sit inside a button (web) */}
              <PressableScale onPress={() => dismiss(p.id)} hitSlop={12} accessibilityLabel={`Dismiss ${p.title}`} style={{ position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: c.overlay }}>
                <Icon name="close" size={9} color="#fff" weight="bold" />
              </PressableScale>
            </View>
          );
        })}
      </ScrollView>
      {shown.length > 1 && (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 5 }}>
          {shown.map((p, i) => (
            <View key={p.id} style={{ width: i === Math.min(page, shown.length - 1) ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === Math.min(page, shown.length - 1) ? c.brand : c.borderStrong }} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}
