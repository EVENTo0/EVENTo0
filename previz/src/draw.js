function cam(g, cx, cy, z) { g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-cx, -cy); }

/* ---- Bedside (S01 dawn, S08 night, S09 dawn + squeeze) ---- */
function bedside(g, p, t, o) {
  const night = o.night, ex = night ? .62 : .5 + p * .25;
  const f = o.face;
  cam(g, ...o.cam(p));
  room(g, night ? [[0, "#080a12"], [1, "#101726"]] : [[0, "#0c1320"], [1, "#1a2436"]], [[0, "#0a0806"], [1, "#050403"]]);
  if (!night) {
    // curtains with a slit of dawn light that strengthens and drifts
    const gap = 340 + p * 22;
    for (let i = 0; i < 6; i++) rrect(g, 120 + i * 40, 0, 34, 560, 6, i % 2 ? "#131824" : "#181e2c");
    for (let i = 0; i < 6; i++) rrect(g, gap + 14 + i * 40, 0, 34, 560, 6, i % 2 ? "#131824" : "#181e2c");
    g.save(); g.globalCompositeOperation = "lighter";
    const a = (o.dawnA ?? .16) + p * .22;
    const gr = g.createLinearGradient(gap, 0, 980, 560); gr.addColorStop(0, `rgba(255,200,120,${a * 1.6})`); gr.addColorStop(1, `rgba(255,170,90,0)`);
    g.fillStyle = gr; poly(g, [[gap, 0], [gap + 14, 0], [1120, 560], [820, 560]]); g.fill(); g.restore();
    dust(g, t, [gap, 0, 1100, 560], "255,205,140", .5);
  } else {
    rrect(g, 1300, 90, 90, 170, 10, "#0d1320"); glow(g, 1345, 175, 220, "70,100,170", .18);
    glow(g, 1210, 300, 460, "255,170,80", .34);
    rrect(g, 1190, 300, 36, 60, 6, "#2a1c10"); glow(g, 1208, 296, 90, "255,190,100", .6);
  }
  // bed
  rrect(g, 950, 420, 700, 150, 12, "#1c1712"); rrect(g, 940, 330, 40, 250, 8, "#2a2018");
  rrect(g, 990, 428, 640, 96, 22, night ? "#242c3e" : "#2a3246");
  rrect(g, 1040, 404, 150, 54, 26, shade("#b8b2a6", ex));
  rrect(g, 1180, 436, 440, 82, 34, night ? "#2f3850" : "#3a4258");
  // Hamad: frail, on the pillow (eyes-open glint for S09)
  const hh = { x: 1118, y: 420 };
  g.fillStyle = shade("#6d4c38", ex * 1.15); g.beginPath(); g.arc(hh.x, hh.y, 46, 0, 6.283); g.fill();
  g.fillStyle = shade("#cfcac0", ex); g.beginPath(); g.arc(hh.x, hh.y - 6, 47, Math.PI * 1.05, Math.PI * 1.95); g.fill();
  g.fillStyle = shade("#d8d4ca", ex); g.beginPath(); g.ellipse(hh.x + 4, hh.y + 30, 32, 22, 0, 0, Math.PI); g.fill();
  if (o.eyes) {
    const e = sm(p, .38, .5) * (1 - sm(p, .78, .9));
    g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(255,236,190,${e * .9})`;
    g.beginPath(); g.ellipse(hh.x - 14, hh.y - 4, 7, 3, 0, 0, 6.283); g.ellipse(hh.x + 14, hh.y - 4, 7, 3, 0, 0, 6.283); g.fill(); g.restore();
  }
  // Youssef on chair
  rrect(g, 700, 440, 120, 16, 4, "#1d1610"); g.fillStyle = "#1d1610"; g.fillRect(704, 456, 12, 106); g.fillRect(804, 456, 12, 106); g.fillRect(696, 330, 14, 126);
  const hx = 962 + (o.squeeze ? Math.sin(seg(p, .3, .5) * 3.14) * 3 : 0), hy = 494;
  person(g, { x: 770, y: 562, h: 460, pose: "sit", noSeat: true, face: 1, lean: .8 + Math.sin(t * .6) * .03, beard: "#a9a59c", ex, armTo: [hx - 20, hy] });
  // hands
  const press = o.squeeze ? Math.sin(seg(p, .3, .62) * 3.14) : 0;
  g.save(); g.strokeStyle = shade("#6d4c38", ex * 1.1); g.lineCap = "round"; g.lineWidth = 15;
  g.beginPath(); g.moveTo(1098, 484); g.quadraticCurveTo(1030, 500, hx + 12, hy + 2); g.stroke(); g.restore();
  hand(g, hx - 10, hy, ex, .12 + p * .12 + press * .5); hand(g, hx + 16, hy + 3, ex, .12 + p * .12 + press * .5);
  if (o.squeeze) glow(g, hx, hy, 260 * (.4 + p), "255,206,130", .12 + sm(p, .6, 1) * .34);
  if (night) dust(g, t, [900, 200, 1500, 520], "255,200,140", .35);
}

/* ---- S02 desert 1973 ---- */
function desert1973(g, p, t) {
  cam(g, W / 2, H / 2, 1);
  vgrad(g, 0, 0, W, 470, [[0, "#7a6a58"], [.55, "#e2b877"], [1, "#f7dca6"]]);
  glow(g, 1180, 400, 520, "255,214,140", .7); g.fillStyle = "#fff1cf"; g.beginPath(); g.arc(1180, 402, 34, 0, 6.283); g.fill();
  const dunes = [[.15, "#c69a63", 360, 60, 900], [.35, "#9a6c3c", 420, 80, 620], [.75, "#4a301c", 500, 90, 380]];
  for (const [sp, col, base, amp, len] of dunes) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) g.lineTo(x, base + Math.sin((x + p * len * sp * 2) / len * 6.283 * .9) * amp * .5 + Math.sin((x + p * len * sp * 2) / (len * .37)) * amp * .12);
    g.lineTo(W, H); g.closePath(); g.fill();
  }
  vgrad(g, 0, 430, W, 120, [[0, "rgba(255,225,170,0)"], [1, "rgba(255,225,170,.28)"]]);
  vgrad(g, 0, 560, W, 160, [[0, "#2c1c10"], [1, "#150d07"]]);
  // long shadows toward camera-left, footprints behind the boy
  for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(0,0,0,${.32 - i * .03})`; g.beginPath(); g.ellipse(540 - i * 44 + p * 380 % 44, 626 + (i % 2) * 6, 9, 3.5, 0, 0, 6.283); g.fill(); }
  const ph = t * 5.2;
  person(g, { x: 1010, y: 610, h: 470, face: 1, phase: ph, ex: .55, bisht: false, beard: "#1a1512", shadowX: -220 });
  person(g, { x: 790, y: 616, h: 290, face: 1, phase: ph * 2, ex: .55, boy: true, hr: 1, big: 1.1, lean: .3, shadowX: -140 });
  dust(g, t * 2, [0, 300, W, 620], "255,225,170", .3);
}

