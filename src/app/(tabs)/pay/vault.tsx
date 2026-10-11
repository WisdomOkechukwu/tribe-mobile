import { Pressable, View } from "react-native";
import { copyToClipboard } from "@/components/bits";
import { BillerThumb } from "@/components/brand-tiles";
import { Icon } from "@/components/icon";
import { ListSection } from "@/components/list";
import { PrivacyGuard } from "@/components/privacy-guard";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { billerById } from "@/data/catalog";
import type { VaultToken } from "@/data/seed";
import { useVaultStore } from "@/stores/use-vault-store";
import { radius, spacing, useColors } from "@/theme";
import { relativeDate } from "@/utils/format";

const PHED = billerById("phed");

/** "2h ago", "just now", "8 Oct" — lower-cased so it reads mid-sentence. */
const when = (iso: string) => {
  const r = relativeDate(iso);
  return /^\d/.test(r) ? r : r[0].toLowerCase() + r.slice(1);
};

/** A token still to be typed into the meter: the number, Copy, and one clear "loaded" action. */
function WaitingToken({ t }: { t: VaultToken }) {
  const c = useColors();
  const toggle = useVaultStore((s) => s.toggleLoaded);
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
        <BillerThumb biller={PHED} size={40} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {t.provider}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            Meter {t.meter} · {when(t.bought)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text variant="bodyStrong">{t.kwh} kWh</Text>
          <Text variant="caption" tone="muted">
            ₦{t.amount.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: c.sunken, borderRadius: radius.input, borderCurve: "continuous", paddingVertical: spacing.smd, alignItems: "center" }}>
        <Text variant="mono" selectable style={{ fontSize: 18, letterSpacing: 1 }} numberOfLines={1} accessibilityLabel={`Token ${t.token}`}>
          {t.token}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Pressable style={{ flex: 1 }} onPress={() => copyToClipboard(t.token.replace(/\s/g, ""), "Token copied")} accessibilityRole="button" accessibilityLabel={`Copy token ${t.token}`}>
          {({ pressed }) => (
            <View style={{ height: 46, borderRadius: radius.full, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm, backgroundColor: pressed ? c.border : c.surfaceAlt }}>
              <Icon name="copy" size={15} color={c.text} />
              <Text variant="bodyStrong">Copy</Text>
            </View>
          )}
        </Pressable>
        <Pressable style={{ flex: 1.5 }} onPress={() => toggle(t.id)} accessibilityRole="button" accessibilityLabel={`Mark ${t.kwh} kWh token as loaded`}>
          {({ pressed }) => (
            <View style={{ height: 46, borderRadius: radius.full, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm, backgroundColor: c.brand, opacity: pressed ? 0.85 : 1 }}>
              <Icon name="check" size={15} color={c.onBrand} weight="bold" />
              <Text variant="bodyStrong" style={{ color: c.onBrand }}>
                I&apos;ve loaded it
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/** A token already on the meter: one line, with Undo in case it was ticked by mistake. */
function LoadedToken({ t }: { t: VaultToken }) {
  const toggle = useVaultStore((s) => s.toggleLoaded);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingHorizontal: spacing.md, paddingVertical: spacing.smd, minHeight: 60 }}>
      <BillerThumb biller={PHED} size={40} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {t.provider}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {t.kwh} kWh · loaded {when(t.loadedOn!)}
        </Text>
      </View>
      <Pressable onPress={() => toggle(t.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Undo: mark ${t.kwh} kWh token as not loaded`}>
        {({ pressed }) => (
          <Text variant="subhead" tone="brand" style={{ opacity: pressed ? 0.6 : 1 }}>
            Undo
          </Text>
        )}
      </Pressable>
    </View>
  );
}

/** Every electricity token, saved. Load it on the meter, tick it off, and it moves to Loaded. */
export default function Vault() {
  const c = useColors();
  const tokens = useVaultStore((s) => s.tokens);
  const waiting = tokens.filter((t) => !t.loadedOn);
  const loaded = tokens.filter((t) => !!t.loadedOn);
  const kwh = waiting.reduce((s, t) => s + t.kwh, 0);

  return (
    <Screen>
      <PrivacyGuard />
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: waiting.length ? c.warningSoft : c.successSoft, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: waiting.length ? c.pending : c.success, alignItems: "center", justifyContent: "center" }}>
          <Icon name={waiting.length ? "bolt" : "check"} size={20} color="#fff" weight="bold" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{waiting.length ? `${waiting.length} token${waiting.length > 1 ? "s" : ""} to load · ${kwh.toFixed(1)} kWh` : "All tokens are loaded"}</Text>
          <Text variant="caption" tone="muted">
            {waiting.length ? "Type each one into your meter, then tap “I've loaded it”." : "New tokens from PHED payments are saved here automatically."}
          </Text>
        </View>
      </View>

      {waiting.length > 0 && (
        <View style={{ gap: spacing.smd }}>
          <Text variant="headline" style={{ paddingHorizontal: spacing.xs }}>
            To load
          </Text>
          {waiting.map((t) => (
            <WaitingToken key={t.id} t={t} />
          ))}
        </View>
      )}

      {loaded.length > 0 && (
        <ListSection title="Loaded">
          {loaded.map((t) => (
            <LoadedToken key={t.id} t={t} />
          ))}
        </ListSection>
      )}
    </Screen>
  );
}
