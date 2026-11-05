import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/button";
import { Dropdown } from "@/components/dropdown";
import { Field } from "@/components/field";
import { FlowScreen } from "@/components/flow-screen";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Text } from "@/components/text";
import { assetByCode } from "@/data/assets";
import { channelById, channelsFor, fieldOk, maskedHandle, type FieldSpec } from "@/data/channels";
import { findTribeUser } from "@/data/contacts";
import { AssetHeader, ChoiceCard, openBeneficiaries } from "@/screens/send/shared";
import type { Beneficiary } from "@/stores/use-beneficiaries-store";
import { overlay } from "@/stores/use-overlay-store";
import { useSendDraft, type Recipient } from "@/stores/use-send-draft";
import { toast } from "@/stores/use-ui-store";
import { radius, spacing, useColors } from "@/theme";
import { formatMoney } from "@/utils/format";

type Mode = "tribe" | "external";

const LOOKUP_NAMES = ["Chiamaka Eze", "Emeka Nwosu", "Fatima Bello", "Tunde Bakare", "Ngozi Okeke"];
/** Demo account-name lookup ("NIP name enquiry"): a stable name per account number. */
const lookupName = (account: string) => LOOKUP_NAMES[[...account].reduce((n, d) => n + Number(d), 0) % LOOKUP_NAMES.length];
const shortAddress = (a: string) => (a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-5)}` : a);

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", borderRadius: radius.full, borderWidth: 1, borderColor: c.borderStrong, paddingVertical: 5, paddingHorizontal: spacing.smd }}>
      <Text variant="subhead">{label}</Text>
      <Icon name="chevronDown" size={9} color={c.textMuted} weight="bold" />
    </PressableScale>
  );
}

function DetailField({ f, value, onChange }: { f: FieldSpec; value: string; onChange: (v: string) => void }) {
  const bad = value.length > 0 && !fieldOk(f, value);
  if (f.kind === "select")
    return <Dropdown value={value || undefined} placeholder={f.placeholder ?? f.label} onPress={() => overlay.select({ title: f.label, value, options: (f.options ?? []).map((o) => ({ value: o, label: o })), onSelect: onChange })} />;
  const digits = f.kind === "digits";
  const shown = f.format === "sortcode" ? value.replace(/(\d{2})(?=\d)/g, "$1-") : value;
  return (
    <Field
      value={shown}
      onChangeText={(v) => onChange(digits ? v.replace(/\D/g, "") : f.kind === "code" ? v.replace(/\s/g, "").toUpperCase() : v)}
      placeholder={f.placeholder ?? f.label}
      keyboardType={digits ? "number-pad" : f.kind === "email" ? "email-address" : "default"}
      autoCapitalize={f.kind === "code" ? "characters" : f.kind === "email" ? "none" : f.key === "name" ? "words" : "sentences"}
      maxLength={f.format === "sortcode" ? 8 : digits ? (f.length ?? f.range?.[1]) : f.range?.[1]}
      mono={digits || f.kind === "code"}
      hint={bad ? (f.length ? `${f.label} is ${f.length} digits` : `Check the ${f.label.toLowerCase()}`) : undefined}
      hintTone="danger"
    />
  );
}

/**
 * Who are you sending to? (Send - Global currencies.png / Send - Cryptocurrency.png)
 * A Tribe user by email or @username (free, instant), or someone outside Tribe: pick the
 * channel (ACH, FPS, SEPA, mobile money…) and fill in exactly what it needs — or a wallet
 * address on the right network. Saved beneficiaries fill everything in one tap.
 */
export default function SendRecipient() {
  const c = useColors();
  const scope = useSendDraft((s) => s.scope);
  const code = useSendDraft((s) => s.asset);
  const country = useSendDraft((s) => s.country);
  const address = useSendDraft((s) => s.address);
  const setAddress = useSendDraft((s) => s.setAddress);
  const setRecipient = useSendDraft((s) => s.setRecipient);
  const a = assetByCode(code);
  const crypto = scope === "crypto";
  const channels = channelsFor(code);
  // labels for the rail cards: lowest fee, and quickest arrival (seconds < minutes < same day < days)
  const speed = (eta: string) => (/second|instant/i.test(eta) ? 0 : /minute/i.test(eta) ? 1 : /same/i.test(eta) ? 2 : 3);
  const cheapestId = channels.length > 1 ? [...channels].sort((x, y) => x.feeUsd - y.feeUsd)[0].id : undefined;
  const fastestId = channels.length > 1 ? [...channels].sort((x, y) => speed(x.eta) - speed(y.eta) || x.feeUsd - y.feeUsd).find((ch) => ch.id !== cheapestId)?.id : undefined;
  const [mode, setMode] = useState<Mode | null>(null);
  const [query, setQuery] = useState("");
  const [channelId, setChannelId] = useState<string | undefined>(channels[0]?.id); // cheapest local rail first
  const [values, setValues] = useState<Record<string, string>>({});
  const [network, setNetwork] = useState<string | undefined>(a.networks?.[0]?.id);
  const [label, setLabel] = useState("");
  const [beneficiaryId, setBeneficiaryId] = useState<string | undefined>();

  const user = findTribeUser(query);
  const channel = channelById(channelId);
  const net = a.networks?.find((n) => n.id === network);
  const accountName = channel?.id === "ngn-bank" && fieldOk(channel.fields[1], values.account) ? lookupName(values.account) : undefined;
  const addressOk = address.trim().length >= 26;

  const valid = mode === "tribe" ? !!user : mode === "external" ? (crypto ? !!net && addressOk : !!channel && channel.fields.every((f) => fieldOk(f, values[f.key]))) : false;

  const external = crypto
    ? `Send to any wallet on ${(a.networks ?? []).map((n) => n.name.replace(/ \(.*\)/, "")).join(", ")}.`
    : code === "NGN"
      ? "To any Nigerian bank or fintech account."
      : `Send by ${channels.map((ch) => ch.name).join(", ")}.`;

  const fromBeneficiary = (b: Beneficiary) => {
    setBeneficiaryId(b.id);
    if (b.kind === "tribe") {
      setMode("tribe");
      setQuery(b.handle);
    } else if (b.kind === "wallet") {
      setMode("external");
      setNetwork(b.network);
      setAddress(b.details?.address ?? "");
      setLabel(b.name);
    } else {
      setMode("external");
      setChannelId(b.channelId);
      setValues(b.details ?? {});
    }
  };
  const pickBeneficiary = (kind: Beneficiary["kind"]) => openBeneficiaries((b) => b.asset === code && (kind === "tribe" ? b.kind === "tribe" : b.kind !== "tribe"), fromBeneficiary);

  const pickNetwork = () =>
    overlay.select({
      title: "Select network",
      subtitle: `Only networks your recipient's ${code} wallet supports.`,
      value: network,
      options: (a.networks ?? []).map((n) => ({ value: n.id, label: n.name, sub: `Arrives ${n.eta}`, trailing: `Fee ${n.fee} ${code}` })),
      onSelect: setNetwork,
    });

  const next = () => {
    let r: Recipient;
    if (mode === "tribe" && user) r = { kind: "tribe", name: user.name, handle: `@${user.tag}`, beneficiaryId };
    else if (crypto) r = { kind: "wallet", name: label.trim() || `${code} wallet`, handle: shortAddress(address.trim()), network, details: { address: address.trim() }, beneficiaryId };
    else {
      const ch = channel!;
      const name = values.name?.trim() || accountName || "Recipient";
      r = { kind: "bank", name, handle: maskedHandle(ch, values), channelId: ch.id, details: { ...values, name }, beneficiaryId };
    }
    setRecipient(r);
    router.push("/send/amount");
  };

  return (
    <FlowScreen title={crypto ? "Send crypto" : code === "NGN" ? "Send Naira" : "Global send"} cancel="back" footer={<Button title="Continue" disabled={!valid} onPress={next} />}>
      <AssetHeader code={code} country={country} />
      <View style={{ gap: spacing.sm }}>
        <Text variant="subhead" tone="muted">
          Who are you sending to?
        </Text>
        <ChoiceCard title="Tribe user" body={`Send ${a.kind === "crypto" ? code : a.name} by email or username. Free and instant.`} on={mode === "tribe"} onPress={() => setMode("tribe")} />
        <ChoiceCard title={crypto ? "External wallet" : "External user"} body={external} on={mode === "external"} onPress={() => setMode("external")} />
      </View>

      {mode === "tribe" && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="subhead" tone="muted">
            Recipient&apos;s details
          </Text>
          <Field
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setBeneficiaryId(undefined);
            }}
            placeholder="Email or @username"
            autoCapitalize="none"
            keyboardType="email-address"
            autoFocus={!query}
            trailing={user ? <Icon name="checkCircle" size={18} color={c.success} /> : undefined}
            hint={user ? `${user.name} · on Tribe` : query.trim().length > 2 ? "No Tribe user with that email or username." : undefined}
            hintTone={user ? "success" : "danger"}
          />
          <Chip label="Beneficiary" onPress={() => pickBeneficiary("tribe")} />
        </View>
      )}

      {mode === "external" && crypto && (
        <View style={{ gap: spacing.smd }}>
          <Text variant="subhead" tone="muted">
            Select network
          </Text>
          <Dropdown value={net?.name} sub={net ? `Arrives ${net.eta} · fee ${net.fee} ${code}` : undefined} placeholder="Network" onPress={pickNetwork} />
          <Text variant="caption" tone="muted">
            Make sure you&apos;re sending to the right network and wallet. Crypto sent on the wrong network can&apos;t be recovered.
          </Text>
          <Field
            value={address}
            onChangeText={(v) => {
              setAddress(v.trim());
              setBeneficiaryId(undefined);
            }}
            placeholder="Wallet address"
            autoCapitalize="none"
            mono
            hint={address && !addressOk ? "That address looks too short." : undefined}
            hintTone="danger"
            trailing={
              <View style={{ flexDirection: "row", gap: spacing.smd }}>
                <PressableScale
                  hitSlop={8}
                  accessibilityLabel="Paste address"
                  onPress={async () => {
                    const t = (await Clipboard.getStringAsync().catch(() => "")).trim();
                    if (t) setAddress(t);
                    else toast("Nothing to paste", "danger");
                  }}
                >
                  <Icon name="copy" size={18} color={c.brandText} />
                </PressableScale>
                <PressableScale hitSlop={8} accessibilityLabel="Scan a wallet QR code" onPress={() => router.push({ pathname: "/scan", params: { mode: "address" } })}>
                  <Icon name="scan" size={18} color={c.brandText} />
                </PressableScale>
              </View>
            }
          />
          <Field value={label} onChangeText={setLabel} placeholder="Name this wallet (optional)" />
          <Chip label="Beneficiary" onPress={() => pickBeneficiary("wallet")} />
        </View>
      )}

      {mode === "external" && !crypto && (
        <View style={{ gap: spacing.smd }}>
          {channels.length > 1 && (
            <>
              <Text variant="subhead" tone="muted">
                How should it travel?
              </Text>
              {/* every rail this currency can use, side by side: speed, fee, and which is cheapest / fastest */}
              <View style={{ gap: spacing.sm }}>
                {channels.map((ch) => {
                  const on = ch.id === channel?.id;
                  const tag = ch.id === cheapestId ? "Cheapest" : ch.id === fastestId ? "Fastest" : null;
                  return (
                    <PressableScale
                      key={ch.id}
                      scaleTo={0.98}
                      onPress={() => {
                        setChannelId(ch.id);
                        if (ch.id !== channelId) setValues((v) => ({ name: v.name ?? "" }));
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${ch.name}, ${ch.eta}, fee ${formatMoney(ch.feeUsd, "USD")}`}
                      style={{ flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: on ? c.brandSoft : c.surface, borderRadius: radius.group, borderCurve: "continuous", padding: spacing.md, borderWidth: 1.5, borderColor: on ? c.brand : "transparent" }}
                    >
                      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: on ? 6 : 1.5, borderColor: on ? c.brand : c.borderStrong }} />
                      <View style={{ flex: 1, gap: spacing.xxs }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                          <Text variant="bodyStrong">{ch.name}</Text>
                          {tag && (
                            <View style={{ backgroundColor: tag === "Cheapest" ? c.successSoft : c.accentSoft, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs }}>
                              <Text variant="caption" style={{ color: tag === "Cheapest" ? c.success : c.accentText, fontFamily: "Poppins_600SemiBold" }}>
                                {tag}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text variant="caption" tone="muted" numberOfLines={1}>
                          {ch.blurb}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: spacing.xxs }}>
                        <Text variant="subhead">{ch.eta}</Text>
                        <Text variant="caption" tone="muted">
                          Fee {formatMoney(ch.feeUsd, "USD")}
                        </Text>
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            </>
          )}
          <Chip label="Beneficiary" onPress={() => pickBeneficiary("bank")} />
          {channel && (
            <>
              <Text variant="subhead" tone="muted">
                Fill in the payment details
              </Text>
              {channel.fields.map((f) => (
                <DetailField key={f.key} f={f} value={values[f.key] ?? ""} onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
              ))}
              {accountName && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.successSoft, borderRadius: radius.input, padding: spacing.smd }}>
                  <Icon name="checkCircle" size={16} color={c.success} />
                  <Text variant="bodyStrong" tone="success">
                    {accountName.toUpperCase()}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </FlowScreen>
  );
}