/* ---- S03 majlis 1993 ---- */
function majlis(g, p, t) {
  cam(g, lerp(800, 860, p), lerp(360, 380, p), lerp(1, 1.16, sm(p, 0, 1)));
  room(g, [[0, "#170d08"], [1, "#2b1a10"]], [[0, "#3a1a14"], [1, "#1c0c09"]], 580);
  for (let i = 0; i < 24; i++) { g.fillStyle = i % 2 ? "rgba(120,50,30,.16)" : "rgba(30,10,8,.2)"; g.fillRect(i * 74, 580, 37, 140); }
  for (let i = 0; i < 6; i++) rrect(g, 60 + i * 270, 470, 220, 110, 20, "#4a2114");
  glow(g, 840, 90, 700, "255,160,70", .38); glow(g, 840, 90, 120, "255,210,150", .5);
  rrect(g, 860, 590, 40, 46, 8, "#1a120c"); poly(g, [[880, 592], [900, 560], [880, 566]], "#1a120c"); // dallah
  const k = .58 + Math.sin(t * 8) * .01;
  const lift = sm(p, .28, .42) - sm(p, .5, .66);
  person(g, { x: 1020, y: 590, h: 430, pose: "sit", face: -1, ex: k, bisht: true, beard: "#8a867e", lean: -.1, armTo: [905 - lift * 0, 470 - sm(p, .12, .2) * 70 * (1 - sm(p, .3, .5))] });
  person(g, { x: 560, y: 590, h: 500, face: 1, ex: k, beard: "#141210", lean: -.4 * sm(p, .5, .8) });
  if (lift > 0.02) { g.strokeStyle = shade("#cbc1ab", k); g.lineCap = "round"; g.lineWidth = 26; g.beginPath(); g.moveTo(580, 300); g.lineTo(640 + lift * 30, 350 - lift * 90); g.stroke(); }
  dust(g, t, [200, 100, 1500, 560], "255,190,120", .25);
}

