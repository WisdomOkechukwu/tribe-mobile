import { router } from "expo-router";
import { useState } from "react";
import { Share, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { copyToClipboard, Note } from "@/components/bits";
import { Button } from "@/components/button";
import { Icon, type IconName } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { PressableScale } from "@/components/pressable-scale";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { CoinIcon } from "@/components/coin-icon";
import { Stripes } from "@/components/stripes";
import { Text } from "@/components/text";
import { REFERRAL } from "@/data/referrals";
import { useReferrals } from "@/api/queries";
import { Skeleton, SkeletonList } from "@/components/skeletons";
import { useSessionStore } from "@/stores/use-session-store";
import { palette, radius, spacing, useColors } from "@/theme";
import { formatAsset, relativeDate } from "@/utils/format";

type Tab = "earnings" | "withdrawals" | "friends";

const naira = (n: number) => `₦${n.toLocaleString()}`;
const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: "share", title: "Share your code", body: "Send it on WhatsApp, X or anywhere else." },
  { icon: "personAdd", title: "Your friend joins Tribe", body: "They sign up with your code." },
  { icon: "repeat", title: "You earn on every transaction", body: `${naira(REFERRAL.perTransactionNgn)} each time they send, swap, pay a bill or buy a card. For life.` },
];

/**
 * Invite friends — earn for life: ₦25 every time a friend transacts. Rewards collect in a
 * referral balance you can withdraw into any currency; Earnings and Withdrawals list both.
 */
