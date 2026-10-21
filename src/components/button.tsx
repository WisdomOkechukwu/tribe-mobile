import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native";
import { radius, spacing, useColors } from "@/theme";
import { Icon, type IconName } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

type Variant = "primary" | "secondary" | "tertiary" | "destructive" | "accent" | "onDark" | "white" | "ghost" | "danger";
type Size = "lg" | "md" | "sm";

const HEIGHT: Record<Size, number> = { lg: 54, md: 44, sm: 34 };
/** Labels up to this many characters always fit a full-width button, so they never auto-shrink. */
const SHRINK_AFTER = 22;

/**
 * The one button. Pill-shaped, full-width by default (wallet CTAs are bottom-anchored).
 * primary = brand purple · secondary = quiet fill · tertiary = text only · destructive = red text on red tint.
 * `ghost`/`danger` are legacy aliases of tertiary/destructive.
 */
export function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  icon,
  loading,
  disabled,
  inline,
  style,
  colors,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** shrink to content instead of filling the row */
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
  /** explicit fill/label colours (e.g. a card's theme) — overrides the variant's */
  colors?: { bg: string; fg: string };
}) {
  const c = useColors();
  const look: Record<Variant, { bg: string; fg: string }> = {
    primary: { bg: c.brand, fg: c.onBrand },
    accent: { bg: c.accent, fg: c.onBrand },
    secondary: { bg: c.surfaceAlt, fg: c.text },
    tertiary: { bg: "transparent", fg: c.brandText },
    ghost: { bg: "transparent", fg: c.brandText },
    destructive: { bg: c.dangerSoft, fg: c.danger },
    danger: { bg: c.dangerSoft, fg: c.danger },
    onDark: { bg: "rgba(255,255,255,0.16)", fg: "#ffffff" },
    white: { bg: "#ffffff", fg: "#14101A" },
  };
  const { bg, fg } = colors ?? look[variant];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.full,
          height: HEIGHT[size],
          paddingHorizontal: size === "lg" ? spacing.lg : spacing.smd,
          alignSelf: inline ? "flex-start" : "stretch",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm }}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon && <Icon name={icon} size={size === "sm" ? 14 : 18} color={fg} />}
            {/* one line, always — shrink rather than wrap ("Withdra / w"). Only long labels may
                shrink: on iOS (Fabric) adjustsFontSizeToFit can measure before the button has its
                width and stick at a tiny size, ignoring minimumFontScale ("View details" on /success) */}
            <Text variant={size === "sm" ? "subhead" : "bodyStrong"} style={{ color: fg, flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit={title.length > SHRINK_AFTER} minimumFontScale={0.8}>
              {title}
            </Text>
          </>
        )}
      </View>
    </PressableScale>
  );
}
