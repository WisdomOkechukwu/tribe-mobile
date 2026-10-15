import { forwardRef } from "react";
import { View } from "react-native";
import type { Transaction } from "@/data/seed";
import { palette } from "@/theme";
import { ReceiptPoster, ReceiptStub, Scallops, type StubColors } from "./receipt-poster";

// the image is always light, whatever the app's theme (it's going into someone else's chat)
const LIGHT: StubColors = { paper: "#FFFFFF", ink: "#14101A", muted: "#6E6878", line: "#E3DCEA", soft: "#F5F1F9", success: "#1E9A45", brand: palette.purple[500] };

/**
 * The shareable receipt image: the poster (Midnight band, sticker, big amount) over a paper stub
 * with the details, barcode and reference, then a scalloped edge. Rendered visibly in the share
 * sheet, captured, then shared or saved.
 */
export const ReceiptTicket = forwardRef<View, { tx: Transaction; width: number }>(function ReceiptTicket({ tx, width }, ref) {
  return (
    <View ref={ref} collapsable={false} style={{ width, backgroundColor: "transparent" }}>
      <View style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" }}>
        <ReceiptPoster tx={tx} width={width} />
        <ReceiptStub tx={tx} colors={LIGHT} />
      </View>
      <Scallops width={width} color={LIGHT.paper} />
    </View>
  );
});
