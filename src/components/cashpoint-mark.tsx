import Svg, { Circle, G, Path } from "react-native-svg";
import { palette } from "@/theme";

/** A ticket with a notch in each short side, in a 100×100 box. */
function ticketPath(x0: number, x1: number, y0: number, y1: number, r: number, n: number) {
  const cy = (y0 + y1) / 2;
  return [
    `M${x0 + r} ${y0} H${x1 - r} A${r} ${r} 0 0 1 ${x1} ${y0 + r}`,
    `V${cy - n} A${n} ${n} 0 0 0 ${x1} ${cy + n}`,
    `V${y1 - r} A${r} ${r} 0 0 1 ${x1 - r} ${y1} H${x0 + r} A${r} ${r} 0 0 1 ${x0} ${y1 - r}`,
    `V${cy + n} A${n} ${n} 0 0 0 ${x0} ${cy - n}`,
    `V${y0 + r} A${r} ${r} 0 0 1 ${x0 + r} ${y0} Z`,
  ].join(" ");
}

const TICKET = ticketPath(17, 83, 31, 69, 7, 6);

/**
 * The Cashpoint mark: a ₦ on a tilted cash ticket, the same ticket the code is shown on.
 * Flat on an orange circle so it sits with flags, coins and biller logos in lists, and still
 * reads at 24px. `plain` drops the circle (for orange surfaces).
 */
export function CashpointMark({ size = 44, plain = false }: { size?: number; plain?: boolean }) {
  const ink = palette.orange[600];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Cashpoint">
      {!plain && <Circle cx="50" cy="50" r="50" fill={palette.orange[500]} />}
      <G transform="rotate(-12 50 50)">
        <Path d={TICKET} fill="#ffffff" />
        {/* ₦: an N with two bars */}
        <Path d="M40.5 59.5 V40.5 L59.5 59.5 V40.5" stroke={ink} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M34 47 H66 M34 53 H66" stroke={ink} strokeWidth={3.4} strokeLinecap="round" />
      </G>
    </Svg>
  );
}
