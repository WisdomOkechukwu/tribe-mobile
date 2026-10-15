import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Share, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AmountEntry } from "@/components/amount-entry";
import { EmptyState } from "@/components/bits";
import { Button } from "@/components/button";
import { CashpointMark } from "@/components/cashpoint-mark";
import { CashpointTicket } from "@/components/cashpoint-ticket";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { NumberPad } from "@/components/pin-pad";
import { PressableScale } from "@/components/pressable-scale";
import { PrivacyGuard } from "@/components/privacy-guard";
import { Segmented } from "@/components/segmented";
import { Text } from "@/components/text";
import type { Transaction } from "@/data/seed";
import { useFlowStore } from "@/stores/use-flow-store";
import { useInboxStore } from "@/stores/use-inbox-store";
import { overlay } from "@/stores/use-overlay-store";
import { toast } from "@/stores/use-ui-store";
import { useWalletStore } from "@/stores/use-wallet-store";
import { radius, spacing, useColors } from "@/theme";
import { formatAsset, relativeDate } from "@/utils/format";

type Mode = "generate" | "redeem";
const REDEEM_DEMO_VALUE = 5_000;
const fmt = (code?: string) => (code ?? "").replace(/\D/g, "").replace(/(.{4})(?=.)/g, "$1 ");

/** Active (unredeemed) codes in our own sheet: share again or cancel for a refund. */
function openActiveCodes(active: Transaction[]) {
  overlay.sheet({ title: "Your active codes", content: (close) => <ActiveCodes items={active} close={close} /> });
}

