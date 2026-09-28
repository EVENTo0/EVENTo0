const W = 1680, H = 720;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const seg = (p, a, b) => clamp((p - a) / (b - a));           // progress of p inside [a,b]
const sm = (p, a, b) => ease(seg(p, a, b));

function shade(c, k) {
  const n = parseInt(c.slice(1), 16);
  const r = Math.round(clamp(((n >> 16) & 255) * k, 0, 255));
  const g = Math.round(clamp(((n >> 8) & 255) * k, 0, 255));
  const b = Math.round(clamp((n & 255) * k, 0, 255));
  return `rgb(${r},${g},${b})`;
}
function lcg(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
const R = lcg(7);
const DUST = Array.from({ length: 80 }, () => ({ x: R(), y: R(), vx: (R() - .5) * .02, vy: -R() * .012 - .002, r: 1 + R() * 2.2, a: .3 + R() * .7, ph: R() * 6.28 }));

function glow(g, x, y, r, rgb, a) {
  g.save(); g.globalCompositeOperation = "lighter";
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}
function dust(g, t, box, rgb, alpha) {
  g.save(); g.globalCompositeOperation = "lighter";
  for (const d of DUST) {
    const px = box[0] + ((((d.x + t * d.vx) % 1) + 1) % 1) * (box[2] - box[0]);
    const py = box[1] + ((((d.y + t * d.vy) % 1) + 1) % 1) * (box[3] - box[1]);
    const tw = .6 + .4 * Math.sin(t * 1.3 + d.ph);
    g.fillStyle = `rgba(${rgb},${alpha * d.a * tw})`;
    g.beginPath(); g.arc(px, py, d.r, 0, 6.283); g.fill();
  }
  g.restore();
}
function vgrad(g, x, y, w, h, stops) {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
function poly(g, pts, fill) {
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
}
function rrect(g, x, y, w, h, r, fill) {
  g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); }
}

