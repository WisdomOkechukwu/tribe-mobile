import { Pressable, View } from "react-native";
import { assetByCode, ASSETS_FIAT_FIRST, type AssetCode } from "@/data/assets";
import type { BillPlan, Biller } from "@/data/catalog";
import { overlay } from "@/stores/use-overlay-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { fonts, radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";
import { groupAmount } from "./amount-entry";
import { BillerThumb } from "./brand-tiles";
import { CoinIcon } from "./coin-icon";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** Shared pieces of the bill screen and the recurring-bill form. */

export type BillCategory = "airtime" | "data" | "tv" | "electricity";
export const BILL_FIELD = {
  phone: { label: "Phone number", placeholder: "0803 555 0142", digits: 11, groups: [4, 3, 4] },
  smartcard: { label: "Smartcard / IUC number", placeholder: "10-digit smartcard", digits: 10, groups: [4, 3, 3] },
  meter: { label: "Meter number", placeholder: "11-digit meter number", digits: 11, groups: [4, 4, 3] },
} as const;

/** What the category tile said, falling back to the biller's own category. */
export function billCategory(b: Biller, param?: string): BillCategory {
  if (param === "airtime" || param === "data" || param === "tv" || param === "electricity") return param;
  return b.category;
}

/** Plans are only for data bundles and TV packages; airtime and electricity are amount-only. */
export const showsPlans = (b: Biller, cat: BillCategory) => !!b.plans?.length && (cat === "data" || cat === "tv");

/** NGN → `code`, at the illustrative rate (bills are always priced in Naira). */
export const costIn = (amountNgn: number, code: AssetCode) => (amountNgn * assetByCode("NGN").usd) / assetByCode(code).usd;

/** Wallets that can pay: opened, with money in them, Naira first. */
export function useFundedWallets() {
  const balances = useWalletStore((s) => s.balances);
  const opened = useWalletStore((s) => s.opened);
  return ASSETS_FIAT_FIRST.filter((a) => opened.includes(a.code) && balances[a.code] > 0);
}

export function openWalletPicker({ value, amountNgn, onSelect }: { value: AssetCode; amountNgn: number; onSelect: (c: AssetCode) => void }) {
  const { balances, opened } = useWalletStore.getState();
  overlay.select({
    title: "Pay from",
    subtitle: amountNgn ? `Bills are priced in Naira. Any wallet can pay ₦${amountNgn.toLocaleString()}.` : "Any wallet with money in it can pay.",
    value,
    options: ASSETS_FIAT_FIRST.filter((a) => opened.includes(a.code) && balances[a.code] > 0).map((a) => {
      const need = costIn(amountNgn, a.code);
      return {
        value: a.code,
        label: `${a.name} wallet`,
        sub: `Balance ${formatAsset(balances[a.code], a.code)}`,
        leading: <CoinIcon code={a.code} size={36} />,
        trailing: amountNgn ? (need > balances[a.code] ? "Not enough" : formatAsset(need, a.code)) : undefined,
      };
    }),
    onSelect: (v) => onSelect(v as AssetCode),
  });
}

/** One slim row: which wallet pays, its balance, and what this costs in it. */
export function PayFromRow({ payWith, amountNgn, onPress }: { payWith: AssetCode; amountNgn: number; onPress: () => void }) {
  const c = useColors();
  const balance = useWalletStore((s) => s.balances[payWith]);
  const cost = costIn(amountNgn, payWith);
  const over = cost > balance;
  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Pay from ${assetByCode(payWith).name} wallet, change`}>
        {({ pressed }) => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: pressed ? c.surfaceAlt : c.surface, borderRadius: radius.input, borderCurve: "continuous", paddingHorizontal: spacing.md, paddingVertical: spacing.smd }}>
            <CoinIcon code={payWith} size={30} />
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="caption" tone="muted">
                Pay from
              </Text>
              <Text variant="bodyStrong" numberOfLines={1}>
                {assetByCode(payWith).name} wallet
              </Text>
            </View>
            <Text variant="subhead" tone="muted">
              {formatAsset(balance, payWith)}
            </Text>
            <Icon name="chevronDown" size={11} color={c.textMuted} weight="bold" />
          </View>
        )}
      </Pressable>
      {amountNgn > 0 && payWith !== "NGN" && (
        <Text variant="caption" tone={over ? "danger" : "muted"} style={{ paddingHorizontal: spacing.xs }}>
          {over ? `Not enough in your ${assetByCode(payWith).name} wallet` : `You'll pay ${formatAsset(cost, payWith)} · no fee`}
        </Text>
      )}
      {amountNgn > 0 && payWith === "NGN" && over && (
        <Text variant="caption" tone="danger" style={{ paddingHorizontal: spacing.xs }}>
          Not enough in your Naira wallet
        </Text>
      )}
    </View>
  );
}

