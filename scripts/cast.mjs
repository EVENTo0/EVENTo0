// Usage: node scripts/cast.mjs <year> <youssef|hamad|noura>   prints the canonical age-correct description
import { castFor } from "../lib/filmBible.js";
const [year, who] = process.argv.slice(2);
const scene = { year: +year, cast: [who] };
if (!year || !["youssef", "hamad", "noura"].includes(who)) { console.error("usage: node scripts/cast.mjs <year> <youssef|hamad|noura>"); process.exit(1); }
const c = castFor(scene)[0];
console.log(`${c.name} (age ${c.age}): ${c.look}`);
