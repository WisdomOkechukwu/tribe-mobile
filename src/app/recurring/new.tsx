import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { pushDigit } from "@/components/amount-entry";
import { AmountCard, BILL_FIELD, openWalletPicker, PayFromRow, PlanGrid, showsPlans, useFundedWallets } from "@/components/bill-bits";
import { BillerThumb } from "@/components/brand-tiles";
import { Button } from "@/components/button";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { KeyField, KeypadDock } from "@/components/keypad-field";
import { PairIcon } from "@/components/pair-icon";
import { PressableScale } from "@/components/pressable-scale";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import { assetByCode, type AssetCode } from "@/data/assets";
import { BILLERS, billerById } from "@/data/catalog";
import { useFlowStore } from "@/stores/use-flow-store";
import { type Frequency } from "@/stores/use-recurring-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { fonts, radius, spacing, useColors } from "@/theme";

const FREQS: { value: Frequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 wks" },
  { value: "monthly", label: "Monthly" },
];
const EVERY: Record<Frequency, string> = { weekly: "every week", biweekly: "every 2 weeks", monthly: "every month" };

function startOptions() {
  const d = (n: number) => new Date(Date.now() + n * 864e5);
  const first = new Date();
  first.setMonth(first.getMonth() + 1, 1);
  return [
    { value: d(0).toISOString(), label: "Today" },
    { value: d(1).toISOString(), label: "Tomorrow" },
    { value: d(7).toISOString(), label: "In a week" },
    { value: first.toISOString(), label: `1st ${first.toLocaleDateString("en-GB", { month: "short" })}` },
  ];
}

const localPhone = (p: string) => p.replace(/^\+234\s?/, "0").replace(/\D/g, "");

type Active = "target" | "amount" | null;

/**
 * Set up a recurring bill. A live preview of the subscription card sits on top and updates as
 * you choose: which bill (logo strip), the number and plan or amount (our keypad, docked), the
 * paying wallet, how often and when it starts → review → PIN.
 */
