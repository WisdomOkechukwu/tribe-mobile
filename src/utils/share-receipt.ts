import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import { Platform, Share, type View } from "react-native";
import { captureRef } from "react-native-view-shot";
import type { Transaction } from "@/data/seed";
import { toast } from "@/stores/use-ui-store";
import { fullDate } from "./format";
import { saveImage } from "./save-image";
import { headline } from "./tx";

async function capture(ref: RefObject<View | null>) {
  return captureRef(ref, { format: "png", quality: 1, result: Platform.OS === "web" ? "data-uri" : "tmpfile" });
}

const textReceipt = (tx: Transaction) => `${tx.title}\n${headline(tx)}${tx.meta?.face ? ` · ${tx.meta.face}` : ""}\n${fullDate(tx.date)}\nRef ${tx.reference}\n— Tribe`;


/** Share the receipt as an image (falls back to text if capture isn't possible). */
export async function shareReceipt(ref: RefObject<View | null>, tx: Transaction) {
  try {
    const uri = await capture(ref);
    if (Platform.OS === "web") return void (await saveImage(uri, `tribe-receipt-${tx.reference}.png`));
    if (await Sharing.isAvailableAsync()) return await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share receipt", UTI: "public.png" });
  } catch {
    // capture failed (old device, missing module in this build) — share the text instead
  }
  await Share.share({ message: textReceipt(tx) });
}

/** Save the receipt image to Photos (downloads the PNG on web). */
export async function downloadReceipt(ref: RefObject<View | null>, tx: Transaction) {
  try {
    const uri = await capture(ref);
    if (!(await saveImage(uri, `tribe-receipt-${tx.reference}.png`))) return toast("Allow Photos access to save receipts", "danger");
    toast(Platform.OS === "web" ? "Receipt downloaded" : "Receipt saved to Photos", "success");
  } catch {
    toast("Couldn't save the receipt. Try Share instead.", "danger");
  }
}
