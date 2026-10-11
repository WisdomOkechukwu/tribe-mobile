import { Asset, requestPermissionsAsync } from "expo-media-library";

/** Save a captured PNG to Photos. Returns false if the user said no. (Web: save-image.web.ts) */
export async function saveImage(uri: string, _name: string) {
  const perm = await requestPermissionsAsync(true, ["photo"]);
  if (!perm.granted) return false;
  await Asset.create(uri);
  return true;
}
