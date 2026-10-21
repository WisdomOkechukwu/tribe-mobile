import { requireOptionalNativeModule } from "expo";

/**
 * Save a captured PNG to Photos. Returns false if the user said no. (Web: save-image.web.ts)
 * expo-media-library loads lazily: importing it in a build without its native module (a dev build
 * made before it was added) throws at import time and takes the receipt route down with it.
 */
export async function saveImage(uri: string, _name: string) {
  if (!requireOptionalNativeModule("ExpoMediaLibraryNext")) throw new Error("expo-media-library isn't in this build");
  const { Asset, requestPermissionsAsync } = await import("expo-media-library");
  const perm = await requestPermissionsAsync(true, ["photo"]);
  if (!perm.granted) return false;
  await Asset.create(uri);
  return true;
}
