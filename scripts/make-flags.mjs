// Rasterises the real country flags (flag-icons, MIT) to PNG for the app.
// iOS's SVG decoder drops <marker>/<use> (US & EU stars, Kenya's shield), so we ship PNGs.
// Run from tribe-mobile/: node scripts/make-flags.mjs   (uses the landing page's sharp + flag-icons)
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(path.join(root, "package.json"));
const sharp = require("sharp");
// currency flags (CoinIcon) + the euro countries' own flags (CountryFlag on Global send)
const CODES = ["ng", "us", "gb", "eu", "ke", "gh", "ca", "de", "fr", "ie", "nl", "es"];

for (const cc of CODES) {
  const src = path.join(root, "node_modules/flag-icons/flags/1x1", `${cc}.svg`);
  const out = path.join(here, "../assets/flags", `${cc}.png`);
  await sharp(src, { density: 300 }).resize(192, 192).png({ compressionLevel: 9 }).toFile(out);
  console.log("flag", cc);
}