export default function Invite() {
  const c = useColors();
  const tag = useSessionStore((s) => s.user.tag);
  const myCode = useSessionStore((s) => s.referralCode);
  const referrals = useReferrals();
  const { balance = 0, earnings = [], withdrawals = [], code: serverCode, invited = 0 } = referrals.data ?? {};
  const [tab, setTab] = useState<Tab>("earnings");
  const code = serverCode || myCode || tag.toUpperCase();
  // friends, from the rewards they earned you (GET referrals has the list of earnings, not of invitees)
  const byFriend = new Map<string, { name: string; total: number; count: number; last: string }>();
  for (const e of earnings) {
    const f = byFriend.get(e.friend) ?? { name: e.friend, total: 0, count: 0, last: e.date };
    byFriend.set(e.friend, { ...f, total: f.total + e.amount, count: f.count + 1, last: e.date > f.last ? e.date : f.last });
  }
  const friends = [...byFriend.values()].sort((a, b) => b.total - a.total);
  const earning = friends.length;
  const lifetime = earnings.reduce((sum, e) => sum + e.amount, 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const thisMonth = earnings.filter((e) => e.date >= monthStart).reduce((sum, e) => sum + e.amount, 0);
  const message = `Join me on Tribe: crypto, dollars and bills in one app. Sign up with my code ${code}: https://tribe.africa/r/${code}`;

  return (
    <Screen footer={<Button title="Invite friends" icon="share" onPress={() => Share.share({ message })} />}>
      {/* lifetime earnings hero */}
      <View style={{ borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: palette.purple[700], padding: spacing.mdl, gap: spacing.md }}>
        <View pointerEvents="none" style={{ position: "absolute", right: -70, top: -60, width: 220, height: 200, overflow: "hidden", opacity: 0.35 }}>
          <Stripes band={14} gap={8} count={12} colors={[palette.purple[400], palette.orange[500]]} />
        </View>
        <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: spacing.xs }}>
          <Icon name="infinity" size={12} color={palette.orange[300]} />
          <Text variant="caption" style={{ color: "#fff", fontFamily: "Poppins_600SemiBold" }}>
            Earn for life
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.sm }}>
          <View style={{ flexShrink: 1 }}>
            <Text variant="caption" style={{ color: palette.purple[100] }}>
              Available to withdraw
            </Text>
            {referrals.data ? (
              <Text variant="balance" style={{ color: "#fff" }} adjustsFontSizeToFit numberOfLines={1}>
                {naira(balance)}
              </Text>
            ) : (
              <Skeleton width={150} height={36} style={{ marginTop: spacing.xs, backgroundColor: "rgba(255,255,255,0.2)" }} />
            )}
          </View>
          <Button title="Withdraw" icon="arrowDown" variant="white" size="md" inline disabled={!referrals.data || balance < REFERRAL.minWithdrawNgn} onPress={() => router.push("/referral-withdraw")} />
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {[
            ["Lifetime", naira(lifetime)],
            ["This month", naira(thisMonth)],
            ["Friends", String(Math.max(invited, earning))],
          ].map(([k, v]) => (
            <View key={k} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radius.input, padding: spacing.smd, gap: spacing.xs }}>
              <Text variant="caption" style={{ color: palette.purple[100], fontSize: 11 }}>
                {k}
              </Text>
              <Text variant="bodyStrong" style={{ color: "#fff" }}>
                {v}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <PressableScale
        onPress={() => copyToClipboard(code, "Code copied")}
        accessibilityLabel={`Copy referral code ${code}`}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.surface, borderRadius: radius.group, borderCurve: "continuous", borderWidth: 1.5, borderStyle: "dashed", borderColor: c.brand, paddingHorizontal: spacing.md, paddingVertical: spacing.smd }}
      >
        <View>
          <Text variant="caption" tone="muted">
            Your invite code
          </Text>
          <Text variant="mono" style={{ fontSize: 20 }}>
            {code}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.brandSoft, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 6 }}>
          <Icon name="copy" size={13} color={c.brandText} />
          <Text variant="subhead" tone="brand">
            Copy
          </Text>
        </View>
      </PressableScale>

      <ListSection title="How it works">
        {STEPS.map((s) => (
          <ListRow key={s.title} icon={s.icon} title={s.title} subtitle={s.body} />
        ))}
      </ListSection>

      <Segmented<Tab>
        options={[
          { value: "earnings", label: "Earnings" },
          { value: "withdrawals", label: "Withdrawals" },
          { value: "friends", label: "Friends" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {!referrals.data && tab !== "friends" && <SkeletonList rows={4} />}

      {referrals.data && tab === "earnings" && (
        <ListSection footer={`${naira(REFERRAL.perTransactionNgn)} for every transaction a friend makes, paid ${REFERRAL.payout}. No cap, no expiry.`}>
          {earnings.slice(0, 12).map((e) => (
            <ListRow key={e.id} leading={<Avatar size={38} name={e.friend} ring={false} />} title={e.friend} subtitle={`${e.what} · ${relativeDate(e.date)}`} trailing={<Text variant="amount" tone="success">+{naira(e.amount)}</Text>} />
          ))}
        </ListSection>
      )}

      {referrals.data &&
        tab === "withdrawals" &&
        (withdrawals.length ? (
          <ListSection>
            {withdrawals.map((w) => (
              <ListRow
                key={w.id}
                leading={<CoinIcon code={w.to} size={38} />}
                title={`To ${w.to === "NGN" ? "Naira" : w.to}`}
                subtitle={`${naira(w.amountNgn)} · ${relativeDate(w.date)}`}
                trailing={<Text variant="amount" tone="success">+{formatAsset(w.received, w.to)}</Text>}
                onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: w.txId } })}
              />
            ))}
          </ListSection>
        ) : (
          <Note icon="info">No withdrawals yet. Move your earnings into any balance with Withdraw.</Note>
        ))}

      {tab === "friends" && (
        <ListSection>
          {friends.map((f) => (
            <ListRow
              key={f.name}
              leading={<Avatar size={40} name={f.name} ring={false} />}
              title={f.name}
              subtitle={`${f.count} reward${f.count === 1 ? "" : "s"} · last ${relativeDate(f.last).toLowerCase()}`}
              trailing={<Text variant="amount" tone="success">+{naira(f.total)}</Text>}
            />
          ))}
          {invited > friends.length && <ListRow icon="people" title={`${invited - friends.length} more joined with your code`} subtitle="They'll earn you rewards once they transact" />}
        </ListSection>
      )}

      <Note icon="info">Rewards come from Tribe, never from your friend&apos;s money.</Note>
    </Screen>
  );
}
