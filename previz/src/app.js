/* Data-driven season animatic. DATA (episode shots.json objects) and the prompt validator are injected by scripts/build-season-animatic.mjs */
const $ = (id) => document.getElementById(id);
const cv = $("cv"), g = cv.getContext("2d");
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const BORN = { hamad: 1938, youssef: 1963, noura: 1966, salem: 1968, mariam: 1990, khalid: 1994, faisal: 1975 };
const NAME = { hamad: "Hamad", youssef: "Youssef", noura: "Noura", salem: "Salem", mariam: "Mariam", khalid: "Khalid", faisal: "Dr Faisal" };
const ageOf = (w, y) => y - BORN[w];
const ERA = { 1973: ["rgba(255,170,60,.16)", "soft-light"], 1993: ["rgba(255,120,40,.14)", "soft-light"], 2010: ["rgba(120,190,200,.10)", "soft-light"], 2018: ["rgba(60,90,180,.14)", "soft-light"], 2019: ["rgba(90,120,190,.10)", "soft-light"] };
const eraKey = (y) => (y <= 1980 ? 1973 : y <= 2000 ? 1993 : y <= 2014 ? 2010 : y <= 2018 ? 2018 : 2019);
const ERA_COL = { 1973: "#c9a84c", 1993: "#c04040", 2010: "#4488cc", 2018: "#8a6ad0", 2019: "#60a860" };

const SETTING = {
  bedside_dawn: (g, p, t) => bedside(g, p, t, { face: 1, cam: (p) => [lerp(1000, 960, p), lerp(400, 480, p), lerp(1, 1.42, ease(p))] }),
  bedside_night: (g, p, t) => bedside(g, p, t, { night: true, face: 1, cam: (p) => [lerp(1050, 1120, p), lerp(430, 425, p), lerp(1.05, 1.7, ease(p))] }),
  desert_dawn: desert1973, majlis, kitchen, night_room: nightRoom, clinic, car, desert_lone: desertLone,
};
const MIX = { bedside_dawn: [.014, .07, 500], bedside_night: [.008, .06, 300], desert_dawn: [.12, .03, 700], majlis: [.01, .06, 300], kitchen: [.008, .04, 300], night_room: [0, .075, 200], clinic: [.01, .03, 400], car: [.09, .02, 180], desert_lone: [.1, .05, 650] };

const EPS = DATA.slice().sort((a, b) => a.episode - b.episode);
const durOf = (s) => clamp(Math.round((s.dur_sec || 100) / 14), 8, 18);
let epI = 0, LIST = [], starts = [], TOTAL = 0, T = 0, playing = false, speed = 1, cur = -1, last = 0;

function loadEpisode(i) {
  epI = i; const ep = EPS[i];
  LIST = ep.subscenes.map((s) => ({ ...s, ep: ep.episode, D: durOf(s) }));
  starts = LIST.map((_, k) => LIST.slice(0, k).reduce((a, s) => a + s.D, 0));
  TOTAL = LIST.reduce((a, s) => a + s.D, 0);
  $("epTitle").textContent = `EP${String(ep.episode).padStart(2, "0")} · ${ep.title_ar}`;
  document.querySelectorAll(".eps button").forEach((b, k) => b.setAttribute("aria-pressed", k === i));
  $("tl").innerHTML = LIST.map((s, k) => `<button class="seg" style="flex:${s.D};color:${ERA_COL[eraKey(s.year)]}" data-i="${k}" aria-label="${esc(s.id)}"><span class="fill"></span><span class="lbl">${s.id.slice(-2)}</span></button>`).join("");
  $("strip").innerHTML = LIST.map((s, k) => `<button class="thumb" data-i="${k}" aria-label="${esc(s.id)}"><canvas width="420" height="180"></canvas><span>${s.id.slice(-2)}</span><em></em></button>`).join("");
  document.querySelectorAll("#tl [data-i], #strip [data-i]").forEach((el) => el.addEventListener("click", () => seekScene(+el.dataset.i, .02)));
  LIST.forEach((s, k) => { renderFrame(g, s, .5); $("strip").children[k].querySelector("canvas").getContext("2d").drawImage(cv, 0, 0, 420, 180); const r = QA?.byId[s.id]; if (r) { const e = $("strip").children[k].querySelector("em"); e.textContent = r.ok ? "✓" : "✗"; e.style.color = r.ok ? "var(--ok)" : "var(--bad)"; } });
  T = 0; cur = -1; setPlaying(false); seekScene(0, .5);
}