export default function NewRecurring() {
  const c = useColors();
  const params = useLocalSearchParams<{ biller?: string }>();
  const phone = useSessionStore((s) => s.user.phone);
  const balances = useWalletStore((s) => s.balances);
  const begin = useFlowStore((s) => s.begin);
  const funded = useFundedWallets();
  const [billerId, setBillerId] = useState(params.biller ?? "mtn");
  const b = billerById(billerId);
  const field = BILL_FIELD[b.field];
  // phone networks do both: airtime (an amount) or a data bundle
  const [phoneKind, setPhoneKind] = useState<"airtime" | "data">(b.category === "airtime" ? "airtime" : "data");
  const cat = b.field === "phone" ? phoneKind : b.category;
  const plansOn = showsPlans(b, cat);
  const [target, setTarget] = useState(b.field === "phone" ? localPhone(phone) : "");
  const [planId, setPlanId] = useState<string | null>(plansOn ? (b.plans?.[0]?.id ?? null) : null);
  const [amount, setAmount] = useState("");
  const [payWith, setPayWith] = useState<AssetCode>(() => (balances.NGN > 0 || !funded.length ? "NGN" : funded[0].code));
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [starts] = useState(startOptions);
  const [start, setStart] = useState(starts[1]);
  const [active, setActive] = useState<Active>(null);

  const plan = plansOn ? b.plans?.find((p) => p.id === planId) : undefined;
  const amountNgn = plan ? plan.price : Number(amount) || 0;
  const targetOk = target.length >= field.digits;
  const ok = targetOk && amountNgn >= 100;

  const chooseBiller = (id: string) => {
    const next = billerById(id);
    setBillerId(id);
    setPlanId(showsPlans(next, next.field === "phone" ? phoneKind : next.category) ? (next.plans?.[0]?.id ?? null) : null);
    setTarget(next.field === "phone" ? localPhone(phone) : "");
    setAmount("");
    setActive(next.field === "phone" ? null : "target");
  };
  const onKey = (d: string) => {
    if (active === "target") {
      if (target.length >= field.digits) return;
      const next = target + d;
      setTarget(next);
      if (next.length === field.digits) setActive(plan ? null : "amount");
    } else setAmount((v) => pushDigit(v, d, 0));
  };
  const onDelete = () => (active === "target" ? setTarget((v) => v.slice(0, -1)) : setAmount((v) => v.slice(0, -1)));

  return (
    <FlowScreen
      title="Recurring bill"
      footer={
        <>
          {active && <KeypadDock label={active === "target" ? field.label : "Amount each time"} onKey={onKey} onDelete={onDelete} onDone={() => setActive(null)} />}
          <Button
            title={amountNgn ? `Set up · ₦${amountNgn.toLocaleString()} ${EVERY[frequency]}` : "Set up"}
            disabled={!ok}
            onPress={() => {
              begin({ kind: "recurring-create", billerId, target: b.field === "meter" ? `${target.slice(0, 4)} •••• ${target.slice(-2)}` : target, plan: plan?.name, amountNgn, payWith, frequency, start: start.value });
              router.push("/recurring/review");
            }}
          />
        </>
      }
    >
      {/* live preview: the card this will become on the Pay tab */}
      <View style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", padding: spacing.md, gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <PairIcon from={payWith} front={(sz) => <BillerThumb biller={b} size={sz} />} size={44} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: c.brandSoft, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs }}>
            <Icon name="repeat" size={11} color={c.brandText} weight="bold" />
            <Text variant="caption" style={{ color: c.brandText, fontFamily: fonts.semibold }}>
              Starts {start.label.toLowerCase()}
            </Text>
          </View>
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text variant="subhead" tone="muted" numberOfLines={1}>
            {b.name}
            {plan ? ` · ${plan.name}` : ""}
          </Text>
          <Text variant="title" style={{ fontVariant: ["tabular-nums"] }}>
            ₦{amountNgn.toLocaleString()} <Text variant="body" tone="muted">{EVERY[frequency]}</Text>
          </Text>
          <Text variant="caption" tone="muted">
            From your {assetByCode(payWith).name} wallet · pause or cancel any time
          </Text>
        </View>
      </View>

      {/* which bill */}
      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          What renews
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} style={{ marginHorizontal: -spacing.mdl }} contentContainerStyle={{ paddingHorizontal: spacing.mdl, gap: spacing.smd }}>
          {BILLERS.map((x) => {
            const on = x.id === billerId;
            return (
              <PressableScale key={x.id} onPress={() => chooseBiller(x.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={x.name} style={{ alignItems: "center", gap: spacing.xs, width: 64 }}>
                <View style={{ padding: 3, borderRadius: 30, borderWidth: 2, borderColor: on ? c.brand : "transparent" }}>
                  <BillerThumb biller={x} size={48} />
                </View>
                <Text variant="caption" tone={on ? "brand" : "muted"} numberOfLines={1}>
                  {x.name}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      {b.field === "phone" && (
        <Segmented<"airtime" | "data">
          value={phoneKind}
          onChange={(v) => {
            setPhoneKind(v);
            setPlanId(v === "data" ? (b.plans?.[0]?.id ?? null) : null);
          }}
          options={[
            { value: "airtime", label: "Airtime" },
            { value: "data", label: "Data" },
          ]}
        />
      )}

      <KeyField label={field.label} value={target} placeholder={field.placeholder} groups={[...field.groups]} active={active === "target"} onPress={() => setActive("target")} />

      {plansOn && (
        <PlanGrid
          plans={b.plans!}
          value={planId}
          onChange={(p) => {
            setPlanId(p);
            setActive(p ? null : "amount");
          }}
        />
      )}
      {!plan && (
        <AmountCard
          label="Amount each time"
          value={amount}
          active={active === "amount"}
          onPress={() => setActive("amount")}
          helper="Minimum ₦100"
          presets={b.category === "electricity" ? [{ label: "₦5k", value: "5000" }, { label: "₦10k", value: "10000" }, { label: "₦20k", value: "20000" }] : [{ label: "₦1k", value: "1000" }, { label: "₦2k", value: "2000" }, { label: "₦5k", value: "5000" }]}
          onPreset={(v) => {
            setAmount(v);
            setActive(null);
          }}
        />
      )}

      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          How often
        </Text>
        <Segmented options={FREQS} value={frequency} onChange={setFrequency} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          First payment
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {starts.map((s) => {
            const on = s.value === start.value;
            return (
              <PressableScale key={s.value} onPress={() => setStart(s)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: on ? c.brand : c.surface }}>
                <Text variant="subhead" style={{ color: on ? c.onBrand : c.text }}>
                  {s.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <PayFromRow payWith={payWith} amountNgn={amountNgn} onPress={() => openWalletPicker({ value: payWith, amountNgn, onSelect: setPayWith })} />
    </FlowScreen>
  );
}
