import { router } from "expo-router";
import { View } from "react-native";
import { SectionHeader } from "@/components/bits";
import { BillerThumb, GiftMark } from "@/components/brand-tiles";
import { BrandSwitch } from "@/components/brand-switch";
import { CashpointMark } from "@/components/cashpoint-mark";
import { Icon, type IconName } from "@/components/icon";
import { ListRow, ListSection, SectionLink } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { BILLERS, billerById, GIFT_BRANDS, type Biller } from "@/data/catalog";
import { overlay } from "@/stores/use-overlay-store";
import { FREQUENCY_LABEL, useRecurringStore } from "@/stores/use-recurring-store";
import { useVaultStore } from "@/stores/use-vault-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { palette, radius, spacing, useColors } from "@/theme";
import { relativeDate } from "@/utils/format";

type Category = { key: string; label: string; icon: IconName; billers: Biller[] };

const CATEGORIES: Category[] = [
  { key: "airtime", label: "Airtime", icon: "airtime", billers: BILLERS.filter((b) => b.field === "phone") },
  { key: "data", label: "Data", icon: "data", billers: BILLERS.filter((b) => b.field === "phone") },
  { key: "tv", label: "TV", icon: "tv", billers: BILLERS.filter((b) => b.category === "tv") },
  { key: "electricity", label: "Electricity", icon: "bolt", billers: BILLERS.filter((b) => b.category === "electricity") },
];

/** Pick a provider for a category in our own sheet → the bill flow. */
function chooseBiller(cat: Category) {
  overlay.select({
    title: cat.label,
    subtitle: cat.key === "electricity" ? "Prepaid tokens are saved to your Token Vault" : "Choose a provider",
    options: cat.billers.map((b) => ({ value: b.id, label: b.name, sub: b.field === "meter" ? "Prepaid meter" : b.field === "smartcard" ? "Smartcard / IUC" : "Any Nigerian number", leading: <BillerThumb biller={b} size={38} /> })),
    onSelect: (id) => router.push({ pathname: "/bill/[id]", params: { id } }),
  });
}