/* ---- S04 kitchen 1993 ---- */
function kitchen(g, p, t) {
  cam(g, lerp(900, 800, p), 360, 1.04);
  room(g, [[0, "#1a120c"], [1, "#2a1d12"]], [[0, "#241710"], [1, "#100a06"]]);
  glow(g, 780, 60, 620, "255,170,80", .36);
  rrect(g, 320, 240, 360, 170, 8, "#0e1420"); glow(g, 500, 320, 200, "60,90,150", .18);      // night window over sink
  rrect(g, 280, 440, 700, 120, 6, "#2a2018"); rrect(g, 470, 424, 120, 22, 4, "#5c5c60");     // counter + sink
  for (let i = 0; i < 4; i++) rrect(g, 640 + i * 70, 470 - (i % 2) * 8, 54, 34, 6, "#3a2c20");
  // water glint
  g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(200,225,255,.35)"; g.lineWidth = 3; g.beginPath(); g.moveTo(510, 420); g.lineTo(510, 448); g.stroke(); g.restore();
  // door with hall light
  rrect(g, 1300, 130, 190, 430, 4, "#0b0806"); vgrad(g, 1310, 140, 170, 420, [[0, "rgba(255,200,130,.5)"], [1, "rgba(255,170,90,.15)"]]);
  const dx = lerp(1420, 1150, sm(p, .2, .55));
  if (p > .2) person(g, { x: dx, y: 566, h: 470, face: -1, ex: .6, beard: "#161412", phase: p < .55 ? t * 4 : null, lean: .1 });
  const arm = Math.sin(t * 3) * 14;
  person(g, { x: 520, y: 566, h: 470, kind: "woman", ex: 1, lean: sm(p, .55, .9) * -.4, armTo: [500 + arm, 470] });
  dust(g, t, [300, 80, 1100, 500], "255,190,120", .22);
}

/* ---- S05 night room: 5 minutes of silence ---- */
function nightRoom(g, p, t) {
  cam(g, 900, 380, lerp(1, 1.06, p));
  room(g, [[0, "#050403"], [1, "#0b0806"]], [[0, "#080503"], [1, "#030202"]]);
  glow(g, 1010, 330, 300, "255,170,80", .34); rrect(g, 990, 330, 30, 46, 6, "#231609"); glow(g, 1005, 326, 60, "255,200,120", .55);
  rrect(g, 620, 450, 110, 14, 4, "#1a120c"); g.fillStyle = "#1a120c"; g.fillRect(624, 464, 10, 100); g.fillRect(716, 464, 10, 100);
  person(g, { x: 1150, y: 564, h: 400, pose: "sit", face: -1, ex: .42, beard: "#8a867e", lean: .25 });
  const enter = sm(p, .1, .42);
  if (p < .48) person(g, { x: lerp(380, 640, enter), y: 564, h: 470, face: 1, phase: enter < 1 ? t * 4 : null, ex: .38, beard: "#161412" });
  else person(g, { x: 668, y: 564, h: 470, pose: "sit", face: 1, ex: .38, beard: "#161412", lean: .5 });
  dust(g, t, [500, 150, 1400, 560], "255,190,120", .18);
}

/* ---- S06 clinic 2010 ---- */
function clinic(g, p, t) {
  cam(g, lerp(840, 520, sm(p, .55, 1)), 380, lerp(1, 1.22, sm(p, .55, 1)));
  room(g, [[0, "#1a2a28"], [1, "#22322f"]], [[0, "#1a1f1c"], [1, "#0c0f0d"]]);
  rrect(g, 1240, 110, 300, 300, 4, "#cfe3e8"); glow(g, 1390, 260, 520, "190,220,235", .38);
  for (let i = 0; i < 4; i++) g.fillStyle = "rgba(20,30,30,.5)", g.fillRect(1240 + i * 75, 110, 3, 300);
  rrect(g, 640, 420, 560, 34, 4, "#2c322c"); g.fillStyle = "#1d221d"; g.fillRect(660, 454, 20, 110); g.fillRect(1160, 454, 20, 110);
  g.fillStyle = "#dfe6e2"; g.fillRect(930, 400, 60, 20);
  const turn = sm(p, .18, .34) - sm(p, .7, .82);
  const dr = person(g, { x: 1000 - turn * 0, y: 590, h: 470, kind: "doctor", ex: .95, bare: true, hair: "#2a2622", lean: 0 });
  g.fillStyle = "#3a2c22"; g.beginPath(); g.arc(dr.hx - turn * 14, dr.hy - 4, 5, 0, 6.283); g.fill();
  person(g, { x: 660, y: 590, h: 420, pose: "sit", face: 1, ex: .8, beard: "#1a1714", lean: .1 });
  person(g, { x: 440, y: 590, h: 380, pose: "sit", face: 1, ex: .78, beard: "#a09c94", lean: .15 + sm(p, .5, .75) * .7 });
  dust(g, t, [1000, 100, 1500, 500], "210,235,245", .3);
}

