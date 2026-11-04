import { router } from "expo-router";
import { createPin } from "@/api/auth";
import { errorMessage } from "@/api/http";
import { PinCreate } from "@/screens/onboarding/pin-create";
import { BandSkip } from "@/screens/onboarding/shell";
import { exitSetup } from "@/utils/setup-flow";
import { runWithLoader, toast } from "@/stores/use-ui-store";

/** Transaction PIN: 4 digits, approves every payment. Saved on the API (POST pin). Setup opens straight here (no intro). */
export default function CreatePin() {
  return (
    <PinCreate
      length={4}
      right={<BandSkip onPress={exitSetup} />}
      title="Create transaction PIN"
      headline={["Your payment", "PIN."]}
      subtitle="4 digits that approve every payment. Keep it private, Tribe will never ask for it."
      onDone={async (pin) => {
        try {
          await runWithLoader("Saving your PIN…", createPin(pin));
          router.push("/setup/pin-done");
        } catch (e) {
          toast(errorMessage(e), "danger");
          throw e;
        }
      }}
    />
  );
}
