import Svg, { Circle, Path, Rect } from "react-native-svg";

export type TabIconName = "home" | "wallet" | "pay" | "card" | "me";

/**
 * Our own tab glyphs: an outline when the tab is idle, filled when it's selected. Drawn in SVG so
 * they look identical on every iOS / Android / web version (SF Symbols vary by OS — the Wallet
 * glyph we used before only exists on iOS 18+). `cut` is the colour punched out of filled shapes.
 */
export function TabIcon({ name, focused, color, cut, size = 24 }: { name: TabIconName; focused: boolean; color: string; cut: string; size?: number }) {
  const stroke = { stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "home" &&
        (focused ? (
          <Path d="M3.2 10.4 12 3.3l8.8 7.1v9a1.6 1.6 0 0 1-1.6 1.6H15v-6.1H9V21H4.8a1.6 1.6 0 0 1-1.6-1.6z" fill={color} />
        ) : (
          <Path d="M4 10.8 12 4.3l8 6.5v8.6a.9.9 0 0 1-.9.9H15v-5.8H9v5.8H4.9a.9.9 0 0 1-.9-.9z" {...stroke} />
        ))}
      {name === "wallet" &&
        (focused ? (
          <>
            <Path d="M5 6.6A2.6 2.6 0 0 1 7.6 4h9.1a1 1 0 0 1 1 1v1.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" fill="none" />
            <Rect x={3.2} y={6.6} width={17.6} height={13.6} rx={3} fill={color} />
            <Rect x={13.6} y={11.2} width={7.2} height={4.4} rx={2.2} fill={cut} />
            <Circle cx={15.9} cy={13.4} r={0.95} fill={color} />
          </>
        ) : (
          <>
            <Path d="M5 7.4A2.4 2.4 0 0 1 7.4 5h9.2a.9.9 0 0 1 .9.9v1.5" {...stroke} />
            <Rect x={4} y={7.4} width={16} height={12.2} rx={2.6} {...stroke} />
            <Path d="M20 11.4h-4.2a2 2 0 0 0 0 4H20" {...stroke} />
            <Circle cx={16} cy={13.4} r={0.9} fill={color} />
          </>
        ))}
      {name === "pay" &&
        (focused ? (
          <>
            <Rect x={3.4} y={3.4} width={7.6} height={7.6} rx={2.2} fill={color} />
            <Rect x={13} y={3.4} width={7.6} height={7.6} rx={3.8} fill={color} />
            <Rect x={3.4} y={13} width={7.6} height={7.6} rx={2.2} fill={color} />
            <Rect x={13} y={13} width={7.6} height={7.6} rx={2.2} fill={color} />
          </>
        ) : (
          <>
            <Rect x={4.2} y={4.2} width={6.4} height={6.4} rx={1.8} {...stroke} />
            <Rect x={13.4} y={4.2} width={6.4} height={6.4} rx={3.2} {...stroke} />
            <Rect x={4.2} y={13.4} width={6.4} height={6.4} rx={1.8} {...stroke} />
            <Rect x={13.4} y={13.4} width={6.4} height={6.4} rx={1.8} {...stroke} />
          </>
        ))}
      {name === "card" &&
        (focused ? (
          <>
            <Rect x={2.6} y={5} width={18.8} height={14} rx={3} fill={color} />
            <Rect x={2.6} y={8.6} width={18.8} height={2.6} fill={cut} />
            <Rect x={5.6} y={14.4} width={5} height={1.8} rx={0.9} fill={cut} />
          </>
        ) : (
          <>
            <Rect x={3.4} y={5.6} width={17.2} height={12.8} rx={2.6} {...stroke} />
            <Path d="M3.4 9.9h17.2M6.6 15h3.6" {...stroke} />
          </>
        ))}
      {name === "me" &&
        (focused ? (
          <>
            <Circle cx={12} cy={12} r={9.4} fill={color} />
            <Circle cx={12} cy={9.8} r={3.3} fill={cut} />
            <Path d="M6.4 18.3c1.3-2.3 3.3-3.5 5.6-3.5s4.3 1.2 5.6 3.5a8.3 8.3 0 0 1-11.2 0z" fill={cut} />
          </>
        ) : (
          <>
            <Circle cx={12} cy={12} r={8.8} {...stroke} />
            <Circle cx={12} cy={10} r={3.1} {...stroke} />
            <Path d="M6.7 18.1c1.2-2.1 3.1-3.2 5.3-3.2s4.1 1.1 5.3 3.2" {...stroke} />
          </>
        ))}
    </Svg>
  );
}
