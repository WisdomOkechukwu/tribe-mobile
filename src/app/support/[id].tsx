import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, TextInput, View } from "react-native";
import Animated, { Easing, FadeInUp, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icon";
import { KeyboardFrame } from "@/components/keyboard-frame";
import { PressableScale } from "@/components/pressable-scale";
import { QueryError } from "@/components/skeletons";
import { Text } from "@/components/text";
import { useTransaction, useTransactions } from "@/api/queries";
import { sendMessage, useSupportLive, useTicket, type ChatMessage, type TicketStatus } from "@/api/support";
import { errorMessage } from "@/api/http";
import { MarkDisc } from "@/screens/auth/shell";
import { TxCard } from "@/screens/support/tx-card";
import { useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";
import { fonts, radius, spacing, useColors } from "@/theme";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toDateString();
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

const STATUS_PILL: Record<TicketStatus, string> = { open: "Waiting on Tribe", pending: "Tribe replied", resolved: "Resolved" };

/** One message. Yours on the right in brand purple; Tribe's on the left with the mark; system notes centred. */
const Bubble = memo(function Bubble({ m, firstOfRun, lastOfRun }: { m: ChatMessage; firstOfRun: boolean; lastOfRun: boolean }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const enter = reduce ? undefined : FadeInUp.duration(220).easing(Easing.out(Easing.cubic));
  if (m.from === "system")
    return (
      <View style={{ alignItems: "center", paddingVertical: spacing.xs }}>
        <View style={{ backgroundColor: c.surface, borderRadius: radius.full, paddingHorizontal: spacing.smd, paddingVertical: 4 }}>
          <Text variant="caption" tone="muted">
            {m.body}
          </Text>
        </View>
      </View>
    );
  const mine = m.from === "me";
  // the corner nearest the sender stays tight on the last bubble of a run, like a tail
  const shape = mine
    ? { borderRadius: 20, borderBottomRightRadius: lastOfRun ? 6 : 20, borderTopRightRadius: firstOfRun ? 20 : 8 }
    : { borderRadius: 20, borderBottomLeftRadius: lastOfRun ? 6 : 20, borderTopLeftRadius: firstOfRun ? 20 : 8 };
  return (
    <Animated.View entering={enter} style={{ flexDirection: "row", justifyContent: mine ? "flex-end" : "flex-start", alignItems: "flex-end", gap: spacing.sm, marginTop: firstOfRun ? spacing.sm : 2 }}>
      {!mine && <View style={{ width: 28 }}>{lastOfRun && <MarkDisc size={28} />}</View>}
      <View style={{ maxWidth: "78%", gap: 3, alignItems: mine ? "flex-end" : "flex-start" }}>
        {!mine && firstOfRun && (
          <Text variant="caption" tone="muted" style={{ paddingHorizontal: spacing.xs }}>
            {m.author} · Tribe
          </Text>
        )}
        <View style={[{ paddingHorizontal: spacing.smd + 2, paddingVertical: spacing.sm + 1, backgroundColor: mine ? c.brand : c.surface, opacity: m.sending ? 0.6 : 1 }, shape]}>
          <Text selectable style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: mine ? c.onBrand : c.text }}>
            {m.body}
          </Text>
        </View>
        {lastOfRun && (
          <Text variant="caption" tone="subtle" style={{ fontSize: 11, paddingHorizontal: spacing.xs }}>
            {m.sending ? "Sending…" : time(m.createdAt)}
          </Text>
        )}
      </View>
    </Animated.View>
  );
});

/**
 * One chat with the Tribe team. Messages are grouped into runs per sender with a day line between
 * days; new ones (yours or Tribe's) slide in and the list keeps to the bottom. Replies arrive over
 * the support socket; the composer stays above the keyboard. Writing to a resolved chat opens it again.
 */
