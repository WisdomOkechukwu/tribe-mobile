// Rasterises the crypto logos and gift-card marks (SVG sources kept beside them) to PNG.
// expo-image decodes SVGs on every mount; bundled PNGs draw at once. Gift marks are single-colour
// with alpha, so `tintColor` still recolours them.
// Run from tribe-mobile/: npm run logos   (uses the landing page's sharp)
import { readdirSync } from "fs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(path.join(root, "package.json"));
const sharp = require("sharp");

for (const dir of ["logos/crypto", "gift-marks"]) {
  const full = path.join(here, "../assets", dir);
  for (const f of readdirSync(full).filter((x) => x.endsWith(".svg"))) {
    const out = path.join(full, f.replace(/\.svg$/, ".png"));
    await sharp(path.join(full, f), { density: 400 }).resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toFile(out);
    console.log(dir, f);
  }
}
