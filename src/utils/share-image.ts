import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import { Platform, Share, type View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { toast } from "@/stores/use-ui-store";
import { saveImage } from "./save-image";

/** Turn an on-screen view into a PNG (a tmp file; a data URI on web). Null when capture isn't possible. */
export async function captureImage(ref: RefObject<View | null>) {
  try {
    return await captureRef(ref, { format: "png", quality: 1, result: Platform.OS === "web" ? "data-uri" : "tmpfile" });
  } catch {
    // capture failed (old device, missing module in this build)
    return null;
  }
}

/**
 * Share a captured image, with words to go with it. iOS hands both to the share sheet; Android's
 * share sheet takes the picture only, so the words are copied to paste beside it. Without an
 * image (capture failed) the words go on their own; on web the image downloads.
 */
export async function shareImage(uri: string | null, o: { message: string; name: string; title: string }) {
  try {
    if (uri && Platform.OS === "web") return void (await saveImage(uri, `${o.name}.png`));
    if (uri && Platform.OS === "ios") return void (await Share.share({ url: uri, message: o.message }));
    if (uri && (await Sharing.isAvailableAsync())) {
      await Clipboard.setStringAsync(o.message).catch(() => {});
      toast("Message copied. Paste it with the picture.");
      return void (await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: o.title, UTI: "public.png" }));
    }
  } catch {
    // fall through to text
  }
  await Share.share({ message: o.message });
}

/** Save a captured image to Photos (downloads the PNG on web). */
export async function saveSharedImage(uri: string | null, name: string) {
  if (!uri) return toast("Couldn't save the picture. Try Share instead.", "danger");
  try {
    if (!(await saveImage(uri, `${name}.png`))) return toast("Allow Photos access to save pictures", "danger");
    toast(Platform.OS === "web" ? "Picture downloaded" : "Saved to Photos", "success");
  } catch {
    toast("Couldn't save the picture. Try Share instead.", "danger");
  }
}
