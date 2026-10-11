import { BrandSwitch } from "@/components/brand-switch";
import type { IconName } from "@/components/icon";
import { ListRow, ListSection } from "@/components/list";
import { Screen } from "@/components/screen";
import { usePrefsStore, type NotificationKey } from "@/stores/use-prefs-store";
import { useColors } from "@/theme";

const ROWS: { key: NotificationKey; icon: IconName; title: string; subtitle: string; locked?: boolean }[] = [
  { key: "transactions", icon: "receive", title: "Money in & out", subtitle: "Every payment, swap and card charge" },
  { key: "security", icon: "shield", title: "Security alerts", subtitle: "New sign-ins and PIN changes. Always on.", locked: true },
  { key: "cashpoints", icon: "cashpoint", title: "Cashpoints & referrals", subtitle: "When a code is redeemed or you earn from a friend" },
  { key: "promos", icon: "megaphone", title: "News & offers", subtitle: "New features and rate updates" },
];

export default function NotificationPrefs() {
  const c = useColors();
  const prefs = usePrefsStore((s) => s.notifications);
  const set = usePrefsStore((s) => s.setNotification);
  return (
    <Screen>
      <ListSection title="Push notifications" footer="Your inbox on Home keeps everything, even when pushes are off.">
        {ROWS.map((r) => (
          <ListRow
            key={r.key}
            icon={r.icon}
           
            iconTint={c.brandText}
            title={r.title}
            subtitle={r.subtitle}
            trailing={<BrandSwitch label={r.title} value={r.locked ? true : prefs[r.key]} disabled={r.locked} onValueChange={(v) => set(r.key, v)} />}
          />
        ))}
      </ListSection>
    </Screen>
  );
}
