import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { BillerThumb } from "@/components/brand-tiles";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { Dropdown } from "@/components/dropdown";
import { Field } from "@/components/field";
import { FlowScreen } from "@/components/flow-screen";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { assetByCode, ASSETS_FIAT_FIRST, type AssetCode } from "@/data/assets";
import { BILLERS, billerById } from "@/data/catalog";
import { useFlowStore } from "@/stores/use-flow-store";
import { overlay } from "@/stores/use-overlay-store";
import { FREQUENCY_LABEL, type Frequency } from "@/stores/use-recurring-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";

const FIELD = { phone: ["Phone number", 11], smartcard: ["Smartcard / IUC number", 10], meter: ["Meter number", 11] } as const;
const FREQS: Frequency[] = ["weekly", "biweekly", "monthly"];

function startOptions() {
  const d = (n: number) => new Date(Date.now() + n * 864e5);
  const first = new Date();
  first.setMonth(first.getMonth() + 1, 1);
  return [
    { value: d(0).toISOString(), label: "Today" },
    { value: d(1).toISOString(), label: "Tomorrow" },
    { value: d(7).toISOString(), label: "In a week" },
    { value: first.toISOString(), label: `1st of ${first.toLocaleDateString("en-GB", { month: "long" })}` },
  ];
}

/** Set up a recurring bill: who, how much, paid with what, how often → review → PIN. */
export default function NewRecurring() {
  const c = useColors();
  const params = useLocalSearchParams<{ biller?: string }>();
  const phone = useSessionStore((s) => s.user.phone);
  const balances = useWalletStore((s) => s.balances);
  const opened = useWalletStore((s) => s.opened);
  const begin = useFlowStore((s) => s.begin);
  const [billerId, setBillerId] = useState(params.biller ?? "mtn");
  const b = billerById(billerId);
  const [target, setTarget] = useState(b.field === "phone" ? phone.replace(/^\+234\s?/, "0").replace(/\s/g, "") : "");
  const [planId, setPlanId] = useState<string | null>(b.plans?.[0]?.id ?? null);
  const [amount, setAmount] = useState("");
  const [payWith, setPayWith] = useState<AssetCode>("NGN");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [starts] = useState(startOptions);
  const [start, setStart] = useState(starts[1]);

  const plan = b.plans?.find((p) => p.id === planId);
  const amountNgn = plan ? plan.price : Number(amount) || 0;
  const [label, digits] = FIELD[b.field];
  const ok = target.replace(/\D/g, "").length >= digits && amountNgn >= 100;

  const pickBiller = () =>
    overlay.select({
      title: "What should renew?",
      value: billerId,
      options: BILLERS.map((x) => ({ value: x.id, label: x.name, sub: x.category === "electricity" ? "Prepaid electricity" : x.category === "tv" ? "TV subscription" : "Airtime & data", leading: <BillerThumb biller={x} size={36} /> })),
      onSelect: (id) => {
        const next = billerById(id);
        setBillerId(id);
        setPlanId(next.plans?.[0]?.id ?? null);
        setTarget(next.field === "phone" ? phone.replace(/^\+234\s?/, "0").replace(/\s/g, "") : "");
      },
    });

  const pickPlan = () =>
    overlay.select({
      title: "Plan",
      value: planId ?? "custom",
      options: [...(b.plans ?? []).map((p) => ({ value: p.id, label: p.name, trailing: `₦${p.price.toLocaleString()}` })), { value: "custom", label: "Custom amount" }],
      onSelect: (v) => setPlanId(v === "custom" ? null : v),
    });

  const pickPayWith = () =>
    overlay.select({
      title: "Pay with",
      value: payWith,
      options: ASSETS_FIAT_FIRST.filter((a) => opened.includes(a.code) && balances[a.code] > 0).map((a) => ({ value: a.code, label: a.name, sub: formatAsset(balances[a.code], a.code), leading: <CoinIcon code={a.code} size={36} /> })),
      onSelect: (v) => setPayWith(v as AssetCode),
    });

  const pickStart = () => overlay.select({ title: "First payment", value: start.value, options: starts, onSelect: (v) => setStart(starts.find((s) => s.value === v)!) });

  return (
    <FlowScreen
      title="Recurring bill"
      footer={
        <Button
          title="Continue"
          disabled={!ok}
          onPress={() => {
            begin({ kind: "recurring-create", billerId, target: b.field === "meter" ? `${target.slice(0, 4)} •••• ${target.slice(-2)}` : target, plan: plan?.name, amountNgn, payWith, frequency, start: start.value });
            router.push("/recurring/review");
          }}
        />
      }
    >
      <Dropdown label="Bill" value={b.name} sub={b.category === "electricity" ? "Prepaid electricity" : b.category === "tv" ? "TV subscription" : "Airtime & data"} leading={<BillerThumb biller={b} size={36} />} onPress={pickBiller} />
      <Field label={label} value={target} onChangeText={setTarget} keyboardType="number-pad" maxLength={digits + 2} placeholder={label} />
      {b.plans ? <Dropdown label="Plan" value={plan ? plan.name : "Custom amount"} right={plan ? `₦${plan.price.toLocaleString()}` : undefined} onPress={pickPlan} /> : null}
      {!plan && <Field label="Amount each time" value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="e.g. 10000" leading={<Text variant="bodyStrong" tone="muted">₦</Text>} hint="Minimum ₦100" />}
      <Dropdown label="Pay with" value={assetByCode(payWith).name} sub={formatAsset(balances[payWith], payWith)} leading={<CoinIcon code={payWith} size={36} />} onPress={pickPayWith} />
      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          How often
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {FREQS.map((f) => {
            const on = f === frequency;
            return (
              <PressableScale key={f} onPress={() => setFrequency(f)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: "center", paddingVertical: spacing.smd, borderRadius: radius.input, backgroundColor: on ? c.brand : c.surface }}>
                <Text variant="subhead" style={{ color: on ? c.onBrand : c.text }}>
                  {FREQUENCY_LABEL[f]}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
      <Dropdown label="First payment" value={start.label} sub={new Date(start.value).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} onPress={pickStart} />
    </FlowScreen>
  );
}
