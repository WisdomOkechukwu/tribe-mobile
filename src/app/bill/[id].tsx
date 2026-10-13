import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { pushDigit } from "@/components/amount-entry";
import { AmountCard, BILL_FIELD, billCategory, costIn, openWalletPicker, PayFromRow, PlanGrid, showsPlans, useFundedWallets, type BillCategory } from "@/components/bill-bits";
import { BillerThumb } from "@/components/brand-tiles";
import { Button } from "@/components/button";
import { FlowScreen } from "@/components/flow-screen";
import { KeyField, KeypadDock } from "@/components/keypad-field";
import { Text } from "@/components/text";
import type { AssetCode } from "@/data/assets";
import { billerById } from "@/data/catalog";
import { useFlowStore } from "@/stores/use-flow-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";

const SUBTITLE: Record<BillCategory, string> = { airtime: "Airtime top-up", data: "Data bundle", tv: "TV subscription", electricity: "Prepaid electricity" };
const NGN_PER_KWH = 438.6;

type Active = "target" | "amount" | null;

/**
 * Bills: who → plan or amount → which wallet pays → review → PIN. Every number (meter, phone,
 * smartcard, amount) is typed on ONE docked brand keypad, never the system keyboard: tap a field
 * and the dock types into it; a complete number moves you on to the amount.
 * `?category=` comes from the Pay tile, so MTN under Airtime is airtime, not data plans.
 */
export default function Bill() {
  const c = useColors();
  // target/amount pre-fill "Pay again"; category says which Pay tile you came from
  const { id, target: preTarget, amount: preAmount, category: catParam } = useLocalSearchParams<{ id: string; target?: string; amount?: string; category?: string }>();
  const b = billerById(id);
  const cat = billCategory(b, catParam);
  const plansOn = showsPlans(b, cat);
  const phone = useSessionStore((s) => s.user.phone);
  const balances = useWalletStore((s) => s.balances);
  const begin = useFlowStore((s) => s.begin);
  const field = BILL_FIELD[b.field];

  const [target, setTarget] = useState(preTarget ?? (b.field === "phone" ? phone.replace(/^\+234\s?/, "0").replace(/\D/g, "") : ""));
  const prePlan = plansOn && preAmount ? b.plans?.find((p) => p.price === Number(preAmount)) : undefined;
  const [plan, setPlan] = useState<string | null>(plansOn ? (preAmount ? (prePlan?.id ?? null) : (b.plans?.[0]?.id ?? null)) : null);
  const [amount, setAmount] = useState(preAmount && !prePlan ? preAmount : "");
  const funded = useFundedWallets();
  const [payWith, setPayWith] = useState<AssetCode>(() => (balances.NGN > 0 || !funded.length ? "NGN" : funded[0].code));

  const targetOk = target.length >= field.digits;
  const chosen = plansOn ? b.plans?.find((p) => p.id === plan) : undefined;
  const needsAmount = !chosen;
  // the keypad opens on whatever still needs typing
  const [active, setActive] = useState<Active>(!targetOk ? "target" : needsAmount && !amount ? "amount" : null);

  const amountNgn = chosen ? chosen.price : Number(amount) || 0;
  const over = costIn(amountNgn, payWith) > balances[payWith];
  const ok = targetOk && amountNgn >= 100 && !over;
  const masked = b.field === "meter" ? `${target.slice(0, 4)} •••• ${target.slice(-2)}` : target;

  const typeTarget = (d: string) => {
    if (target.length >= field.digits) return;
    const next = target + d;
    setTarget(next);
    // number complete: move on to the amount, or close if a plan already covers it
    if (next.length === field.digits) setActive(needsAmount ? "amount" : null);
  };
  const onKey = (d: string) => (active === "target" ? typeTarget(d) : setAmount((v) => pushDigit(v, d, 0)));
  const onDelete = () => (active === "target" ? setTarget((v) => v.slice(0, -1)) : setAmount((v) => v.slice(0, -1)));
  const resolved = targetOk && b.field !== "phone" ? (b.field === "meter" ? "ADA OKAFOR · 16 Admiralty Way" : "ADA OKAFOR · Compact (active)") : targetOk ? `${b.name} line` : undefined;

  return (
    <FlowScreen
      title={b.name}
      footer={
        <>
          {active && <KeypadDock label={active === "target" ? field.label : "Amount"} onKey={onKey} onDelete={onDelete} onDone={() => setActive(null)} />}
          <Button
            title={amountNgn ? `Continue · ₦${amountNgn.toLocaleString()}` : "Continue"}
            disabled={!ok}
            onPress={() => {
              begin({ kind: "bill", billerId: b.id, amountNgn, payWith, target: masked, plan: chosen?.name }, `/bill/${b.id}`);
              router.push("/bill/review");
            }}
          />
        </>
      }
    >
      {/* biller */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
        <BillerThumb biller={b} size={44} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="headline">{b.name}</Text>
          <Text variant="caption" tone="muted">
            {SUBTITLE[cat]}
          </Text>
        </View>
        {cat === "electricity" && (
          <View style={{ backgroundColor: c.brandSoft, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs }}>
            <Text variant="caption" tone="brand">
              Token → Vault
            </Text>
          </View>
        )}
      </View>

      <KeyField label={field.label} value={target} placeholder={field.placeholder} groups={[...field.groups]} active={active === "target"} onPress={() => setActive("target")} hint={resolved} hintTone="success" />

      {plansOn && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
            {cat === "tv" ? "Package" : "Bundle"}
          </Text>
          <PlanGrid
            plans={b.plans!}
            value={plan}
            onChange={(p) => {
              setPlan(p);
              setActive(p ? null : "amount");
            }}
          />
        </View>
      )}

      {needsAmount && (
        <AmountCard
          value={amount}
          active={active === "amount"}
          onPress={() => setActive("amount")}
          helper={cat === "electricity" ? `≈ ${((Number(amount) || 0) / NGN_PER_KWH).toFixed(1)} kWh` : "Minimum ₦100"}
          presets={cat === "electricity" ? [{ label: "₦5k", value: "5000" }, { label: "₦10k", value: "10000" }, { label: "₦15k", value: "15000" }] : [{ label: "₦500", value: "500" }, { label: "₦1k", value: "1000" }, { label: "₦2k", value: "2000" }]}
          onPreset={(v) => {
            setAmount(v);
            setActive(null);
          }}
        />
      )}

      <PayFromRow payWith={payWith} amountNgn={amountNgn} onPress={() => openWalletPicker({ value: payWith, amountNgn, onSelect: setPayWith })} />
    </FlowScreen>
  );
}