export default function Chat() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const chat = useTicket(id);
  const live = useSupportLive((s) => s.live);
  const me = useSessionStore((s) => `${s.user.firstName} ${s.user.lastName}`.trim());
  const [draft, setDraft] = useState("");
  const messages = useMemo(() => chat.data?.messages ?? [], [chat.data?.messages]);
  const ticket = chat.data?.ticket;
  // the transaction this chat is about: from the cached list if it's there, else fetched by id
  const attachedId = ticket?.transactionId ?? undefined;
  const cachedList = useTransactions().data;
  const fromList = attachedId ? cachedList?.find((t) => t.id === attachedId) : undefined;
  const fetched = useTransaction(attachedId && !fromList ? attachedId : undefined);
  const attached = fromList ?? fetched.data?.tx;
  const lastId = messages[messages.length - 1]?.id;

  // the list's rows, worked out once per change: each message knows if it starts or ends a run and
  // whether a day line goes above it. Newest first, because the list is inverted (it starts at the
  // bottom and only renders what's on screen, however long the chat gets).
  const rows = useMemo(
    () =>
      messages
        .map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
          return {
            m,
            newDay,
            firstOfRun: newDay || !prev || prev.from !== m.from,
            lastOfRun: !next || next.from !== m.from || dayKey(next.createdAt) !== dayKey(m.createdAt),
          };
        })
        .reverse(),
    [messages],
  );

  // a new message from Tribe: a light tap, so it's noticed
  const seen = useRef<string | null>(null);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && seen.current && last.id !== seen.current && last.from === "tribe") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (last) seen.current = last.id;
  }, [lastId]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    Haptics.selectionAsync().catch(() => {});
    try {
      await sendMessage(id, body, me);
    } catch (e) {
      setDraft(body);
      toast(errorMessage(e), "danger");
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={{ alignItems: "center" }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {ticket?.subject ?? "Chat"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: live ? c.success : c.textSubtle }} />
                <Text variant="caption" tone="muted" style={{ fontSize: 11 }}>
                  {ticket ? STATUS_PILL[ticket.status] : live ? "Live" : "Connecting…"}
                </Text>
              </View>
            </View>
          ),
        }}
      />
      <KeyboardFrame backgroundColor={c.bg}>
        {/* pinned: the transaction this chat is about, one tap from its receipt */}
        {attachedId && (
          <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: c.border }}>
            {attached ? (
              <TxCard tx={attached} label="About this transaction" onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: attachedId } })} />
            ) : (
              <PressableScale onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: attachedId } })} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surface, borderRadius: radius.group, padding: spacing.smd }}>
                <Icon name="link" size={14} color={c.brandText} />
                <Text variant="subhead" style={{ flex: 1 }}>
                  A transaction is attached
                </Text>
                <Icon name="chevron" size={13} color={c.textSubtle} />
              </PressableScale>
            )}
          </View>
        )}
        {chat.isPending ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={c.brandText} />
          </View>
        ) : chat.isError ? (
          <View style={{ flex: 1, padding: spacing.mdl, justifyContent: "center" }}>
            <QueryError onRetry={() => chat.refetch()} />
          </View>
        ) : (
          <FlatList
            inverted
            data={rows}
            keyExtractor={(r) => r.m.id}
            renderItem={({ item }) => (
              // each row is drawn upright again inside the inverted list, so the day line goes first
              <View>
                {item.newDay && (
                  <Text variant="caption" tone="subtle" align="center" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
                    {dayLabel(item.m.createdAt)}
                  </Text>
                )}
                <Bubble m={item.m} firstOfRun={item.firstOfRun} lastOfRun={item.lastOfRun} />
              </View>
            )}
            // the intro is the list's footer, which an inverted list draws at the very top
            ListFooterComponent={
              <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg }}>
                <MarkDisc size={52} />
                <Text variant="bodyStrong">The Tribe team</Text>
                <Text variant="caption" tone="muted" align="center" style={{ maxWidth: 260 }}>
                  Real people, right here. We&apos;ll notify you when we reply.
                </Text>
              </View>
            }
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={9}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md }}
          />
        )}

        {ticket?.status === "resolved" && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: c.successSoft, borderRadius: radius.input, padding: spacing.smd }}>
            <Icon name="checkCircle" size={15} color={c.success} />
            <Text variant="caption" style={{ flex: 1, color: c.text }}>
              This chat is resolved. Write again and it reopens.
            </Text>
          </View>
        )}

        {/* the composer */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.sm), borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg }}>
          <TextInput
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, 2000))}
            placeholder="Message Tribe"
            placeholderTextColor={c.textSubtle}
            multiline
            accessibilityLabel="Message"
            style={{ flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: c.surface, borderRadius: 22, paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: 12, color: c.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 }}
          />
          <PressableScale
            onPress={send}
            disabled={!draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: draft.trim() ? c.brand : c.surface, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="paperplane" size={17} color={draft.trim() ? c.onBrand : c.textSubtle} />
          </PressableScale>
        </View>
      </KeyboardFrame>
    </>
  );
}
