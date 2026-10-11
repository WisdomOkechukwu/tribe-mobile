import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AmountEntry } from "@/components/amount-entry";
import { BillerThumb } from "@/components/brand-tiles";
import { Button } from "@/components/button";
import { CoinIcon } from "@/components/coin-icon";
import { Field } from "@/components/field";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { ChipRow, useChipText } from "@/components/sheet";
import { Text } from "@/components/text";
import { assetByCode, ASSETS_FIAT_FIRST, type AssetCode } from "@/data/assets";
import { billerById } from "@/data/catalog";
import { useFlowStore } from "@/stores/use-flow-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { spacing, useColors } from "@/theme";
import { formatAsset } from "@/utils/format";

const FIELD = {
  phone: { label: "Phone number", placeholder: "0803 555 0142", digits: 11 },
  smartcard: { label: "Smartcard / IUC number", placeholder: "10-digit smartcard", digits: 10 },
  meter: { label: "Meter number", placeholder: "11-digit meter number", digits: 11 },
} as const;

/** Bills: who/which plan/how much/pay with → review → PIN. Electricity tokens go to the Vault. */
export default function Bill() {
  const c = useColors();
  const chipText = useChipText();
  // target/amount pre-fill "Pay again" from the Pay hub
  const { id, target: preTarget, amount: preAmount } = useLocalSearchParams<{ id: string; target?: string; amount?: string }>();
  const b = billerById(id);
  const phone = useSessionStore((s) => s.user.phone);
  const balances = useWalletStore((s) => s.balances);
  const opened = useWalletStore((s) => s.opened);
  const begin = useFlowStore((s) => s.begin);
  const field = FIELD[b.field];
  const [target, setTarget] = useState(preTarget ?? (b.field === "phone" ? phone.replace(/^\+234\s?/, "0").replace(/\s/g, "") : ""));
  const prePlan = preAmount ? b.plans?.find((p) => p.price === Number(preAmount)) : undefined;
  const [plan, setPlan] = useState<string | null>(preAmount ? (prePlan?.id ?? null) : (b.plans?.[0]?.id ?? null));
  const [amount, setAmount] = useState(preAmount && !prePlan ? preAmount : "");
  const [payWith, setPayWith] = useState<AssetCode>("NGN");

  const chosen = b.plans?.find((p) => p.id === plan);
  const amountNgn = chosen ? chosen.price : Number(amount) || 0;
  const cost = (amountNgn * assetByCode("NGN").usd) / assetByCode(payWith).usd;
  const over = cost > balances[payWith];
  const targetOk = target.replace(/\D/g, "").length >= field.digits;
  const ok = targetOk && amountNgn >= 100 && !over;
  const masked = b.field === "meter" ? `${target.slice(0, 4)} •••• ${target.slice(-2)}` : target;
  const subtitle = b.category === "electricity" ? "Prepaid electricity" : b.category === "tv" ? "Renew your subscription" : "Airtime & data";

  return (
    <FlowScreen
      title={b.name}
      footer={
        <Button
          title={amountNgn ? `Continue · ₦${amountNgn.toLocaleString()}` : "Continue"}
          disabled={!ok}
          onPress={() => {
            begin({ kind: "bill", billerId: b.id, amountNgn, payWith, target: masked, plan: chosen?.name }, `/bill/${b.id}`);
            router.push("/bill/review");
          }}
        />
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
        <BillerThumb biller={b} size={48} />
        <View>
          <Text variant="headline">{b.name}</Text>
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        </View>
      </View>

      <Field
        label={field.label}
        value={target}
        onChangeText={setTarget}
        placeholder={field.placeholder}
        keyboardType="number-pad"
        maxLength={field.digits + 2}
        hint={targetOk && b.field !== "phone" ? (b.field === "meter" ? "ADA OKAFOR · 16 Admiralty Way" : "ADA OKAFOR · Compact (active)") : undefined}
        hintTone="success"
      />

      {b.plans && (
        <ListSection title="Choose a plan" inset={spacing.md}>
          {[...b.plans, { id: "custom", name: "Custom amount", price: 0 }].map((p) => {
            const on = (plan ?? "custom") === p.id;
            return (
              <ListRow
                key={p.id}
                title={p.name}
                value={p.price ? `₦${p.price.toLocaleString()}` : undefined}
                chevron={false}
                trailing={<Icon name={on ? "checkCircle" : "plusCircle"} size={22} color={on ? c.brand : c.borderStrong} />}
                onPress={() => setPlan(p.id === "custom" ? null : p.id)}
              />
            );
          })}
        </ListSection>
      )}

      {!chosen && (
        <AmountEntry
          value={amount}
          onChange={setAmount}
          prefix="₦"
          decimals={0}
          helper={b.field === "meter" ? `≈ ${((Number(amount) || 0) / 438.6).toFixed(1)} kWh` : "Minimum ₦100"}
          presets={b.field === "meter" ? [{ label: "₦5k", value: "5000" }, { label: "₦10k", value: "10000" }, { label: "₦15k", value: "15000" }] : [{ label: "₦500", value: "500" }, { label: "₦1k", value: "1000" }, { label: "₦2k", value: "2000" }]}
        />
      )}

      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
          Pay with
        </Text>
        <ChipRow
          options={ASSETS_FIAT_FIRST.filter((a) => opened.includes(a.code) && balances[a.code] > 0).map((a) => a.code)}
          value={payWith}
          onChange={setPayWith}
          bleed={spacing.mdl}
          render={(v, on) => (
            <>
              <CoinIcon code={v} size={20} />
              <Text variant="subhead" style={{ color: chipText(on) }}>
                {v}
              </Text>
            </>
          )}
        />
        {amountNgn > 0 && (
          <Text variant="caption" tone={over ? "danger" : "muted"} style={{ paddingHorizontal: spacing.xs }}>
            {over ? `Not enough ${payWith}` : `You'll pay ${formatAsset(cost, payWith)} · no fee`}
          </Text>
        )}
      </View>
    </FlowScreen>
  );
}
