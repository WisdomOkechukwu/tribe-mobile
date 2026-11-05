import { router } from "expo-router";
import { Button } from "@/components/button";
import { TransactionPinArt } from "@/components/verified-art";
import { BandSkip, Hero, OnboardingShell, Perks } from "@/screens/onboarding/shell";
import { exitSetup } from "@/utils/setup-flow";

/** Transaction PIN intro: the art of what it does, why it matters, then create → confirm. */
export default function PinIntro() {
  return (
    <OnboardingShell icon="lock" right={<BandSkip onPress={exitSetup} />} title="Create a transaction PIN" headline={["Lock in your", "payment PIN."]} subtitle="Your PIN approves every payment, swap and Cashpoint." footer={<Button title="Create my PIN" onPress={() => router.push("/setup/create-pin")} />}>
      <Hero>
        <TransactionPinArt done={false} scale={0.9} />
      </Hero>
      <Perks
        items={[
          { icon: "shield", title: "Nobody else can pay", body: "Every payment, swap and Cashpoint needs it." },
          { icon: "key", title: "4 digits, all yours", body: "Easy to remember. Not your birthday, please." },
          { icon: "eyeOff", title: "Never shared", body: "Tribe will never ask you for it. Ever." },
        ]}
      />
    </OnboardingShell>
  );
}
