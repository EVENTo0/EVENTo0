// Builds public/previz/season.html from previz/src + content/season1/episodes/ep*.shots.json
import fs from "node:fs";
import path from "node:path";
const root = new URL("../", import.meta.url).pathname;
const rd = (p) => fs.readFileSync(path.join(root, p), "utf8");
const epDir = process.env.EP_DIR || path.join(root, "content/season1/episodes");
const data = fs.readdirSync(epDir).filter((f) => /^ep\d\d\.shots\.json$/.test(f)).sort().map((f) => JSON.parse(fs.readFileSync(path.join(epDir, f), "utf8")));
if (!data.length) { console.error("no episode data"); process.exit(1); }
const validator = rd("lib/validate.js").replace(/^export /gm, "");
const html = [
  rd("previz/src/head.html"), rd("previz/src/body.html"), "<script>",
  rd("previz/src/engine.js"), rd("previz/src/draw.js"),
  validator, `const DATA = ${JSON.stringify(data).replace(/</g, "\\u003c")};`,
  rd("previz/src/app.js"), "</script>", "",
].join("\n");
const out = path.resolve(root, process.argv[2] || "public/previz/season.html");
fs.writeFileSync(out, html);
console.log(`built ${out} — ${data.length} episodes, ${(html.length / 1024).toFixed(0)} KB`);
