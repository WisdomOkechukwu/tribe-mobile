import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { BillerThumb, GiftMark } from "@/components/brand-tiles";
import { BrandSwitch } from "@/components/brand-switch";
import { CashpointMark } from "@/components/cashpoint-mark";
import { Icon, type IconName } from "@/components/icon";
import { SectionLink } from "@/components/list";
import { PairIcon } from "@/components/pair-icon";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Text } from "@/components/text";
import { billerById, detectNetwork, GIFT_BRANDS } from "@/data/catalog";
import { useSessionStore } from "@/stores/use-session-store";
import { FREQUENCY_LABEL, useRecurringStore, type Frequency, type Schedule } from "@/stores/use-recurring-store";
import { useRecurring, useTransactions, useVaultTokens } from "@/api/queries";
import { Skeleton } from "@/components/skeletons";
import { fonts, palette, radius, spacing, useColors } from "@/theme";

type Shortcut = { key: string; label: string; icon: IconName; go: () => void; badge?: number };

/**
 * OPay-style shortcut grid: four round icons a row, label underneath. Bills open straight on the
 * bill screen (your own network pre-picked); the rest open their pages.
 */
function ShortcutGrid({ items }: { items: Shortcut[] }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", paddingVertical: spacing.md, flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md }}>
      {items.map((it) => (
        <PressableScale key={it.key} onPress={it.go} accessibilityLabel={it.label} scaleTo={0.92} style={{ width: "25%", alignItems: "center", gap: spacing.sm }}>
          <View>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name={it.icon} size={21} color={c.brandText} />
            </View>
            {!!it.badge && (
              <View style={{ position: "absolute", top: -3, right: -5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.accent, borderWidth: 2, borderColor: c.surface, alignItems: "center", justifyContent: "center" }}>
                <Text variant="caption" style={{ color: "#fff", fontFamily: fonts.semibold, fontSize: 10, lineHeight: 12 }}>
                  {it.badge}
                </Text>
              </View>
            )}
          </View>
          <Text variant="caption" numberOfLines={1} style={{ fontFamily: fonts.medium }}>
            {it.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

const PER_MONTH: Record<Frequency, number> = { weekly: 52 / 12, biweekly: 26 / 12, monthly: 1 };
const TILE = 164;
/** Card-sized frequency labels (the full ones wrap on a 164pt card). */
const FREQ_SHORT: Record<Frequency, string> = { weekly: "Weekly", biweekly: "Every 2 wks", monthly: "Monthly" };

/** "Today" / "Tomorrow" / "In 5 days" until the next run — short enough for one line on a card. */
function untilLabel(iso: string) {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const n = Math.round((day(new Date(iso)) - day(new Date())) / 864e5);
  return n <= 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`;
}

/**
 * Recurring bills as a swipeable rail of subscription cards: logo, big amount, a countdown pill
 * and a pause switch on each, a monthly "on autopilot" total up top, and an Add card at the end.
 * Paused bills stay in the rail (dimmed) so pausing never makes a card vanish under your thumb.
 */
function RecurringRail() {
  const schedules = useRecurring().data;
  if (!schedules)
    return (
      <View style={{ gap: spacing.smd }}>
        <View style={{ gap: spacing.xs, paddingHorizontal: spacing.xs }}>
          <Text variant="headline">Recurring bills</Text>
          <Skeleton width={190} height={11} />
        </View>
        <View style={{ flexDirection: "row", gap: spacing.smd }}>
          <Skeleton width={TILE} height={176} radius={radius.card} />
          <Skeleton width={TILE} height={176} radius={radius.card} />
        </View>
      </View>
    );
  return <Rail schedules={schedules} />;
}

function Rail({ schedules }: { schedules: Schedule[] }) {
  const c = useColors();
  const toggle = useRecurringStore((s) => s.toggle);
  const list = [...schedules].sort((a, b) => Number(b.active) - Number(a.active) || a.nextRun.localeCompare(b.nextRun));
  const monthly = schedules.filter((x) => x.active).reduce((sum, x) => sum + x.amountNgn * PER_MONTH[x.frequency], 0);

  return (
    <View style={{ gap: spacing.smd }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: spacing.xs }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="headline">Recurring bills</Text>
          <Text variant="caption" tone="muted">
            {monthly > 0 ? `₦${Math.round(monthly).toLocaleString()}/month on autopilot` : "Set it once, never top up late again"}
          </Text>
        </View>
        <SectionLink label="Manage" onPress={() => router.push("/pay/recurring")} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md }} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.smd }}>
        {list.map((x) => {
          const b = billerById(x.billerId);
          return (
            <PressableScale
              key={x.id}
              onPress={() => router.push("/pay/recurring")}
              scaleTo={0.97}
              accessibilityLabel={`${b.name}${x.plan ? ` ${x.plan}` : ""}, ₦${x.amountNgn.toLocaleString()} ${FREQUENCY_LABEL[x.frequency].toLowerCase()}, paid with ${x.payWith}, ${x.active ? `renews ${untilLabel(x.nextRun).toLowerCase()}` : "paused"}`}
              style={{ width: TILE, backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.smd }}
            >
              {/* what pays (coin/flag) underneath, what it buys in front — same as the history rows */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ opacity: x.active ? 1 : 0.5 }}>
                  <PairIcon from={x.payWith} front={(sz) => <BillerThumb biller={b} size={sz} />} size={42} />
                </View>
                <BrandSwitch label={`${b.name} renews automatically`} value={x.active} onValueChange={() => toggle(x.id)} />
              </View>
              <View style={{ gap: spacing.xs, opacity: x.active ? 1 : 0.5 }}>
                <Text variant="subhead" tone="muted" numberOfLines={1}>
                  {b.name}
                  {x.plan ? ` · ${x.plan}` : ""}
                </Text>
                <Text variant="title" numberOfLines={1} adjustsFontSizeToFit style={{ fontVariant: ["tabular-nums"] }}>
                  ₦{x.amountNgn.toLocaleString()}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {FREQ_SHORT[x.frequency]} · {x.payWith}
                </Text>
              </View>
              {/* pinned to the bottom so every card's pill lines up */}
              <View style={{ marginTop: "auto", alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: x.active ? c.brandSoft : c.surfaceAlt, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs }}>
                <Icon name={x.active ? "repeat" : "pause"} size={11} color={x.active ? c.brandText : c.textMuted} weight="bold" />
                <Text variant="caption" numberOfLines={1} style={{ color: x.active ? c.brandText : c.textMuted, fontFamily: fonts.semibold }}>
                  {x.active ? untilLabel(x.nextRun) : "Paused"}
                </Text>
              </View>
            </PressableScale>
          );
        })}

        <PressableScale
          onPress={() => router.push("/recurring/new")}
          scaleTo={0.97}
          accessibilityLabel="Add a recurring bill"
          style={{ width: list.length ? TILE : TILE * 2, minHeight: 176, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1.5, borderStyle: "dashed", borderColor: c.borderStrong, padding: spacing.md, alignItems: "center", justifyContent: "center", gap: spacing.sm }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
            <Icon name="plus" size={18} color={c.onBrand} weight="bold" />
          </View>
          <Text variant="bodyStrong" align="center">
            Add a bill
          </Text>
          <Text variant="caption" tone="muted" align="center">
            Data, TV or light that renews itself
          </Text>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

/** A section's title, one line of what it's for, and an optional link — every block on Pay opens with one. */
function SectionIntro({ title, caption, action, onAction }: { title: string; caption: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.md, paddingHorizontal: spacing.xs }}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="headline">{title}</Text>
        <Text variant="caption" tone="muted">
          {caption}
        </Text>
      </View>
      {action && onAction && <SectionLink label={action} onPress={onAction} />}
    </View>
  );
}

/** Pay: bills by category, Token Vault, recurring bills, gift cards, then Cashpoints. */
export default function Pay() {
  const c = useColors();
  const vault = useVaultTokens();
  const tokens = vault.data ?? [];
  const activeCodes = (useTransactions().data ?? []).filter((t) => t.type === "cashpoint" && t.direction === "out" && t.status === "pending").length;
  const unused = tokens.filter((t) => !t.loadedOn);
  const phone = useSessionStore((s) => s.user.phone);
  const network = detectNetwork(phone.replace(/^\+234\s?/, "0")) ?? "mtn";
  const bill = (id: string, category: string) => () => router.push({ pathname: "/bill/[id]", params: { id, category } });
  const shortcuts: Shortcut[] = [
    { key: "airtime", label: "Airtime", icon: "airtime", go: bill(network, "airtime") },
    { key: "data", label: "Data", icon: "data", go: bill(network, "data") },
    { key: "tv", label: "TV", icon: "tv", go: bill("dstv", "tv") },
    { key: "electricity", label: "Electricity", icon: "bolt", go: bill("phed", "electricity") },
  ];

  return (
    <Screen>
      {/* Bills & more: one OPay-style grid */}
      <View style={{ gap: spacing.smd }}>
        <SectionIntro title="Pay bills" caption="Pay from any wallet: Naira, dollars or crypto." />
        <ShortcutGrid items={shortcuts} />
      </View>

      {/* Recurring bills (live): swipeable subscription cards */}
      <RecurringRail />

      {/* Token Vault */}
      <View style={{ gap: spacing.smd }}>
        <SectionIntro title="Token Vault" caption={vault.data ? `Every electricity token you buy, saved. ${tokens.length} in your vault so far.` : "Every electricity token you buy, saved."} action="Open" onAction={() => router.push("/pay/vault")} />
        {!vault.data ? (
          <Skeleton width="100%" height={80} radius={radius.group} />
        ) : (
          <PressableScale onPress={() => router.push("/pay/vault")} scaleTo={0.98} accessibilityLabel="Token Vault" style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: unused.length ? c.warningSoft : c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: unused.length ? c.pending : c.successSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="vault" size={21} color={unused.length ? "#fff" : c.success} />
            </View>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              {/* the header already says Token Vault: lead with what's in it */}
              <Text variant="bodyStrong">{unused.length ? `${unused.length} token${unused.length > 1 ? "s" : ""} waiting` : "All tokens loaded"}</Text>
              <Text variant="caption" tone="muted">
                {unused.length ? `${unused.reduce((s, t) => s + t.kwh, 0).toFixed(1)} kWh ready to load into your meter` : "New tokens land here the moment you buy them."}
              </Text>
            </View>
            <View style={{ backgroundColor: unused.length ? c.pending : c.surfaceAlt, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs }}>
              <Text variant="subhead" style={{ color: unused.length ? "#fff" : c.text }}>
                {unused.length ? "Load now" : "Open"}
              </Text>
            </View>
          </PressableScale>
        )}
      </View>


      {/* Gift cards: buy or sell, side by side */}
      <View style={{ gap: spacing.smd }}>
        <SectionIntro title="Gift cards" caption="Buy codes in seconds, or turn unused cards into any currency." action="See all" onAction={() => router.push("/pay/gift-cards")} />
        <View style={{ flexDirection: "row", gap: spacing.smd }}>
          <PressableScale onPress={() => router.push({ pathname: "/pay/gift-cards", params: { mode: "buy" } })} scaleTo={0.97} accessibilityLabel="Buy a gift card" style={{ flex: 1, backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.md }}>
            <View style={{ flexDirection: "row" }}>
              {GIFT_BRANDS.slice(0, 3).map((b, i) => (
                <View key={b.id} style={{ marginLeft: i ? -12 : 0, borderRadius: 20, borderWidth: 2, borderColor: c.surface, zIndex: 3 - i }}>
                  <GiftMark brand={b} size={34} />
                </View>
              ))}
            </View>
            <View style={{ gap: spacing.xxs }}>
              <Text variant="bodyStrong">Buy</Text>
              <Text variant="caption" tone="muted">
                {GIFT_BRANDS.length} brands · codes land instantly
              </Text>
            </View>
          </PressableScale>
          <PressableScale onPress={() => router.push({ pathname: "/pay/gift-cards", params: { mode: "sell" } })} scaleTo={0.97} accessibilityLabel="Sell a gift card" style={{ flex: 1, backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.md }}>
            <View style={{ flexDirection: "row" }}>
              {GIFT_BRANDS.slice(3, 6).map((b, i) => (
                <View key={b.id} style={{ marginLeft: i ? -12 : 0, borderRadius: 20, borderWidth: 2, borderColor: c.surface, zIndex: 3 - i }}>
                  <GiftMark brand={b} size={34} />
                </View>
              ))}
            </View>
            <View style={{ gap: spacing.xxs }}>
              <Text variant="bodyStrong">Sell</Text>
              <Text variant="caption" tone="muted">
                Up to ₦{Math.max(...GIFT_BRANDS.map((b) => b.sellRate)).toLocaleString()}/$ · paid in minutes
              </Text>
            </View>
          </PressableScale>
        </View>
      </View>

      {/* Cashpoints */}
      <View style={{ gap: spacing.smd }}>
        <SectionIntro
          title="Cashpoints"
          caption="Send Naira as a 12-digit code. Anyone can redeem it, even before they join."
          action={activeCodes ? `${activeCodes} active` : undefined}
          onAction={() => router.push("/cashpoint")}
        />
        {/* Cashpoints — the screen's one orange moment */}
        <View style={{ borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.orange[500], padding: spacing.mdl, gap: spacing.md }}>
          <View pointerEvents="none" style={{ position: "absolute", right: -46, top: -40, opacity: 0.14 }}>
            <CashpointMark size={190} plain />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
              <CashpointMark size={44} plain />
            </View>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="title" style={{ color: "#fff" }}>
                Cash in 12 digits
              </Text>
              <Text variant="caption" style={{ color: palette.orange[50] }}>
                Share it anywhere. They redeem it in seconds.
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: radius.input, paddingVertical: spacing.sm, paddingHorizontal: spacing.smd }}>
            {(["Pick an amount", "Share the code", "They redeem"] as const).map((step, i) => (
              <View key={step} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
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
            <PressableScale onPress={() => router.push("/cashpoint")} accessibilityLabel="Generate a Cashpoint" style={{ flex: 1, height: 46, borderRadius: radius.full, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs }}>
              <Icon name="add" size={16} color={palette.orange[700]} weight="bold" />
              <Text variant="bodyStrong" style={{ color: palette.orange[700] }}>
                Generate
              </Text>
            </PressableScale>
            <PressableScale onPress={() => router.push({ pathname: "/cashpoint", params: { mode: "redeem" } })} accessibilityLabel="Redeem a Cashpoint" style={{ flex: 1, height: 46, borderRadius: radius.full, backgroundColor: palette.orange[700], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs }}>
              <Icon name="receive" size={16} color="#fff" weight="bold" />
              <Text variant="bodyStrong" style={{ color: "#fff" }}>
                Redeem
              </Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Screen>
  );
}