function renderFrame(g, s, p) {
  const t = p * s.D;
  g.save(); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  (SETTING[s.setting] || desert1973)(g, p, t);
  g.restore();
  const [tint, mode] = ERA[eraKey(s.year)];
  g.save(); g.globalCompositeOperation = mode; g.fillStyle = tint; g.fillRect(0, 0, W, H); g.restore();
  const vg = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .62);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.62)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.save(); g.globalAlpha = .07; for (let n = 0; n < 220; n++) { g.fillStyle = Math.random() > .5 ? "#fff" : "#000"; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); } g.restore();
  const fade = Math.max(1 - p / .07, (p - .93) / .07, 0);
  if (fade > 0) { g.fillStyle = `rgba(0,0,0,${clamp(fade)})`; g.fillRect(0, 0, W, H); }
}

/* ---------- audio ---------- */
let A = null;
function audioOn() {
  if (A) return;
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource(); noise.buffer = buf; noise.loop = true;
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500;
  const wg = ac.createGain(); wg.gain.value = 0; noise.connect(lp).connect(wg).connect(ac.destination); noise.start();
  const dg = ac.createGain(); dg.gain.value = 0; dg.connect(ac.destination);
  [55, 82.4, 110.3].forEach((f, i) => { const o = ac.createOscillator(); o.type = "sine"; o.frequency.value = f; const og = ac.createGain(); og.gain.value = [1, .6, .25][i]; o.connect(og).connect(dg); o.start(); });
  A = { ac, wg, dg, lp }; audioScene(cur < 0 ? 0 : cur);
}
function audioScene(k) {
  if (!A || !LIST[k]) return;
  const [w, dr, f] = MIX[LIST[k].setting] || [.01, .04, 400], now = A.ac.currentTime;
  A.wg.gain.setTargetAtTime(w, now, .6); A.dg.gain.setTargetAtTime(dr, now, .8); A.lp.frequency.setTargetAtTime(f, now, .6);
}
function audioOff() { if (A) { A.wg.gain.setTargetAtTime(0, A.ac.currentTime, .1); A.dg.gain.setTargetAtTime(0, A.ac.currentTime, .1); } }

