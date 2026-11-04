import { Text } from "@/components/text";

/**
 * Dev builds only: the local API returns the code it emailed (`debug_code`), so a tester without
 * the inbox can still get through. Never shown in production builds.
 */
export function DevCodeHint({ code }: { code: string | null | undefined }) {
  if (!__DEV__ || !code) return null;
  return (
    <Text variant="caption" tone="subtle" align="center">
      Dev build · code {code}
    </Text>
  );
}
