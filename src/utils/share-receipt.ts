import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import { Platform, Share, type View } from "react-native";
import { captureRef } from "react-native-view-shot";
import type { Transaction } from "@/data/seed";
import { toast } from "@/stores/use-ui-store";
import { fullDate } from "./format";
import { saveImage } from "./save-image";
import { headline, txTitle } from "./tx";

async function capture(ref: RefObject<View | null>) {
  return captureRef(ref, { format: "png", quality: 1, result: Platform.OS === "web" ? "data-uri" : "tmpfile" });
}

const textReceipt = (tx: Transaction) => `${txTitle(tx)}\n${headline(tx)}${tx.meta?.face ? ` · ${tx.meta.face}` : ""}\n${fullDate(tx.date)}\nRef ${tx.reference}\n— Tribe`;


/** Turn the on-screen receipt into an image (a tmp file; a data URI on web). */
export async function captureReceipt(ref: RefObject<View | null>) {
  try {
    return await capture(ref);
  } catch {
    // capture failed (old device, missing module in this build)
    return null;
  }
}

/** Share a captured receipt image; without one, share the text version. */
export async function shareReceiptImage(uri: string | null, tx: Transaction) {
  try {
    if (uri && Platform.OS === "web") return void (await saveImage(uri, `tribe-receipt-${tx.reference}.png`));
    if (uri && (await Sharing.isAvailableAsync())) return await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share receipt", UTI: "public.png" });
  } catch {
    // fall through to text
  }
  await Share.share({ message: textReceipt(tx) });
}

/** Save a captured receipt image to Photos (downloads the PNG on web). */
export async function saveReceiptImage(uri: string | null, tx: Transaction) {
  if (!uri) return toast("Couldn't save the receipt. Try Share instead.", "danger");
  try {
    if (!(await saveImage(uri, `tribe-receipt-${tx.reference}.png`))) return toast("Allow Photos access to save receipts", "danger");
    toast(Platform.OS === "web" ? "Receipt downloaded" : "Receipt saved to Photos", "success");
  } catch {
    toast("Couldn't save the receipt. Try Share instead.", "danger");
  }
}
