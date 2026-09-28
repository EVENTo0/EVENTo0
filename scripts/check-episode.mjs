// Usage: node scripts/check-episode.mjs 01   — validates content/season1/episodes/ep01.{screenplay.md,shots.json}
import fs from "node:fs";
import { validatePrompts } from "../lib/validate.js";
const nn = process.argv[2]?.padStart(2, "0");
if (!nn) { console.error("usage: node scripts/check-episode.mjs NN"); process.exit(1); }
const dir = new URL("../content/season1/episodes/", import.meta.url);
const errs = [], warn = [];
const CAST = ["youssef", "hamad", "noura", "salem", "mariam", "khalid", "faisal"];
const SET = ["bedside_dawn", "bedside_night", "desert_dawn", "majlis", "kitchen", "night_room", "clinic", "car", "desert_lone"];
let shots;
try { shots = JSON.parse(fs.readFileSync(new URL(`ep${nn}.shots.json`, dir), "utf8")); } catch (e) { console.error("FAIL shots.json:", e.message); process.exit(1); }
let sp = "";
try { sp = fs.readFileSync(new URL(`ep${nn}.screenplay.md`, dir), "utf8"); } catch { errs.push("screenplay.md missing"); }
const words = sp.trim().split(/\s+/).filter(Boolean).length;
if (words < 3500) errs.push(`screenplay is ${words} words, expected 4500-6000 (min 3500)`);
if (shots.episode !== +nn) errs.push("episode number mismatch");
for (const k of ["title_ar", "title_en", "logline_ar", "anchor"]) if (!shots[k]) errs.push(`missing ${k}`);
const subs = shots.subscenes || [];
if (subs.length < 6 || subs.length > 9) errs.push(`${subs.length} subscenes, expected 6-9`);
let total = 0, nshots = 0;
for (const s of subs) {
  if (!new RegExp(`^E${nn}-\\d\\d$`).test(s.id || "")) errs.push(`bad subscene id ${s.id}`);
  if (!SET.includes(s.setting)) errs.push(`${s.id}: setting "${s.setting}" not allowed`);
  if (!Array.isArray(s.cast) || !s.cast.length || s.cast.some((c) => !CAST.includes(c))) errs.push(`${s.id}: bad cast`);
  if (!s.caption_ar || !s.beat_ar) errs.push(`${s.id}: missing caption_ar/beat_ar`);
  if (!sp.includes(s.id)) errs.push(`${s.id}: not present in screenplay`);
  total += s.dur_sec || 0;
  const sh = s.shots || [];
  if (sh.length < 2 || sh.length > 4) errs.push(`${s.id}: ${sh.length} shots, expected 2-4`);
  for (const x of sh) {
    nshots++;
    const v = validatePrompts({ midjourney: x.midjourney, runway: x.runway, sound: x.sound }, { cast: s.cast.includes("hamad") ? ["hamad"] : [] });
    v.issues.forEach((i) => errs.push(`${x.id}: ${i}`));
    if (!x.dur_sec || x.dur_sec < 3 || x.dur_sec > 15) errs.push(`${x.id}: dur_sec ${x.dur_sec}`);
  }
}
if (total < 1200 || total > 2100) errs.push(`total on-screen ${total}s, expected ~1500-1800`);
console.log(`ep${nn}: ${subs.length} subscenes, ${nshots} shots, ${total}s, screenplay ${words} words`);
if (errs.length) { console.log(errs.slice(0, 40).map((e) => " ✗ " + e).join("\n")); if (errs.length > 40) console.log(` … +${errs.length - 40} more`); process.exit(1); }
console.log("OK");
