import { router } from "expo-router";
import { StatusScreen } from "@/screens/onboarding/shell";

/** Forgot Password.png finale. */
export default function PasswordDone() {
  return (
    <StatusScreen
      icon="checkCircle"
      title="Password changed"
      body="You've successfully changed your password. Sign in with the new one."
      cta="Back to sign in"
      onPress={() => (router.canDismiss() ? router.dismissTo("/sign-in") : router.replace("/sign-in"))}
    />
  );
}