function ActiveCodes({ items, close }: { items: Transaction[]; close: (after?: () => void) => void }) {
  const cancel = useWalletStore((s) => s.cancelCashpoint);
  if (!items.length) return <EmptyState icon="cashpoint" title="No active codes" body="Codes you generate wait here until someone redeems them." />;
  return (
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.mdl, paddingBottom: spacing.sm, gap: spacing.lg }} bounces={false}>
      {items.map((t) => (
        <View key={t.id} style={{ gap: spacing.sm }}>
          <CashpointTicket amount={formatAsset(t.amount, "NGN")} code={t.meta?.code} note={`Made ${relativeDate(t.date)} · waiting to be redeemed`} />
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Button title="Share" icon="share" size="md" style={{ flex: 1 }} onPress={() => Share.share({ message: `Here's ${formatAsset(t.amount, "NGN")} on Tribe.\nCashpoint code: ${fmt(t.meta?.code)}\nRedeem it in the Tribe app — even if you're new.` })} />
            <Button
              title="Cancel code"
              variant="destructive"
              size="md"
              style={{ flex: 1 }}
              onPress={() =>
                close(() =>
                  overlay.confirm({
                    icon: "trash",
                    title: "Cancel this Cashpoint?",
                    body: `The code stops working and ${formatAsset(t.amount, "NGN")} goes back to your Naira balance.`,
                    confirmLabel: "Cancel code",
                    cancelLabel: "Keep it",
                    destructive: true,
                    onConfirm: () => {
                      cancel(t.id);
                      toast("Code cancelled · Naira refunded");
                    },
                  }),
                )
              }
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

/** The 12-digit code as one field: groups of four, a paste button, a clear state. */
function CodeField({ code, onPaste, onClear }: { code: string; onPaste: () => void; onClear: () => void }) {
  const c = useColors();
  const full = code.length === 12;
  const groups = [0, 1, 2].map((g) => code.slice(g * 4, g * 4 + 4));
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 2, borderColor: full ? c.success : code ? c.brand : "transparent", paddingVertical: spacing.md, paddingHorizontal: spacing.md, gap: spacing.smd }}>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.md }} accessibilityLabel={`${code.length} of 12 digits entered`}>
        {groups.map((g, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 3 }}>
            {[0, 1, 2, 3].map((k) => {
              const d = g[k];
              const active = !full && i * 4 + k === code.length;
              return (
                <View key={k} style={{ width: 19, alignItems: "center", borderBottomWidth: 2, borderBottomColor: active ? c.brand : d ? "transparent" : c.borderStrong, paddingBottom: 2 }}>
                  <Text variant="mono" style={{ fontSize: 22, lineHeight: 28, letterSpacing: 0, color: d ? c.text : "transparent" }}>
                    {d ?? "0"}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.sm }}>
        <PressableScale onPress={onPaste} accessibilityLabel="Paste code" style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.brandSoft, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 7 }}>
          <Icon name="copy" size={13} color={c.brandText} />
          <Text variant="subhead" tone="brand">
            Paste
          </Text>
        </PressableScale>
        {!!code && (
          <PressableScale onPress={onClear} accessibilityLabel="Clear code" style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surfaceAlt, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 7 }}>
            <Icon name="close" size={11} color={c.textMuted} weight="bold" />
            <Text variant="subhead" tone="muted">
              Clear
            </Text>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

/** Cashpoints: Naira packed into a 12-digit code anyone can redeem — Tribe users instantly, new users at sign-up. */
export default function Cashpoint() {
  const c = useColors();
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const ngn = useWalletStore((s) => s.balances.NGN);
  const transactions = useWalletStore((s) => s.transactions);
  const redeem = useWalletStore((s) => s.redeemCashpoint);
  const begin = useFlowStore((s) => s.begin);
  const complete = useFlowStore((s) => s.complete);
  const [mode, setMode] = useState<Mode>(params.mode === "redeem" ? "redeem" : "generate");
  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");

  const value = Number(amount) || 0;
  const over = value > ngn;
  const tooSmall = value > 0 && value < 500;
  const active = transactions.filter((t) => t.type === "cashpoint" && t.direction === "out" && t.status === "pending");
  const full = code.length === 12;

  const paste = async () => {
    const text = (await Clipboard.getStringAsync()).replace(/\D/g, "").slice(0, 12);
    if (text.length) setCode(text);
    else toast("No code on your clipboard", "danger");
  };

  return (
    <FlowScreen
      title="Cashpoints"
      scroll={false}
      headerRight={() => (
        <PressableScale onPress={() => openActiveCodes(active)} accessibilityLabel={`${active.length} active codes`} style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.accentSoft, borderRadius: radius.full, paddingLeft: 4, paddingRight: spacing.smd, paddingVertical: 4 }}>
          <CashpointMark size={20} />
          <Text variant="subhead" tone="accent">
            {active.length ? `${active.length} active` : "My codes"}
          </Text>
        </PressableScale>
      )}
      footer={
        mode === "generate" ? (
          <Button
            title={value && !over && !tooSmall ? `Generate ${formatAsset(value, "NGN")} code` : "Generate code"}
            disabled={!value || over || tooSmall}
            onPress={() => {
              begin({ kind: "cashpoint", amount: value });
              router.push("/cashpoint/review");
            }}
          />
        ) : (
          <Button
            title={full ? `Redeem ${formatAsset(REDEEM_DEMO_VALUE, "NGN")}` : "Redeem"}
            disabled={!full}
            onPress={() => {
              const tx = redeem(code, REDEEM_DEMO_VALUE);
              useInboxStore.getState().push({ kind: "cashpoint", title: "Cashpoint redeemed", body: `${formatAsset(REDEEM_DEMO_VALUE, "NGN")} landed in your Naira balance.`, href: `/transaction/${tx.id}` });
              complete({ tx, headline: "Cashpoint redeemed", detail: `${formatAsset(REDEEM_DEMO_VALUE, "NGN")} just landed in your Naira wallet.` });
              router.push("/success");
            }}
          />
        )
      }
    >
      {/* codes on screen (active codes sheet) — keep them out of screenshots & recordings */}
      <PrivacyGuard />
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: "generate", label: "Generate" },
          { value: "redeem", label: "Redeem" },
        ]}
      />

      {mode === "generate" ? (
        <Animated.View key="g" entering={FadeIn.duration(180)} style={{ flex: 1, gap: spacing.md }}>
          <CashpointTicket compact amount={value ? formatAsset(value, "NGN") : "₦0"} />
          <Text variant="subhead" tone={over || tooSmall ? "danger" : "muted"} align="center">
            {over ? "That's more than your Naira balance" : tooSmall ? "The minimum is ₦500" : `From Naira · ${formatAsset(ngn, "NGN")} available · no fee`}
          </Text>
          <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.xs }}>
            <AmountEntry
              value={amount}
              onChange={setAmount}
              decimals={0}
              showDisplay={false}
              presets={[
                { label: "₦1k", value: "1000" },
                { label: "₦5k", value: "5000" },
                { label: "₦10k", value: "10000" },
                { label: "₦20k", value: "20000" },
              ]}
            />
          </View>
        </Animated.View>
      ) : (
        <Animated.View key="r" entering={FadeIn.duration(180)} style={{ flex: 1, gap: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd }}>
            <CashpointMark size={48} />
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="headline">Redeem a Cashpoint</Text>
              <Text variant="caption" tone="muted">
                Enter or paste all 12 digits. The Naira lands instantly.
              </Text>
            </View>
          </View>
          <CodeField code={code} onPaste={paste} onClear={() => setCode("")} />
          <Text variant="subhead" tone={full ? "success" : "muted"} align="center">
            {full ? `Valid code · ${formatAsset(REDEEM_DEMO_VALUE, "NGN")}` : `${12 - code.length} digit${12 - code.length === 1 ? "" : "s"} to go`}
          </Text>
          <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: spacing.xs }}>
            <NumberPad onKey={(d) => setCode((v) => (v.length < 12 ? v + d : v))} onDelete={() => setCode((v) => v.slice(0, -1))} />
          </View>
        </Animated.View>
      )}
    </FlowScreen>
  );
}