/** Pay: bills by category, pay-again shortcuts, Cashpoints, gift cards, recurring bills, Token Vault. */
export default function Pay() {
  const c = useColors();
  const tokens = useVaultStore((s) => s.tokens);
  const schedules = useRecurringStore((s) => s.schedules);
  const transactions = useWalletStore((s) => s.transactions);
  const activeCodes = transactions.filter((t) => t.type === "cashpoint" && t.direction === "out" && t.status === "pending").length;
  const unused = tokens.filter((t) => !t.loadedOn);
  const active = schedules.filter((x) => x.active);

  // "Pay again": the latest payment per biller
  const recent = transactions
    .filter((t) => t.type === "bill" && t.meta?.billerId && t.status === "completed")
    .filter((t, i, all) => all.findIndex((x) => x.meta?.billerId === t.meta?.billerId) === i)
    .slice(0, 3);

  return (
    <Screen>
      {/* Bills — four categories in one panel */}
      <View style={{ gap: spacing.smd }}>
        <SectionHeader title="Pay bills" />
        <View style={{ flexDirection: "row", backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", paddingVertical: spacing.md, paddingHorizontal: spacing.xs }}>
          {CATEGORIES.map((cat) => (
            <PressableScale key={cat.key} onPress={() => chooseBiller(cat)} accessibilityLabel={`Pay ${cat.label}`} scaleTo={0.94} style={{ flex: 1, alignItems: "center", gap: spacing.sm }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name={cat.icon} size={20} color={c.brandText} />
              </View>
              <Text variant="subhead" numberOfLines={1}>
                {cat.label}
              </Text>
            </PressableScale>
          ))}
        </View>
      </View>

      {recent.length > 0 && (
        <ListSection title="Pay again">
          {recent.map((t) => {
            const b = billerById(t.meta!.billerId!);
            const target = t.subtitle.split(" · ")[1] ?? "";
            const reusable = b.field !== "meter" && !target.includes("•");
            const amount = (t.meta?.face ?? "").replace(/\D/g, "");
            return (
              <ListRow
                key={t.id}
                leading={<BillerThumb biller={b} size={40} />}
                title={t.title}
                subtitle={`${reusable ? target : b.field === "meter" ? "Prepaid meter" : b.name} · ${relativeDate(t.date)}`}
                value={t.meta?.face}
                chevron
                accessibilityLabel={`Pay ${t.title} again`}
                onPress={() => router.push({ pathname: "/bill/[id]", params: { id: b.id, ...(reusable ? { target } : {}), ...(amount ? { amount } : {}) } })}
              />
            );
          })}
        </ListSection>
      )}

      {/* Cashpoints — the screen's one orange moment */}
      <View style={{ borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.orange[500], padding: spacing.mdl, gap: spacing.md }}>
        <View pointerEvents="none" style={{ position: "absolute", right: -46, top: -40, opacity: 0.14 }}>
          <CashpointMark size={190} plain />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
            <CashpointMark size={44} plain />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title" style={{ color: "#fff" }}>
              Cashpoints
            </Text>
            <Text variant="caption" style={{ color: palette.orange[50] }}>
              Naira in a 12-digit code. Anyone can redeem it.
            </Text>
          </View>
          {activeCodes > 0 && (
            <PressableScale onPress={() => router.push("/cashpoint")} accessibilityLabel={`${activeCodes} active codes`} style={{ backgroundColor: "rgba(255,255,255,0.22)", borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 5 }}>
              <Text variant="subhead" style={{ color: "#fff" }}>
                {activeCodes} active
              </Text>
            </PressableScale>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: radius.input, paddingVertical: spacing.sm, paddingHorizontal: spacing.smd }}>
          {(["Pick an amount", "Share the code", "They redeem"] as const).map((step, i) => (
            <View key={step} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Text variant="caption" style={{ color: palette.orange[700], fontFamily: "Poppins_600SemiBold", fontSize: 11, lineHeight: 14 }}>
                  {i + 1}
                </Text>
              </View>
              <Text variant="caption" style={{ color: "#fff", flex: 1, fontSize: 11, lineHeight: 14 }} numberOfLines={2}>
                {step}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <PressableScale onPress={() => router.push("/cashpoint")} accessibilityLabel="Generate a Cashpoint" style={{ flex: 1, height: 46, borderRadius: radius.full, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="add" size={16} color={palette.orange[700]} weight="bold" />
            <Text variant="bodyStrong" style={{ color: palette.orange[700] }}>
              Generate
            </Text>
          </PressableScale>
          <PressableScale onPress={() => router.push({ pathname: "/cashpoint", params: { mode: "redeem" } })} accessibilityLabel="Redeem a Cashpoint" style={{ flex: 1, height: 46, borderRadius: radius.full, backgroundColor: palette.orange[700], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="receive" size={16} color="#fff" weight="bold" />
            <Text variant="bodyStrong" style={{ color: "#fff" }}>
              Redeem
            </Text>
          </PressableScale>
        </View>
      </View>

      {/* Gift cards — one entry to the full page */}
      <PressableScale onPress={() => router.push("/pay/gift-cards")} scaleTo={0.98} accessibilityLabel="Gift cards: buy or sell" style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
        <View style={{ flexDirection: "row" }}>
          {GIFT_BRANDS.slice(0, 3).map((b, i) => (
            <View key={b.id} style={{ marginLeft: i ? -14 : 0, borderRadius: 22, borderWidth: 2, borderColor: c.surface, zIndex: 3 - i }}>
              <GiftMark brand={b} size={40} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">Gift cards</Text>
          <Text variant="caption" tone="muted" numberOfLines={2}>
            Buy codes instantly, or sell cards for Naira or USDT
          </Text>
        </View>
        <Icon name="chevron" size={13} color={c.textSubtle} />
      </PressableScale>

      {/* Recurring bills (live) */}
      <ListSection title="Recurring bills" action={<SectionLink label="Manage" onPress={() => router.push("/pay/recurring")} />}>
        {active.slice(0, 3).map((x) => {
          const b = billerById(x.billerId);
          return (
            <ListRow
              key={x.id}
              leading={<BillerThumb biller={b} size={40} />}
              title={`${b.name}${x.plan ? ` · ${x.plan}` : ""}`}
              subtitle={`₦${x.amountNgn.toLocaleString()} · ${FREQUENCY_LABEL[x.frequency]} · next ${new Date(x.nextRun).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
              trailing={<BrandSwitch label={`${b.name} renews automatically`} value={x.active} onValueChange={() => useRecurringStore.getState().toggle(x.id)} />}
              onPress={() => router.push("/pay/recurring")}
            />
          );
        })}
        <ListRow icon="plus" iconBg={c.brandSoft} iconTint={c.brandText} title="Add a recurring bill" subtitle="Data, TV and light that renew themselves" onPress={() => router.push("/recurring/new")} />
      </ListSection>

      {/* Token Vault */}
      <PressableScale onPress={() => router.push("/pay/vault")} scaleTo={0.98} accessibilityLabel="Token Vault" style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: unused.length ? c.warningSoft : c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: unused.length ? c.pending : c.successSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="vault" size={21} color={unused.length ? "#fff" : c.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">Token Vault</Text>
          <Text variant="caption" tone="muted">
            {unused.length ? `${unused.length} electricity token${unused.length > 1 ? "s" : ""} waiting · ${unused.reduce((s, t) => s + t.kwh, 0).toFixed(1)} kWh` : "All tokens are loaded."}
          </Text>
        </View>
        <View style={{ backgroundColor: unused.length ? c.pending : c.surfaceAlt, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 6 }}>
          <Text variant="subhead" style={{ color: unused.length ? "#fff" : c.text }}>
            {unused.length ? "Load now" : "Open"}
          </Text>
        </View>
      </PressableScale>
    </Screen>
  );
}