/* ---- S07 car ---- */
function car(g, p, t) {
  cam(g, 840, 360, 1);
  vgrad(g, 0, 0, W, 300, [[0, "#8aa4b0"], [1, "#c9d6d8"]]);
  vgrad(g, 0, 300, W, 200, [[0, "#3a3f42"], [1, "#25282a"]]);
  g.fillStyle = "#101315"; poly(g, [[840, 300], [780, 500], [900, 500]], "#1a1d1f");
  for (let i = 0; i < 12; i++) { const z = ((i / 12 + t * .35) % 1), y = 300 + z * z * 200, w = 2 + z * z * 16, hh = 4 + z * z * 40; g.fillStyle = "#d9d5c6"; g.fillRect(840 - w / 2, y, w, hh); }
  for (let i = 0; i < 14; i++) { const z = ((i / 14 + t * .5) % 1); g.fillStyle = "rgba(40,50,40,.8)"; const x = 300 - z * 300, y = 300 - z * 90; g.fillRect(x, y, 6 + z * 24, 40 + z * 120); g.fillRect(W - x, y, 6 + z * 24, 40 + z * 120); }
  poly(g, [[0, 0], [190, 0], [70, 520], [0, 520]], "#08090a"); poly(g, [[W, 0], [W - 190, 0], [W - 70, 520], [W, 520]], "#08090a");
  rrect(g, 0, 0, W, 34, 0, "#08090a");
  const sway = Math.sin(t * 2) * 2;
  g.save(); g.translate(sway, 0);
  person(g, { x: 400, y: 720, h: 640, pose: "sit", noSeat: true, face: 1, ex: .5, beard: "#14120f", lean: .4, armTo: [470, 566] });
  const turnH = sm(p, .55, .78);
  person(g, { x: 1190, y: 720, h: 620, pose: "sit", noSeat: true, face: turnH > .5 ? -1 : 0, ex: .5, beard: "#a09c94", lean: -turnH * .9, bisht: false });
  g.restore();
  vgrad(g, 0, 500, W, 220, [[0, "#0d0f10"], [1, "#050505"]]);
  g.strokeStyle = "#16191b"; g.lineWidth = 16; g.beginPath(); g.arc(520, 640, 130, 0, 6.283); g.stroke();
  glow(g, 840, 200, 900, "210,225,230", .1);
}

/* ---- S10 lone desert: camera in front of Youssef ---- */
function desertLone(g, p, t) {
  cam(g, W / 2, H / 2, 1);
  const sun = lerp(500, 350, p);
  vgrad(g, 0, 0, W, 500, [[0, "#3a3050"], [.55, `rgb(${Math.round(lerp(150, 235, p))},${Math.round(lerp(100, 175, p))},${Math.round(lerp(110, 120, p))})`], [1, "#f5d59a"]]);
  glow(g, 840, sun, 700, "255,200,120", .25 + p * .5); g.fillStyle = "#fff0cc"; g.beginPath(); g.arc(840, sun, 36, 0, 6.283); g.fill();
  const dunes = [[.05, "#7a5a4a", 380, 50, 1100], [.12, "#8a5f3a", 440, 70, 760], [.2, "#3d2818", 520, 60, 480]];
  for (const [sp, col, base, amp, len] of dunes) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) g.lineTo(x, base + Math.sin((x + p * 60 * sp) / len * 6.283) * amp * .5);
    g.lineTo(W, H); g.closePath(); g.fill();
  }
  vgrad(g, 0, 600, W, 120, [[0, "#2a1a10"], [1, "#100904"]]);
  const walk1 = sm(p, 0, .5), pause = seg(p, .5, .74), walk2 = sm(p, .74, 1);
  const h = lerp(150, 430, walk1) + walk2 * 240, x = 840 + walk2 * 470, y = lerp(468, 640, walk1) + walk2 * 60;
  const walking = p < .5 || p > .74;
  const shake = pause > 0 && pause < 1 ? Math.sin(t * 22) * 1.8 * Math.sin(pause * 3.14) : 0;
  person(g, { x: x + shake, y, h, face: 0, phase: walking ? t * 4.4 : null, ex: .55 + p * .3, beard: "#b3afa6", lean: pause > 0 && pause < 1 ? Math.sin(pause * 3.14) * .5 : 0, shadowX: -h * .5 });
  if (pause > .1 && pause < .95) { g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = "rgba(180,210,255,.5)"; const ty = y - h * .74 + ((t * 60) % 80); g.beginPath(); g.ellipse(x - 11, ty, 2.5, 4, 0, 0, 6.283); g.fill(); g.restore(); }
  dust(g, t * 2, [0, 300, W, 640], "255,220,160", .25);
}