/* ---------- player ---------- */
function locate(t) {
  let k = LIST.length - 1;
  for (let j = 0; j < LIST.length; j++) if (t < starts[j] + LIST[j].D) { k = j; break; }
  return [k, clamp((t - starts[k]) / LIST[k].D)];
}
function paint() {
  const [k, p] = locate(T), s = LIST[k];
  renderFrame(g, s, p);
  if (k !== cur) { cur = k; onScene(k); audioScene(k); }
  $("cap").textContent = s.caption_ar || "";
  $("cap").style.opacity = p > .05 && p < .95 ? 1 : 0;
  $("time").textContent = `${mmss(T)} / ${mmss(TOTAL)} · compressed animatic`;
  document.querySelectorAll("#tl .fill").forEach((el, j) => (el.style.width = (j < k ? 100 : j === k ? p * 100 : 0) + "%"));
}
function onScene(k) {
  const s = LIST[k];
  $("hud").innerHTML = `<b>${esc(s.id)}</b> · ${s.year} · ${esc(s.location)}`;
  document.querySelectorAll("#tl .seg, #strip .thumb").forEach((el) => el.classList.toggle("on", +el.dataset.i === k));
  const cast = s.cast.map((w) => `<span class="chip">${NAME[w]} · ${ageOf(w, s.year)}</span>`).join("");
  $("shot").innerHTML = `
    <div class="ar" style="font-size:18px;font-weight:600;margin-bottom:4px;line-height:1.6">${esc(s.beat_ar)}</div>
    <div style="color:var(--gold);letter-spacing:.2em;font-size:10px;margin:8px 0 12px">${esc(s.id)} · ${esc(s.setting)}</div>
    <dl class="kv">
      <dt>Where / when</dt><dd>${esc(s.location)} — ${esc(s.time_of_day)}, ${s.year}</dd>
      <dt>Real runtime</dt><dd>${s.dur_sec} s <span style="color:var(--mute)">(previewed in ${s.D} s)</span></dd>
      <dt>Camera</dt><dd>${esc(s.camera)}</dd>
      <dt>Cast &amp; age</dt><dd><div class="chips">${cast}</div></dd>
      <dt>Line</dt><dd class="ar" style="font-size:15px">${esc(s.caption_ar)}</dd>
    </dl>`;
  $("prompts").innerHTML = s.shots.map((x, n) => `
    <div class="shotbox">
      <div class="shothead"><b>${esc(x.id)}</b><span>${x.dur_sec} s · ${esc(x.camera)}</span></div>
      ${[["Midjourney", x.midjourney], ["Runway", x.runway], ["Sound", x.sound]].map(([l, v]) => `<div class="pr"><div class="prh"><i>${l}</i><button class="cp" data-t="${esc(v)}">COPY</button></div><div class="prt">${esc(v)}</div></div>`).join("")}
    </div>`).join("");
  $("prompts").querySelectorAll(".cp").forEach((b) => b.addEventListener("click", () => { try { navigator.clipboard.writeText(b.dataset.t); b.textContent = "COPIED"; } catch { b.textContent = "select text"; } setTimeout(() => (b.textContent = "COPY"), 1500); }));
}
function loop(now) {
  if (playing) { T += ((now - last) / 1000) * speed; last = now; if (T >= TOTAL) { T = TOTAL - .001; setPlaying(false); } paint(); }
  requestAnimationFrame(loop);
}
function setPlaying(v) {
  playing = v; last = performance.now(); $("play").textContent = v ? "❚❚ Pause" : "▶ Play"; $("big").hidden = v;
  if (v && $("snd").getAttribute("aria-pressed") === "true") audioOn();
}
function seekScene(k, p = .5) { const i = clamp(k, 0, LIST.length - 1); T = starts[i] + LIST[i].D * p; paint(); }

