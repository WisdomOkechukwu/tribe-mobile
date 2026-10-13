import Svg, { Circle, Path, Rect } from "react-native-svg";

export type GlyphName = "incoming" | "outgoing" | "tray" | "bank" | "globe" | "crypto" | "cashpoint" | "friends" | "at" | "naira" | "qr" | "bolt" | "card" | "spark";

/**
 * Our own minimalist line icons (same drawing language as `TabIcon`: 24-grid, 1.8 stroke, round
 * caps). Used where an action needs to feel like Tribe rather than a system symbol — the Home
 * Receive action, the Receive money sheet, Send's options, How it works.
 */
export function Glyph({ name, size = 22, color, strokeWidth = 1.8 }: { name: GlyphName; size?: number; color: string; strokeWidth?: number }) {
  const s = { stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* money coming in: arrow arriving down-left */}
      {name === "incoming" && <Path d="M17 7 7.5 16.5M7 9.5v7.5h7.5" {...s} />}
      {/* money going out: arrow leaving up-right */}
      {name === "outgoing" && <Path d="M7 17 16.5 7.5M9.5 7H17v7.5" {...s} />}
      {/* arrow dropping into a tray */}
      {name === "tray" && <Path d="M12 4v9.5M8 9.5l4 4 4-4M4.5 14v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3" {...s} />}
      {name === "bank" && <Path d="M3.8 9.4 12 4.6l8.2 4.8M5 9.8h14M6.5 10.2v6.6M10.2 10.2v6.6M13.8 10.2v6.6M17.5 10.2v6.6M4.2 19.4h15.6" {...s} />}
      {name === "globe" && (
        <>
          <Circle cx={12} cy={12} r={8.4} {...s} />
          <Path d="M3.8 12h16.4M12 3.6c2.3 2.4 3.4 5.2 3.4 8.4s-1.1 6-3.4 8.4c-2.3-2.4-3.4-5.2-3.4-8.4s1.1-6 3.4-8.4z" {...s} />
        </>
      )}
      {name === "crypto" && <Path d="M12 3.4 19.4 7.7v8.6L12 20.6l-7.4-4.3V7.7zM12 8.4l3.2 3.6-3.2 3.6-3.2-3.6z" {...s} />}
      {/* a ticket with a perforation */}
      {name === "cashpoint" && (
        <>
          <Path d="M4 8a1.8 1.8 0 0 1 1.8-1.8h12.4A1.8 1.8 0 0 1 20 8v1.6a2.4 2.4 0 0 0 0 4.8V16a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 16v-1.6a2.4 2.4 0 0 0 0-4.8z" {...s} />
          <Path d="M14.6 7v1.4M14.6 11.3v1.4M14.6 15.6V17" {...s} />
        </>
      )}
      {name === "friends" && (
        <>
          <Circle cx={9.2} cy={9} r={3.1} {...s} />
          <Path d="M3.8 18.6c.9-2.6 2.9-4 5.4-4s4.5 1.4 5.4 4M15.6 6.2a3 3 0 0 1 0 5.6M17.4 14.9c1.4.6 2.3 1.8 2.8 3.7" {...s} />
        </>
      )}
      {name === "at" && <Path d="M15.4 12a3.4 3.4 0 1 1-6.8 0 3.4 3.4 0 0 1 6.8 0zm0 0v1.4a2.3 2.3 0 0 0 4.6 0V12a8 8 0 1 0-3.2 6.4" {...s} />}
      {name === "naira" && <Path d="M7.4 18.6V5.4l9.2 13.2V5.4M4.6 10.4h14.8M4.6 13.6h14.8" {...s} />}
      {name === "qr" && (
        <>
          <Rect x={4.2} y={4.2} width={6} height={6} rx={1.6} {...s} />
          <Rect x={13.8} y={4.2} width={6} height={6} rx={1.6} {...s} />
          <Rect x={4.2} y={13.8} width={6} height={6} rx={1.6} {...s} />
          <Path d="M14 14h2.4v2.4M19.8 14v.1M14 19.8h2.4M19.8 17.6v2.2h-1.6" {...s} />
        </>
      )}
      {name === "bolt" && <Path d="M13.2 3.6 5.8 13.4h5.4l-1 7 7.4-9.8h-5.4z" {...s} />}
      {name === "card" && (
        <>
          <Rect x={3.4} y={5.8} width={17.2} height={12.4} rx={2.6} {...s} />
          <Path d="M3.4 10h17.2M6.8 14.8h3.4" {...s} />
        </>
      )}
      {name === "spark" && <Path d="M12 3.8c.6 4.3 3.9 7.6 8.2 8.2-4.3.6-7.6 3.9-8.2 8.2-.6-4.3-3.9-7.6-8.2-8.2 4.3-.6 7.6-3.9 8.2-8.2z" {...s} />}
    </Svg>
  );
}
