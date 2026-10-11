/** Web: download the PNG (expo-media-library has no web build of its new API). */
export async function saveImage(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
  return true;
}
