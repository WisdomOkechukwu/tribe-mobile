import { Pill } from "@/components/bits";
import { ListRow, ListSection } from "@/components/list";
import { Screen } from "@/components/screen";
import { useSessionStore } from "@/stores/use-session-store";
import { toast } from "@/stores/use-ui-store";
import { overlay } from "@/stores/use-overlay-store";
import { relativeDate } from "@/utils/format";

export default function Devices() {
  const devices = useSessionStore((s) => s.devices);
  const removeDevice = useSessionStore((s) => s.removeDevice);
  const current = devices.filter((d) => d.current);
  const others = devices.filter((d) => !d.current);

  return (
    <Screen>
      <ListSection title="This device">
        {current.map((d) => (
          <ListRow key={d.id} icon="phone" title={d.name} subtitle={d.detail} trailing={<Pill label="Active now" tone="success" />} />
        ))}
      </ListSection>
      {others.length > 0 && (
        <ListSection title="Other devices" footer="Don't recognise one? Log it out and change your PIN.">
          {others.map((d) => (
            <ListRow
              key={d.id}
              icon={d.name.includes("Chrome") ? "laptop" : "phone"}
             
              title={d.name}
              subtitle={`${d.detail} · ${relativeDate(d.lastActive)}`}
              value="Log out"
              valueTone="danger"
              onPress={() =>
                overlay.confirm({
                  icon: d.name.includes("Chrome") ? "laptop" : "phone",
                  title: `Log out ${d.name}?`,
                  body: "That device will need your phone number and a code to sign in again.",
                  confirmLabel: "Log out",
                  destructive: true,
                  onConfirm: () => {
                    removeDevice(d.id);
                    toast(`${d.name} logged out`);
                  },
                })
              }
            />
          ))}
        </ListSection>
      )}
    </Screen>
  );
}