/** "1GB · 7 days" → ["1GB", "7 days"]; "Compact" → ["Compact", ""]. */
const splitPlan = (name: string) => {
  const [head, ...rest] = name.split(" · ");
  return [head, rest.join(" · ")] as const;
};

/** Plans as a 2-column grid of tiles (size big, validity small, price), plus a Custom tile. */
export function PlanGrid({ plans, value, onChange }: { plans: { id: string; name: string; price: number }[]; value: string | null; onChange: (id: string | null) => void }) {
  const c = useColors();
  const tiles = [...plans.map((p) => ({ ...p, custom: false })), { id: "custom", name: "Custom · Any amount", price: 0, custom: true }];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.smd }}>
      {tiles.map((p) => {
        const on = (value ?? "custom") === p.id;
        const [head, sub] = splitPlan(p.name);
        return (
          <PressableScale
            key={p.id}
            scaleTo={0.97}
            onPress={() => onChange(p.custom ? null : p.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={p.custom ? "Custom amount" : `${p.name}, ₦${p.price.toLocaleString()}`}
            style={{ width: "48%", flexGrow: 1, backgroundColor: on ? c.brandSoft : c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, gap: spacing.sm, borderWidth: 1.5, borderColor: on ? c.brand : "transparent" }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.xs }}>
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <Text variant="headline" numberOfLines={1}>
                  {head}
                </Text>
                {sub ? (
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {sub}
                  </Text>
                ) : null}
              </View>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: on ? 0 : 1.5, borderColor: c.borderStrong, backgroundColor: on ? c.brand : "transparent", alignItems: "center", justifyContent: "center" }}>
                {on && <Icon name="check" size={11} color={c.onBrand} weight="bold" />}
              </View>
            </View>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, color: on ? c.brandText : c.text }}>{p.custom ? "You choose" : `₦${p.price.toLocaleString()}`}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** The amount as a big tappable card: tap to type it on the docked keypad; quick presets below. */
export function AmountCard({ value, active, onPress, helper, presets, onPreset, label = "Amount" }: { value: string; active: boolean; onPress: () => void; helper?: string; presets?: { label: string; value: string }[]; onPreset: (v: string) => void; label?: string }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.md, borderWidth: 1.5, borderColor: active ? c.brand : "transparent" }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ₦${groupAmount(value)}`} accessibilityHint="Opens the keypad" style={{ alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs }}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="hero" adjustsFontSizeToFit numberOfLines={1} style={{ fontSize: 40, lineHeight: 46, color: value ? c.text : c.textSubtle }}>
          ₦{groupAmount(value)}
        </Text>
        {helper ? (
          <Text variant="label" tone="muted">
            {helper}
          </Text>
        ) : null}
      </Pressable>
      {presets && (
        <View style={{ flexDirection: "row", gap: spacing.sm, justifyContent: "center" }}>
          {presets.map((p) => {
            const on = p.value === value;
            return (
              <PressableScale key={p.label} onPress={() => onPreset(p.value)} style={{ flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: on ? c.brand : c.surfaceAlt }}>
                <Text variant="label" style={{ color: on ? c.onBrand : c.text }}>
                  {p.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      )}
    </View>
  );
}

/**
 * OPay-style provider row: every provider's logo in a line, the chosen one ringed. Switch in
 * place instead of going back to a picker.
 */
export function ProviderRow({ billers, value, onChange }: { billers: Biller[]; value: string; onChange: (id: string) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", gap: spacing.md }}>
      {billers.map((b) => {
        const on = b.id === value;
        return (
          <PressableScale key={b.id} onPress={() => onChange(b.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={b.name} style={{ alignItems: "center", gap: spacing.xs }}>
            <View style={{ padding: 3, borderRadius: 30, borderWidth: 2, borderColor: on ? c.brand : "transparent" }}>
              <BillerThumb biller={b} size={46} />
            </View>
            <Text variant="caption" tone={on ? "text" : "muted"} style={on ? { fontFamily: fonts.semibold } : undefined}>
              {b.name}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

/**
 * Quick amounts as a 3-column tile grid (OPay's "Top up" grid): the amount big, a small line
 * under it (what it is in your paying wallet, or kWh for electricity). Selected gets the brand outline.
 */
export function AmountGrid({ amounts, value, onPick, sub }: { amounts: number[]; value: number; onPick: (n: number) => void; sub?: (n: number) => string | undefined }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {amounts.map((n) => {
        const on = n === value;
        const line = sub?.(n);
        return (
          <PressableScale
            key={n}
            scaleTo={0.96}
            onPress={() => onPick(n)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`₦${n.toLocaleString()}${line ? `, ${line}` : ""}`}
            style={{ width: "31.5%", flexGrow: 1, alignItems: "center", gap: 2, paddingVertical: spacing.smd, borderRadius: radius.group, borderCurve: "continuous", backgroundColor: on ? c.brandSoft : c.surface, borderWidth: 1.5, borderColor: on ? c.brand : "transparent" }}
          >
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 23, color: on ? c.brandText : c.text, fontVariant: ["tabular-nums"] }}>₦{n.toLocaleString()}</Text>
            {line ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {line}
              </Text>
            ) : null}
          </PressableScale>
        );
      })}
    </View>
  );
}

/** "1GB · 7 days" → ["1GB", "7 days"]. */
const sizeAndValidity = (name: string) => {
  const [head, ...rest] = name.split(" · ");
  return [head, rest.join(" · ")] as const;
};

/**
 * Data bundles / TV packages as tiles (3 across for data, 2 for TV): the size or package name
 * big, validity small, the price at the foot.
 */
export function BundleGrid({ plans, value, onChange, columns = 3 }: { plans: BillPlan[]; value: string | null; onChange: (id: string) => void; columns?: 2 | 3 }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {plans.map((p) => {
        const on = p.id === value;
        const [head, sub] = sizeAndValidity(p.name);
        return (
          <PressableScale
            key={p.id}
            scaleTo={0.96}
            onPress={() => onChange(p.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${p.name}, ₦${p.price.toLocaleString()}`}
            style={{ width: columns === 3 ? "31.5%" : "48%", flexGrow: 1, gap: spacing.xs, padding: spacing.smd, borderRadius: radius.group, borderCurve: "continuous", backgroundColor: on ? c.brandSoft : c.surface, borderWidth: 1.5, borderColor: on ? c.brand : "transparent" }}
          >
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 23, color: on ? c.brandText : c.text }} numberOfLines={1}>
              {head}
            </Text>
            {sub ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {sub}
              </Text>
            ) : null}
            <Text variant="subhead" style={{ marginTop: spacing.xs }}>
              ₦{p.price.toLocaleString()}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** The account a number belongs to, once it's complete (illustrative lookup). */
export function CustomerCard({ name, lines }: { name: string; lines: string[] }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: c.successSoft, borderRadius: radius.input, borderCurve: "continuous", padding: spacing.smd }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.success, alignItems: "center", justifyContent: "center" }}>
        <Icon name="check" size={15} color="#fff" weight="bold" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        {lines.map((l) => (
          <Text key={l} variant="caption" tone="muted" numberOfLines={1}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Saved numbers for a field: yours first, then ones you've paid before. Tap to fill. */
export function openSavedNumbers({ title, items, onPick }: { title: string; items: { value: string; label: string; sub?: string; billerId?: string; biller?: Biller }[]; onPick: (v: string) => void }) {
  overlay.select({
    title,
    subtitle: items.length ? "Numbers you've paid for before" : "Nothing saved yet. Numbers you pay for show up here.",
    options: items.map((i) => ({ value: i.value, label: i.label, sub: i.sub, leading: i.biller ? <BillerThumb biller={i.biller} size={36} /> : undefined })),
    onSelect: onPick,
  });
}
