// Fails if the app uses an SF Symbol newer than SF Symbols 4 (iOS 16). A newer glyph renders
// BLANK on older iOS — that's how the Wallet tab icon vanished on iOS 17 (wallet.bifold = iOS 18).
// NativeTabs (iOS 26+ only) is exempt.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dts = fs.readFileSync(path.join(app, "node_modules/sf-symbols-typescript/dist/index.d.ts"), "utf8").split("\n");
const sf5 = dts.findIndex((l) => l.startsWith("export type SFSymbols5_0"));
const lineOf = new Map();
dts.forEach((l, i) => {
  const m = l.match(/^\s*\| '([^']+)'$/);
  if (m && !lineOf.has(m[1])) lineOf.set(m[1], i);
});

const files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) && files.push(path.join(d, e.name))));
walk(path.join(app, "src"));

const bad = [];
for (const f of files) {
  if (f.endsWith("app-tabs.tsx")) continue;
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/ios:\s*"([a-z0-9.]+)"/g)) {
    const at = lineOf.get(m[1]);
    if (at === undefined) bad.push(`${path.relative(app, f)}: "${m[1]}" is not an SF Symbol`);
    else if (at > sf5) bad.push(`${path.relative(app, f)}: "${m[1]}" needs iOS 17+ (SF Symbols 5+)`);
  }
}
if (bad.length) {
  console.error(bad.join("\n"));
  process.exit(1);
}
console.log(`SF Symbols OK (${files.length} files, all ≤ SF Symbols 4 / iOS 16)`);
