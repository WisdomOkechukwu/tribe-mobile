import type { AssetCode } from "@/data/assets";
import { deleteSchedule, scheduleChangeNeedsPin, updateSchedule } from "@/api/actions";
import { errorMessage } from "@/api/http";
import { askForPin } from "@/screens/cards/pin-sheet";
import type { Frequency, Schedule } from "@/stores/use-recurring-store";
import { toast } from "@/stores/use-ui-store";

type Patch = { active?: boolean; amountNgn?: number; payWith?: AssetCode; frequency?: Frequency };

/**
 * Change a recurring bill. Pausing just saves; anything that is new consent to future payments
 * (resuming, a new amount, wallet or frequency) asks for the PIN first, as the API requires.
 */
export function changeSchedule(s: Schedule, patch: Patch, done: string) {
  if (scheduleChangeNeedsPin(patch)) {
    askForPin({ title: "Confirm with your PIN", work: (pin) => updateSchedule(s, patch, pin), onDone: () => toast(done, "success") });
    return;
  }
  updateSchedule(s, patch)
    .then(() => toast(done))
    .catch((e) => toast(errorMessage(e), "danger"));
}

export const toggleSchedule = (s: Schedule) => changeSchedule(s, { active: !s.active }, s.active ? "Paused" : "Resumed");

export const removeSchedule = (s: Schedule) =>
  deleteSchedule(s.id)
    .then(() => toast("Recurring bill deleted"))
    .catch((e) => toast(errorMessage(e), "danger"));