/* ---------- automated tests over the whole season ---------- */
const probe = document.createElement("canvas"); probe.width = 84; probe.height = 36;
const pg = probe.getContext("2d", { willReadFrequently: true });
function sample(s, p) {
  renderFrame(g, s, p); pg.drawImage(cv, 0, 0, 84, 36);
  const d = pg.getImageData(0, 0, 84, 36).data, out = new Float32Array(84 * 36);
  for (let k = 0; k < out.length; k++) out[k] = d[k * 4] * .3 + d[k * 4 + 1] * .59 + d[k * 4 + 2] * .11;
  return out;
}
let QA = null;
function runQA() {
  const byId = {}, rows = [];
  const lum = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const diff = (x, y) => x.reduce((acc, v, k) => acc + Math.abs(v - y[k]), 0) / x.length;
  for (const ep of EPS) {
    let shots = 0, bad = 0, sec = 0, ok = 0, subs = 0;
    for (const sub of ep.subscenes) {
      const s = { ...sub, D: durOf(sub) };
      const a = sample(s, .2), b = sample(s, .5), c = sample(s, .8);
      const L = (lum(a) + lum(b) + lum(c)) / 3, motion = Math.max(diff(a, b), diff(b, c)), edge = lum(sample(s, .001));
      let promptBad = 0;
      for (const x of sub.shots) { shots++; const v = validatePrompts({ midjourney: x.midjourney, runway: x.runway, sound: x.sound }, { cast: sub.cast.includes("hamad") ? ["hamad"] : [] }); if (!v.ok) { promptBad++; bad++; } }
      const r = { renders: L > 4 && L < 200, moves: motion > .35, fade: edge < 6, cast: sub.cast.every((w) => BORN[w] && ageOf(w, sub.year) >= 0), prompts: promptBad === 0 };
      r.ok = r.renders && r.moves && r.fade && r.cast && r.prompts; byId[sub.id] = r; subs++; sec += sub.dur_sec; if (r.ok) ok++;
    }
    rows.push({ ep, subs, shots, sec, ok, bad });
  }
  QA = { byId, rows };
  const S = rows.reduce((a, r) => ({ subs: a.subs + r.subs, shots: a.shots + r.shots, sec: a.sec + r.sec, ok: a.ok + r.ok, bad: a.bad + r.bad }), { subs: 0, shots: 0, sec: 0, ok: 0, bad: 0 });
  $("sum").innerHTML = `<div>Scenes passing<b class="${S.ok === S.subs ? "ok" : "bad"}">${S.ok}/${S.subs}</b></div><div>Shots<b>${S.shots}</b></div><div>Prompt failures<b class="${S.bad ? "bad" : "ok"}">${S.bad}</b></div><div>Episodes<b>${EPS.length}/10</b></div><div>Real runtime<b>${Math.floor(S.sec / 60)} min</b></div>`;
  $("qa").innerHTML = `<tr><th>Episode</th><th>Scenes</th><th>Shots</th><th>Runtime</th><th>Passing</th><th>Bad prompts</th></tr>` + rows.map((r) => `<tr><td>EP${String(r.ep.episode).padStart(2, "0")} · ${esc(r.ep.title_ar)}</td><td>${r.subs}</td><td>${r.shots}</td><td>${Math.round(r.sec / 60)} min</td><td class="${r.ok === r.subs ? "p" : "f"}">${r.ok}/${r.subs}</td><td class="${r.bad ? "f" : "p"}">${r.bad}</td></tr>`).join("");
  window.__QA = { S, rows: rows.map((r) => ({ ep: r.ep.episode, subs: r.subs, ok: r.ok, bad: r.bad })) };
}

/* ---------- boot ---------- */
$("eps").innerHTML = EPS.map((e, i) => `<button class="b" data-e="${i}" aria-pressed="false"><span>EP${String(e.episode).padStart(2, "0")}</span> ${esc(e.title_ar)}</button>`).join("");
document.querySelectorAll("#eps button").forEach((b) => b.addEventListener("click", () => loadEpisode(+b.dataset.e)));
$("play").onclick = () => { if (T >= TOTAL - .01) T = 0; setPlaying(!playing); };
$("big").onclick = () => { if (T >= TOTAL - .01) T = 0; setPlaying(true); };
$("prev").onclick = () => { const [k, p] = locate(T); seekScene(p > .15 ? k : k - 1, .02); };
$("next").onclick = () => { const [k] = locate(T); seekScene(k + 1, .02); };
$("spd").onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? .5 : 1; $("spd").textContent = speed + "×"; };
$("snd").onclick = () => { const on = $("snd").getAttribute("aria-pressed") !== "true"; $("snd").setAttribute("aria-pressed", on); $("snd").textContent = on ? "Sound on" : "Sound off"; on ? (audioOn(), A && A.ac.resume()) : audioOff(); };
document.addEventListener("keydown", (e) => { if (e.code === "Space" && e.target.tagName !== "BUTTON") { e.preventDefault(); $("play").click(); } });
runQA(); loadEpisode(0);
requestAnimationFrame((n) => { last = n; loop(n); });
