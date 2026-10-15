import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { pushDigit } from "@/components/amount-entry";
import { AmountCard, AmountGrid, BILL_FIELD, billCategory, BundleGrid, costIn, CustomerCard, openSavedNumbers, openWalletPicker, PayFromRow, ProviderRow, useFundedWallets, type BillCategory } from "@/components/bill-bits";
import { BillerThumb } from "@/components/brand-tiles";
import { Button } from "@/components/button";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { KeyField, KeypadDock } from "@/components/keypad-field";
import { PressableScale } from "@/components/pressable-scale";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { assetByCode, type AssetCode } from "@/data/assets";
import { BILLERS, billerById, detectNetwork, type PlanPeriod } from "@/data/catalog";
import { useFlowStore } from "@/stores/use-flow-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";

const LABEL: Record<BillCategory, string> = { airtime: "Airtime", data: "Data", tv: "TV", electricity: "Electricity" };
const AIRTIME = [100, 200, 500, 1_000, 2_000, 5_000];
const POWER = [1_000, 2_000, 3_000, 5_000, 10_000, 20_000];
const PERIODS: { value: PlanPeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
const NGN_PER_KWH = 438.6;
const PHONE_BILLERS = BILLERS.filter((b) => b.field === "phone");

type Active = "target" | "amount" | null;

const grouped = (v: string, groups: readonly number[]) => {
  const out: string[] = [];
  let i = 0;
  for (const g of groups) {
    if (i >= v.length) break;
    out.push(v.slice(i, i + g));
    i += g;
  }
  return out.join(" ");
};

/**
 * Bills, OPay-style (one kind per screen: Airtime, Data, TV or Electricity): the provider from a row of
 * logos (phone networks are detected from the number, and you can override), the number (with
 * your saved numbers one tap away), then a quick amount tile or a bundle/package, and which
 * wallet pays. Every number is typed on our docked keypad, never the system keyboard.
 */
export default function Bill() {
  const c = useColors();
  // target/amount pre-fill "Pay again"; category says which Pay icon you came from
  const { id, target: preTarget, amount: preAmount, category: catParam } = useLocalSearchParams<{ id: string; target?: string; amount?: string; category?: string }>();
  const myPhone = useSessionStore((s) => s.user.phone).replace(/^\+234\s?/, "0").replace(/\D/g, "");
  const balances = useWalletStore((s) => s.balances);
  const transactions = useWalletStore((s) => s.transactions);
  const begin = useFlowStore((s) => s.begin);
  const funded = useFundedWallets();

  // Airtime and Data are separate screens (the Pay icon you tapped decides)
  const [cat] = useState<BillCategory>(() => billCategory(billerById(id), catParam));
  const phoneCat = cat === "airtime" || cat === "data";
  const billers = phoneCat ? PHONE_BILLERS : BILLERS.filter((b) => b.category === cat);
  const entry = billerById(id);
  const [target, setTarget] = useState(preTarget ?? (entry.field === "phone" ? myPhone : ""));
  // the provider you tapped wins until you type a new number (then the prefix decides again)
  const [manual, setManual] = useState<string | null>(id ?? null);
  const detected = phoneCat ? detectNetwork(target) : null;
  const b = billers.find((x) => x.id === (manual ?? detected)) ?? billers.find((x) => x.id === id) ?? billers[0];
  const field = BILL_FIELD[b.field];

  const [period, setPeriod] = useState<PlanPeriod>("monthly");
  const [planId, setPlanId] = useState<string | null>(() => (preAmount ? (b.plans?.find((p) => p.price === Number(preAmount))?.id ?? null) : null));
  const [amount, setAmount] = useState(preAmount ?? "");
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [payWith, setPayWith] = useState<AssetCode>(() => (balances.NGN > 0 || !funded.length ? "NGN" : funded[0].code));

  const planned = cat === "data" || cat === "tv";
  const plans = planned ? (b.plans ?? []).filter((p) => cat === "tv" || p.period === period) : [];
  const plan = planned ? b.plans?.find((p) => p.id === planId) : undefined;
  const targetOk = target.length >= field.digits;
  const [active, setActive] = useState<Active>(!targetOk ? "target" : null);

  const amountNgn = planned ? (plan?.price ?? 0) : Number(amount) || 0;
  const over = costIn(amountNgn, payWith) > balances[payWith];
  const ok = targetOk && amountNgn >= 100 && !over;
  const masked = b.field === "meter" ? `${target.slice(0, 4)} •••• ${target.slice(-2)}` : target;

  const changeTarget = (next: string) => {
    setTarget(next);
    setManual(null);
  };
  const typeTarget = (d: string) => {
    if (target.length >= field.digits) return;
    const next = target + d;
    changeTarget(next);
    // number complete: on to the amount for typed amounts, otherwise close the pad
    if (next.length === field.digits) setActive(null);
  };
  const onKey = (d: string) => (active === "target" ? typeTarget(d) : setAmount((v) => pushDigit(v, d, 0)));
  const onDelete = () => (active === "target" ? changeTarget(target.slice(0, -1)) : setAmount((v) => v.slice(0, -1)));

  const saved = () => {
    const seen = new Set<string>();
    const items: Parameters<typeof openSavedNumbers>[0]["items"] = [];
    if (b.field === "phone" && myPhone) {
      seen.add(myPhone);
      items.push({ value: myPhone, label: grouped(myPhone, field.groups), sub: "My number", biller: billerById(detectNetwork(myPhone) ?? b.id) });
    }
    for (const t of transactions) {
      const v = t.meta?.target;
      if (t.type !== "bill" || !v || seen.has(v) || !t.meta?.billerId || billerById(t.meta.billerId).field !== b.field || !/^\d+$/.test(v)) continue;
      seen.add(v);
      const tb = billerById(t.meta.billerId);
      items.push({ value: v, label: grouped(v, field.groups), sub: `${tb.name} · paid ${new Date(t.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`, biller: tb });
    }
    openSavedNumbers({ title: b.field === "phone" ? "Saved numbers" : b.field === "meter" ? "Saved meters" : "Saved smartcards", items, onPick: (v) => {
      changeTarget(v);
      setActive(null);
    } });
  };

  // illustrative account lookups once a number is complete
  const customer =
    !targetOk || phoneCat
      ? null
      : cat === "tv"
        ? { name: "ADA OKAFOR", lines: [`${b.name} · Compact (active)`, "Renews 2 Nov"] }
        : { name: "ADA OKAFOR", lines: ["16 Admiralty Way, Lekki", `${b.name} · ${meterType === "prepaid" ? "Prepaid" : "Postpaid"} meter`] };
  const wallet = payWith !== "NGN" ? (n: number) => `≈ ${formatAsset(costIn(n, payWith), payWith)}` : undefined;

  return (
    <FlowScreen
      title={LABEL[cat]}
      footer={
        <>
          {active && <KeypadDock label={active === "target" ? field.label : "Amount"} onKey={onKey} onDelete={onDelete} onDone={() => setActive(null)} />}
          <Button
            title={amountNgn ? `Pay ₦${amountNgn.toLocaleString()}` : "Pay"}
            disabled={!ok}
            onPress={() => {
              begin({ kind: "bill", billerId: b.id, amountNgn, payWith, target: masked, account: target, category: cat, meterType: cat === "electricity" ? meterType : undefined, plan: plan?.name });
              router.push("/bill/review");
            }}
          />
        </>
      }
    >
      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          {phoneCat ? "Network" : "Provider"}
        </Text>
        <ProviderRow
          billers={billers}
          value={b.id}
          onChange={(nid) => {
            setManual(nid);
            setPlanId(null);
          }}
        />
      </View>

      {cat === "electricity" && (
        <Segmented<"prepaid" | "postpaid">
          value={meterType}
          onChange={setMeterType}
          options={[
            { value: "prepaid", label: "Prepaid" },
            { value: "postpaid", label: "Postpaid" },
          ]}
        />
      )}

      <View style={{ gap: spacing.sm }}>
        <KeyField
          label={field.label}
          value={target}
          placeholder={field.placeholder}
          groups={[...field.groups]}
          active={active === "target"}
          onPress={() => setActive("target")}
          leading={phoneCat && detected ? <BillerThumb biller={billerById(detected)} size={24} /> : undefined}
          trailing={
            <PressableScale onPress={saved} hitSlop={8} accessibilityLabel="Saved numbers" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="people" size={15} color={c.brandText} />
            </PressableScale>
          }
          hint={phoneCat && targetOk ? `${b.name} line${detected && detected !== b.id ? ` · number looks like ${billerById(detected).name}` : ""}` : undefined}
          hintTone={detected && detected !== b.id ? "muted" : "success"}
        />
        {customer && <CustomerCard name={customer.name} lines={customer.lines} />}
      </View>

      {cat === "data" && (
        <View style={{ gap: spacing.smd }}>
          <Segmented<PlanPeriod> value={period} onChange={setPeriod} options={PERIODS} />
          {plans.length ? (
            <BundleGrid plans={plans} value={planId} onChange={setPlanId} />
          ) : (
            <Text variant="body" tone="muted" align="center">
              No {period} bundles on {b.name} right now.
            </Text>
          )}
        </View>
      )}

      {cat === "tv" && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
            Package
          </Text>
          <BundleGrid plans={plans} value={planId} onChange={setPlanId} columns={2} />
        </View>
      )}

      {(cat === "airtime" || cat === "electricity") && (
        <View style={{ gap: spacing.smd }}>
          <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
            {cat === "airtime" ? "Top up" : "Amount"}
          </Text>
          <AmountGrid
            amounts={cat === "airtime" ? AIRTIME : POWER}
            value={Number(amount) || 0}
            onPick={(n) => {
              setAmount(String(n));
              setActive(null);
            }}
            sub={cat === "electricity" && meterType === "prepaid" ? (n) => `≈ ${(n / NGN_PER_KWH).toFixed(1)} kWh` : wallet}
          />
          <AmountCard
            label="Other amount"
            value={amount}
            active={active === "amount"}
            onPress={() => setActive("amount")}
            helper={cat === "electricity" && meterType === "prepaid" && amount ? `≈ ${((Number(amount) || 0) / NGN_PER_KWH).toFixed(1)} kWh` : "Minimum ₦100"}
            onPreset={setAmount}
          />
        </View>
      )}

      <PayFromRow payWith={payWith} amountNgn={amountNgn} onPress={() => openWalletPicker({ value: payWith, amountNgn, onSelect: setPayWith })} />
      {cat === "electricity" && meterType === "prepaid" && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.brandSoft, borderRadius: radius.input, padding: spacing.smd }}>
          <Icon name="vault" size={15} color={c.brandText} />
          <Text variant="caption" style={{ flex: 1 }}>
            Your token lands in the Token Vault the second you pay{payWith !== "NGN" ? `, paid from ${assetByCode(payWith).name}` : ""}.
          </Text>
        </View>
      )}
    </FlowScreen>
  );
}