/* ---------- People: stylised silhouettes, lit by scene exposure `ex` ---------- */
function person(g, o) {
  const { x, y, h } = o, k = o.ex ?? 1, f = o.face ?? 0, kind = o.kind || "man";
  const skin = shade("#6d4c38", k * 1.15);
  const bob = o.phase != null ? Math.abs(Math.sin(o.phase)) * .014 * h : 0;
  const sway = o.phase != null ? Math.sin(o.phase) * .03 * h : 0;
  const lean = (o.lean || 0) * .07 * h * (f || 1);
  g.save();
  g.fillStyle = "rgba(0,0,0,.42)"; g.beginPath(); g.ellipse(x + (o.shadowX || 0), y + .008 * h, .17 * h + Math.abs(o.shadowX || 0) * .3, .022 * h, 0, 0, 6.283); g.fill();

  let hx, hy, hr = .062 * h * (o.big || 1);
  const cloth = kind === "doctor" ? shade("#d9dcd6", k) : kind === "woman" ? shade("#0f0f12", Math.max(k, .8)) : shade("#cbc1ab", k);

  if (o.pose === "sit") {
    const seat = y - .28 * h, top = seat - .43 * h, d = f || 1;
    if (!o.noSeat) {
      g.fillStyle = "#1a130d"; g.fillRect(x - .17 * h, seat + .01 * h, .34 * h, .028 * h);
      g.fillRect(x - .15 * h, seat + .03 * h, .02 * h, y - seat - .03 * h); g.fillRect(x + .13 * h, seat + .03 * h, .02 * h, y - seat - .03 * h);
    }
    poly(g, [[x - .12 * h + lean * .4, top], [x + .12 * h + lean * .4, top], [x + .13 * h, seat], [x - .13 * h, seat]], cloth);
    const tx = d > 0 ? x - .1 * h : x + .1 * h - .34 * h;
    rrect(g, tx, seat - .085 * h, .34 * h, .11 * h, .05 * h, cloth);
    const kx = d > 0 ? x + .22 * h : x - .22 * h;
    rrect(g, kx - .05 * h, seat - .04 * h, .1 * h, y - seat + .04 * h, .04 * h, cloth);
    hx = x + lean + d * .01 * h; hy = top - .07 * h;
  } else if (kind === "woman") {
    poly(g, [[x - .11 * h + lean, y - .8 * h], [x + .11 * h + lean, y - .8 * h], [x + .21 * h + sway, y], [x - .21 * h + sway, y]], cloth);
    hx = x + lean; hy = y - .88 * h - bob;
  } else {
    poly(g, [[x - .115 * h + lean, y - .8 * h - bob], [x + .115 * h + lean, y - .8 * h - bob], [x + .16 * h + sway, y], [x - .16 * h - sway, y]], cloth);
    hx = x + lean + f * .012 * h; hy = y - .875 * h - bob;
  }
  if (o.bisht) {
    const top = o.pose === "sit" ? y - .28 * h - .43 * h : y - .8 * h - bob;
    poly(g, [[hx - .13 * h, top + .01 * h], [hx + .13 * h, top + .01 * h], [hx + .15 * h, top + .3 * h], [hx - .15 * h, top + .3 * h]], shade("#22160e", Math.max(k, .8)));
    g.strokeStyle = shade("#b08a3a", Math.max(k, .7)); g.lineWidth = 2; g.beginPath(); g.moveTo(hx - .13 * h, top + .012 * h); g.lineTo(hx + .13 * h, top + .012 * h); g.stroke();
  }
  if (o.armTo) {
    const [ax, ay] = o.armTo, sx = o.pose === "sit" ? hx + (f || 1) * .05 * h : x + f * .06 * h, sy = (o.pose === "sit" ? hy + .09 * h : y - .74 * h - bob);
    g.strokeStyle = cloth; g.lineCap = "round"; g.lineWidth = .055 * h;
    g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo((sx + ax) / 2, Math.max(sy, ay) + .05 * h, ax, ay); g.stroke();
  }
  // head
  if (kind === "woman") {
    g.fillStyle = shade("#0d0d10", Math.max(k, .8)); g.beginPath(); g.arc(hx, hy, hr * 1.25, 0, 6.283); g.fill();
    poly(g, [[hx - hr * 1.2, hy], [hx + hr * 1.2, hy], [hx + hr * 1.9, hy + hr * 3.4], [hx - hr * 1.9, hy + hr * 3.4]], shade("#0d0d10", Math.max(k, .8)));
  } else {
    g.fillStyle = skin; g.beginPath(); g.arc(hx, hy, hr, 0, 6.283); g.fill();
    if (o.beard) { g.fillStyle = shade(o.beard, Math.max(k, .55)); g.beginPath(); g.ellipse(hx + f * .008 * h, hy + hr * .3, hr * .97, hr * .78, 0, .05, Math.PI - .05); g.fill(); }
    if (o.bare) {
      g.fillStyle = shade(o.hair || "#c8c4bc", Math.max(k, .5)); g.beginPath(); g.arc(hx, hy - hr * .1, hr * 1.02, Math.PI * 1.02, Math.PI * 1.98); g.fill();
    } else if (kind !== "doctor") {
      const w = shade(o.cap || "#d8d0bc", Math.max(k, .5));
      g.fillStyle = w; g.beginPath(); g.arc(hx, hy - hr * .1, hr * 1.2, Math.PI, 0); g.fill();
      poly(g, [[hx - hr * 1.2, hy - hr * .1], [hx - hr * 1.55, hy + hr * 1.9], [hx - hr * .7, hy + hr * 1.2]], w);
      poly(g, [[hx + hr * 1.2, hy - hr * .1], [hx + hr * 1.55, hy + hr * 1.9], [hx + hr * .7, hy + hr * 1.2]], w);
      if (!o.boy) { g.strokeStyle = shade("#141210", Math.max(k, .8)); g.lineWidth = Math.max(2, hr * .16); g.beginPath(); g.arc(hx, hy - hr * .12, hr * 1.06, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    }
  }
  g.restore();
  return { hx, hy };
}

function room(g, wall, floor, floorY = 560) {
  vgrad(g, 0, 0, W, floorY, wall);
  vgrad(g, 0, floorY, W, H - floorY, floor);
  g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, floorY - 4, W, 6);
}
function hand(g, x, y, k, rim) {
  g.fillStyle = shade("#6d4c38", k * 1.25); g.beginPath(); g.ellipse(x, y, 22, 12, -.2, 0, 6.283); g.fill();
  if (rim) glow(g, x, y, 90, "255,196,110", rim);
}
