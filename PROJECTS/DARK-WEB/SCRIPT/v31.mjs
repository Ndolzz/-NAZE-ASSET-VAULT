import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';

const V = path.join(os.homedir(), 'NAZE-ASSET-VAULT'), P = process.cwd();
const W = 720, H = 1280, FPS = 30, DUR = 40, TE4 = 30.85;
const PREVIEW = +process.env.PREVIEW || 0, DRY = process.argv.includes('dry');
const SCN = +process.env.SCENE || 0;
const WIN = [[0, 5.25], [5.25, 12.9], [12.9, 22.4], [22.4, 31.33], [31.33, 40]];
const CY = '&HFFF000&', RED = '&HFF4A1A&'; // RED = biru elektrik
const ICONS = [5, 18, 33]; // ganti nomor ikon glitch-icon-NN di sini
const pad = n => String(n).padStart(2, '0');
const ts = s => { const c = Math.max(0, Math.round(s * 100)); return `${Math.floor(c / 360000)}:${pad(Math.floor(c / 6000) % 60)}:${pad(Math.floor(c / 100) % 60)}.${pad(c % 100)}`; };
const rnd = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const hex2 = n => Math.round(clamp(n, 0, 255)).toString(16).toUpperCase().padStart(2, '0');
const al = o => `\\alpha&H${hex2((1 - clamp(o)) * 255)}&`;
const walk = (d, re, o = []) => { try { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p, re, o) : re.test(e.name) && o.push(p); } } catch {} return o; };
const EZ = {
  lin: t => t, in: t => t * t * t, out: t => 1 - Math.pow(1 - t, 3),
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  expo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  back: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  elastic: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * 2.0943951) + 1,
};

// ---------- FONT ----------
const STY = { s1: 'exo2', s2: 'audiowide', s3: 'manrope', s4: 'michroma', s5: 'audiowide', mono: 'sharetechmono' };
const FW = { s1: .60, s2: .82, s3: .66, s4: .95, s5: .82, mono: .64 }; // lebar rata-rata huruf (em)
const fdir = `${P}/SCRIPT/fonts`; fs.mkdirSync(fdir, { recursive: true });
const allFonts = walk(`${V}/FONTS`, /\.(ttf|otf)$/i);
function nameOf(file) {
  try {
    const b = fs.readFileSync(file), off = b.toString('latin1', 0, 4) === 'ttcf' ? b.readUInt32BE(12) : 0, n = b.readUInt16BE(off + 4);
    for (let i = 0; i < n; i++) {
      const r = off + 12 + i * 16; if (b.toString('latin1', r, r + 4) !== 'name') continue;
      const o = b.readUInt32BE(r + 8), cnt = b.readUInt16BE(o + 2), so = o + b.readUInt16BE(o + 4), got = {};
      for (let k = 0; k < cnt; k++) {
        const q = o + 6 + k * 12, pid = b.readUInt16BE(q), id = b.readUInt16BE(q + 6); if (id !== 1 && id !== 2) continue;
        const len = b.readUInt16BE(q + 8), st = so + b.readUInt16BE(q + 10), raw = Buffer.from(b.subarray(st, st + len));
        const s = (pid === 3 || pid === 0) ? raw.swap16().toString('utf16le') : raw.toString('latin1'); if (!got[id]) got[id] = s;
      }
      return [got[1], got[2] || ''];
    }
  } catch {} return ['Sans', ''];
}
const rank = f => /black|heavy/i.test(f) ? 5 : /extrabold/i.test(f) ? 4 : /bold/i.test(f) ? 3 : /semibold|medium/i.test(f) ? 2 : 1;
const F = {};
for (const [k, key] of Object.entries(STY)) {
  const c = allFonts.filter(f => f.toLowerCase().includes(key)).sort((a, b) => rank(b) - rank(a));
  if (!c.length) throw new Error('Font tidak ditemukan: ' + key);
  fs.copyFileSync(c[0], `${fdir}/${path.basename(c[0])}`);
  const [fam, sub] = nameOf(c[0]); F[k] = { fam, bold: /bold|black|heavy/i.test(sub) ? -1 : 0 };
  console.log(`Font ${k}: ${fam} / ${sub} <- ${path.basename(c[0])}`);
}
const fit = (s, st, cap) => Math.round(Math.min(cap, (W - 100) / (s.length * FW[st])));
const gsize = (st, lines, cap) => Math.min(...lines.map(l => fit(l, st, cap)));

// ---------- ASS dasar ----------
const ev = [];
const D = (layer, s, e, st, text) => { if (e - s < 0.011) return; ev.push(`Dialogue: ${layer},${ts(s)},${ts(e)},${st},,0,0,0,,${text}`); };
const pth = pts => 'm ' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' l ');
const rectP = (w, h) => pth([[0, 0], [w, 0], [w, h], [0, h]]);
const ngon = (r, n = 40) => pth(Array.from({ length: n }, (_, i) => [r + r * Math.cos(i / n * 2 * Math.PI), r + r * Math.sin(i / n * 2 * Math.PI)]));
const SH = (layer, s, e, an, x, y, pa, tags = '') => D(layer, s, e, 'Shp', `{\\an${an}\\pos(${x},${y})\\p1${tags}}${pa}`);

// keyframe per-frame: keys [{t,x,y,fs,fsp,frz,o,blur,e}]
function lineKF(layer, st, str, keys) {
  const PR = ['x', 'y', 'fs', 'fsp', 'frz', 'o', 'blur'];
  const tg = k => `\\an5\\pos(${k.x.toFixed(1)},${k.y.toFixed(1)})\\fs${Math.round(k.fs)}\\fsp${k.fsp.toFixed(1)}\\frz${k.frz.toFixed(2)}${al(k.o)}\\blur${k.blur.toFixed(1)}`;
  const ks = keys.map(k => ({ x: 360, fsp: 2, frz: 0, o: 1, blur: 0, ...k }));
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i], b = ks[i + 1]; if (b.t - a.t < 0.012) continue;
    if (PR.every(p => Math.abs(a[p] - b[p]) < 1e-6)) { D(layer, a.t, b.t, st, `{${tg(a)}}${str}`); continue; }
    const n = Math.max(1, Math.round((b.t - a.t) * FPS));
    for (let f = 0; f < n; f++) {
      const p = EZ[b.e || 'expo']((f + 1) / n), k = {};
      for (const pr of PR) k[pr] = a[pr] + (b[pr] - a[pr]) * p;
      D(layer, a.t + f / FPS, Math.min(a.t + (f + 1) / FPS, b.t), st, `{${tg(k)}}${str}`);
    }
  }
}
function text(st, str, t0, t1, y, o = {}) {
  const sz = o.size || fit(str, st, o.cap || 110), b = { x: 360, y, fs: sz };
  const intro = {
    track: [{ t: t0, ...b, fs: sz * 3, fsp: 60, o: 0 }, { t: t0 + 0.7, ...b, o: 1, e: 'expo' }],
    wide: [{ t: t0, ...b, fsp: 45, o: 0 }, { t: t0 + 0.9, ...b, o: 1, e: 'expo' }],
    rot: [{ t: t0, ...b, x: 200, frz: -12, o: 0 }, { t: t0 + 0.6, ...b, o: 1, e: 'back' }],
    drop: [{ t: t0, ...b, y: y - 220, o: 0 }, { t: t0 + 0.8, ...b, o: 1, e: 'elastic' }],
    rise: [{ t: t0, ...b, y: y + 70, blur: 12, o: 0 }, { t: t0 + 0.5, ...b, o: 1, e: 'expo' }],
  }[o.fx || 'rise'];
  const A = [...intro]; let cur = A.at(-1);
  for (const k of (typeof o.then === 'function' ? o.then(o.i || 0) : o.then || [])) { cur = { ...cur, t: k.t, e: k.e || cur.e, y: y + (k.dy || 0), fs: sz * (k.sc || 1) }; A.push(cur); }
  A.push({ ...cur, t: t1 - 0.3, e: 'lin' }, { ...cur, t: t1, o: 0, e: 'in' });
  lineKF(5, st, str, A);
}
function charFx(st, str, t0, t1, y, o = {}) {
  const sz = o.size || fit(str, st, o.cap || 110); let s = '', j = 0;
  for (const ch of str) {
    if (ch === ' ') { s += ' '; continue; }
    const d = j++ * 40;
    s += `{\\alpha&HFF&\\fscy0\\blur8\\t(${d},${d + 120},0.5,\\alpha&H00&\\fscy125\\blur0)\\t(${d + 120},${d + 300},\\fscy100)}${ch}`;
  }
  D(5, t0, t1, st, `{\\an5\\pos(360,${y})\\fs${sz}\\fad(0,300)}${s}`);
}
function maskFx(st, str, t0, t1, y, o = {}) {
  const sz = o.size || fit(str, st, o.cap || 110), h = sz * 0.7;
  D(5, t0, t1, st, `{\\an5\\move(360,${y + 45},360,${y},0,550)\\fs${sz}\\fad(0,300)\\clip(0,${Math.round(y + h * 0.6)},${W},${Math.round(y + h * 0.6)})\\t(0,550,0.5,\\clip(0,${Math.round(y - h)},${W},${Math.round(y + h)}))}${str}`);
}
function splitFx(st, str, t0, t1, y, o = {}) {
  const sz = o.size || fit(str, st, o.cap || 110), h = sz * 0.75;
  for (const [dir, c1, c2] of [[-1, y - h, y], [1, y, y + h]])
    D(5, t0, t1, st, `{\\an5\\move(360,${y + dir * 90},360,${y},0,500)\\fs${sz}\\fad(0,300)\\clip(0,${Math.round(c1)},${W},${Math.round(c2)})}${str}`);
}
function glitchBurst(st, str, y, size, t0, n = 10) {
  for (let f = 0; f < n; f++) for (const [col, sg, q] of [[RED, -1, 0], [CY, 1, 1]]) {
    const dx = Math.round(sg * (5 + rnd(f * 17 + q + y) * 16)), band = Math.round(y - 50 + rnd(f * 13 + y + q) * 70), bh = 14 + Math.round(rnd(f * 5 + q + y) * 60);
    D(6, t0 + f / FPS, t0 + (f + 1) / FPS, st, `{\\an5\\pos(${360 + dx},${y})\\fs${size}\\clip(0,${band},${W},${band + bh})\\1c${col}\\bord0\\alpha&H30&}${str}`);
  }
}
function glitchFx(st, str, t0, t1, y, o = {}) {
  const sz = o.size || fit(str, st, o.cap || 100);
  for (let f = 0; f < 14; f++) {
    if (rnd(f * 7 + y) < 0.3) continue;
    D(5, t0 + f / FPS, t0 + (f + 1) / FPS, st, `{\\an5\\pos(${360 + Math.round((rnd(f * 3 + y) - 0.5) * 50)},${y})\\fs${sz}\\alpha&H20&}${str}`);
  }
  glitchBurst(st, str, y, sz, t0, 14);
  D(5, t0 + 14 / FPS, t1, st, `{\\an5\\pos(360,${y})\\fs${sz}\\fad(0,300)}${str}`);
}
function typeFx(str, t0, t1, x, y, o = {}) {
  let s = ''; [...str].forEach((ch, j) => { const d = j * 55; s += `{\\alpha&HFF&\\t(${d},${d + 1},\\alpha&H00&)}${ch}`; });
  D(5, t0, t1, 'mono', `{\\an${o.an || 4}\\pos(${x},${y})\\fs${o.size || 26}\\1c${CY}\\bord0\\fad(0,250)}${s}`);
}
function grp(fn, st, lines, t0, t1, y0, gap, o = {}) {
  const size = o.size || gsize(st, lines, o.cap || 110);
  lines.forEach((l, i) => fn(st, l, t0 + i * (o.dt || 0.4), t1, y0 + i * gap, { ...o, size, i }));
  return size;
}

// ---------- grafis ----------
const accent = (t0, t1, y, w = 560) => SH(3, t0, t1, 8, 360, y, rectP(w, 4), `\\1c${CY}\\fscx1\\t(0,700,0.4,\\fscx100)\\fad(0,250)`);
const strike = (t0, t1, y, w) => SH(7, t0, t1, 4, 360 - w / 2, y, rectP(w, 8), `\\1c${RED}\\fscx1\\t(0,350,0.5,\\fscx100)\\fad(0,250)`);
const shock = (t, cx = 360, cy = 640, big = 1000) => SH(3, t, t + 0.7, 5, cx, cy, ngon(60), `\\1a&HFF&\\bord3\\3c${CY}\\t(0,700,0.35,\\fscx${big}\\fscy${big}\\bord1\\3a&HFF&)`);
const flash = (t, a = 0x70) => SH(9, t, t + 0.14, 7, 0, 0, rectP(W, H), `\\1c&HFFFFFF&\\1a&H${hex2(a)}&\\t(0,140,\\1a&HFF&)`);
function glitchCut(t, n = 8, heavy = 1) {
  for (let f = 0; f < n; f++) for (let k = 0; k < 3 * heavy; k++) {
    const y = Math.round(rnd(f * 11 + k * 5 + t) * H), h = 8 + Math.round(rnd(f * 3 + k + t) * 60), dx = Math.round(rnd(f + k * 9 + t) * 120);
    SH(8, t + f / FPS, t + (f + 1) / FPS, 7, dx, y, rectP(W - dx, h), `\\1c${k % 2 ? CY : RED}\\1a&H50&`);
  }
}
const wipe = (t, d = 0.45) => D(8, t, t + d, 'Shp', `{\\an7\\p1\\1c${CY}\\1a&H30&\\move(-70,0,${W + 70},0,0,${Math.round(d * 1000)})}${rectP(70, H)}`);
function grid(t0, t1, x0, y0, w, h, nx, ny) {
  for (let i = 0; i <= ny; i++) SH(1, t0 + i * 0.05, t1, 4, x0, y0 + i * h / ny, rectP(w, 1), `\\1c${CY}\\1a&HD8&\\fscx1\\t(0,900,0.4,\\fscx100)\\fad(0,300)`);
  for (let j = 0; j <= nx; j++) SH(1, t0 + j * 0.05, t1, 7, x0 + j * w / nx, y0, rectP(1, h), `\\1c${CY}\\1a&HD8&\\fscy1\\t(0,900,0.4,\\fscy100)\\fad(0,300)`);
}
function counter(t0, t1, x, y, label) {
  const n = Math.round((t1 - t0) * 10);
  for (let i = 0; i < n; i++) D(3, t0 + i / 10, t0 + (i + 1) / 10, 'mono', `{\\an4\\pos(${x},${y})\\fs30\\1c${CY}\\bord0}${label}${String(Math.round(100 * i / (n - 1))).padStart(3, '0')}%`);
}
function radar(t0, t1, cx, cy, r) {
  const d = (t1 - t0) * 1000;
  for (const k of [1, 0.66, 0.33]) SH(2, t0, t1, 5, cx, cy, ngon(r * k), `\\1a&HFF&\\bord2\\3c${CY}\\3a&H90&\\fad(300,300)`);
  SH(2, t0, t1, 5, cx, cy, rectP(2 * r, 1), `\\1c${CY}\\1a&HA0&\\fad(300,300)`);
  SH(2, t0, t1, 5, cx, cy, rectP(1, 2 * r), `\\1c${CY}\\1a&HA0&\\fad(300,300)`);
  const a = r * 0.16;
  D(2, t0, t1, 'Shp', `{\\an4\\pos(${cx},${cy})\\org(${cx},${cy})\\p1\\1c${CY}\\1a&H70&\\frz0\\t(0,${d},1,\\frz${Math.round(360 * (t1 - t0) / 2.2)})\\fad(300,300)}${pth([[0, a], [r, 0], [r, 2 * a]])}`);
  [[0.5, -0.3], [-0.4, 0.45], [0.2, 0.7]].forEach(([px, py], i) => SH(3, t0 + 0.8 + i * 0.5, t1, 5, cx + px * r, cy + py * r, rectP(8, 8), `\\1c${CY}\\fad(200,300)`));
}
function wave(t0, t1, cx, cy, w, n = 26) {
  for (let i = 0, t = t0; t < t1 - 0.05; i++, t += 0.1) {
    const polys = [[[0, 0], [1, 0], [1, 80], [0, 80]]];
    for (let b = 0; b < n; b++) {
      const h = 6 + rnd(i * 31 + b * 7) * 74 * (0.35 + 0.65 * Math.abs(Math.sin(t * 3 + b * 0.5))), x = 4 + b * ((w - 4) / n), bw = w / n * 0.55;
      polys.push([[x, 40 - h / 2], [x + bw, 40 - h / 2], [x + bw, 40 + h / 2], [x, 40 + h / 2]]);
    }
    D(2, t, t + 0.1, 'Shp', `{\\an5\\pos(${cx},${cy})\\p1\\1c${CY}\\1a&H40&${i === 0 ? '\\fad(200,0)' : ''}}${polys.map(pth).join(' ')}`);
  }
}
function network(t0, t1, pts, links) {
  const polys = [];
  for (const [a, b] of links) {
    const [x1, y1] = pts[a], [x2, y2] = pts[b], dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), nx = -dy / l * 1.2, ny = dx / l * 1.2;
    polys.push([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]);
  }
  for (const [x, y] of pts) polys.push([[x - 6, y - 6], [x + 6, y - 6], [x + 6, y + 6], [x - 6, y + 6]]);
  const all = polys.flat(), mx = Math.min(...all.map(p => p[0])), my = Math.min(...all.map(p => p[1]));
  const dd = polys.map(pl => pth(pl.map(([x, y]) => [x - mx, y - my]))).join(' ');
  D(2, t0, t1, 'Shp', `{\\an7\\pos(${mx.toFixed(1)},${my.toFixed(1)})\\p1\\1c${CY}\\1a&H30&\\clip(0,0,0,${H})\\t(0,900,1,\\clip(0,0,${W},${H}))\\fad(0,300)}${dd}`);
}
function chip(t0, t1, str, x, y) {
  SH(3, t0, t1, 7, x, y, rectP(180, 48), `\\1a&HFF&\\bord2\\3c${CY}\\fscx1\\t(0,350,0.4,\\fscx100)\\fad(0,250)`);
  typeFx(str, t0 + 0.15, t1, x + 16, y + 24, { size: 26 });
}
function frame(t0, t1, x, y, w, h, label) {
  SH(6, t0, t1, 7, x, y, rectP(w, h), `\\1a&HFF&\\bord2\\3c${CY}\\3a&H30&\\fscx1\\fscy1\\t(0,500,0.4,\\fscx100\\fscy100)\\fad(0,250)`);
  if (label) typeFx(label, t0 + 0.3, t1, x, y - 16, { size: 18, an: 1 });
}
function glyph(kind, cx, cy, s, t0, t1) {
  const d = Math.round((t1 - t0) * 1000), lw = Math.max(3, Math.round(s * 0.045));
  const circ = (r, n = 40) => Array.from({ length: n }, (_, i) => [s / 2 + r * Math.cos(i / n * 2 * Math.PI), s / 2 + r * Math.sin(i / n * 2 * Math.PI)]);
  const bx = polys => [[[0, 0], [1, 0], [1, 1], [0, 1]], [[s - 1, s - 1], [s, s - 1], [s, s], [s - 1, s]], ...polys].map(pth).join(' ');
  const ol = `\\1a&HFF&\\bord${lw}\\3c${CY}\\fscx1\\fscy1\\t(0,500,0.35,\\fscx100\\fscy100)\\fad(200,250)`;
  const fl = `\\1c${CY}\\fscx1\\fscy1\\t(0,500,0.35,\\fscx100\\fscy100)\\fad(200,250)`;
  const put = (layer, polys, tg) => SH(layer, t0 + 0.2, t1, 5, cx, cy, bx(polys), tg);
  if (kind === 'eye') {
    put(5, [circ(s * 0.5, 48).map(([x, y]) => [x, s / 2 + (y - s / 2) * 0.54])], ol);
    put(5, [circ(s * 0.16)], fl);
    put(6, [[[s * 0.14, s * 0.9], [s * 0.22, s * 0.92], [s * 0.9, s * 0.1], [s * 0.82, s * 0.08]]], fl);
  } else if (kind === 'tri') {
    put(5, [[[s / 2, s * 0.04], [s * 0.97, s * 0.9], [s * 0.03, s * 0.9]]], ol);
    put(5, [[[s / 2 - s * 0.04, s * 0.34], [s / 2 + s * 0.04, s * 0.34], [s / 2 + s * 0.03, s * 0.62], [s / 2 - s * 0.03, s * 0.62]], [[s / 2 - s * 0.04, s * 0.68], [s / 2 + s * 0.04, s * 0.68], [s / 2 + s * 0.04, s * 0.76], [s / 2 - s * 0.04, s * 0.76]]], fl);
  } else if (kind === 'node') {
    put(5, [circ(s * 0.5)], ol);
    network(t0 + 0.2, t1, [[cx - s * .3, cy - s * .25], [cx + s * .32, cy - s * .08], [cx - s * .04, cy + s * .3]], [[0, 1], [1, 2], [2, 0]]);
  } else if (kind === 'hex') {
    put(5, [circ(s * 0.48, 6)], ol); put(5, [circ(s * 0.12)], fl);
  } else if (kind === 'hexbig') {
    SH(2, t0, t1, 5, cx, cy, ngon(s / 2, 6), `\\1a&HFF&\\bord2\\3c${CY}\\3a&HB0&\\frz0\\t(0,${d},1,\\frz120)\\fad(400,400)`);
    SH(2, t0, t1, 5, cx, cy, ngon(s / 3, 6), `\\1a&HFF&\\bord2\\3c${CY}\\3a&HB0&\\frz60\\t(0,${d},1,\\frz-60)\\fad(400,400)`);
  } else if (kind === 'flare') {
    SH(8, t0, t1, 5, cx, cy, ngon(s * 0.2), `\\1c&HFFFFFF&\\blur45\\1a&H60&\\fscx40\\fscy40\\t(0,350,0.4,\\fscx140\\fscy140)\\t(350,${d},1,\\1a&HFF&)`);
    SH(8, t0, t1, 5, cx, cy, rectP(W, 5), `\\1c${CY}\\blur8\\1a&H40&\\fscx1\\t(0,250,0.4,\\fscx100)\\t(250,${d},1,\\1a&HFF&)`);
  }
}
function panel(o) {
  const { t0, t1, x, y, w, h } = o, n = 14;
  frame(t0 + 0.15, t1, x, y, w, h, o.label);
  grid(t0 + 0.3, t1, x, y, w, h, 4, 6);
  for (let i = 0, t = t0 + 0.4; t < t1 - 0.05; i++, t += 0.1) {
    const polys = [[[0, 0], [1, 0], [1, 1], [0, 1]]];
    for (let b = 0; b < n; b++) {
      const bh = (0.15 + 0.7 * rnd(i * 29 + b * 11 + y)) * h * 0.45 * (0.5 + 0.5 * Math.abs(Math.sin(t * 2 + b))), bx0 = 10 + b * ((w - 20) / n), bw = (w - 20) / n * 0.6;
      polys.push([[bx0, h - 14 - bh], [bx0 + bw, h - 14 - bh], [bx0 + bw, h - 14], [bx0, h - 14]]);
    }
    D(2, t, t + 0.1, 'Shp', `{\\an7\\pos(${x},${y})\\p1\\1c${CY}\\1a&H50&}${polys.map(pth).join(' ')}`);
  }
  for (let s0 = t0 + 0.4; s0 < t1 - 0.3; s0 += 1.6)
    D(3, s0, Math.min(s0 + 1.6, t1), 'Shp', `{\\an7\\p1\\1c${CY}\\1a&H80&\\clip(${x},${y},${x + w},${y + h})\\move(${x},${y},${x},${y + h},0,1500)}${rectP(w, 3)}`);
  counter(t0 + 0.4, t1, x + 14, y + 30, 'SYNC ');
}
function procPop(o) {
  const lab = o.label || '', b = o.src ? path.basename(o.src) : '', cx = o.x + o.w / 2, cy = o.y + o.h / 2, s = Math.min(o.w, o.h);
  if (o.kind === 'v') return panel(o);
  if (/hexagon/.test(b)) return glyph('hexbig', cx, cy, s, o.t0, o.t1);
  if (/sun/.test(b)) return glyph('flare', cx, cy, s, o.t0, o.t1);
  frame(o.t0 + 0.15, o.t1, o.x, o.y, o.w, o.h, lab);
  glyph(/ID/.test(lab) ? 'eye' : /FORUM/.test(lab) ? 'node' : /WARN/.test(lab) ? 'tri' : 'hex', cx, cy, s * 0.62, o.t0, o.t1);
}
const pops = [];
function pop(o) {
  if (!(o.src && /NAZE_LOGO/.test(o.src))) return procPop(o);
  pops.push(o);
  if (o.frame === false) return;
  frame(o.t0 + (o.dx ? 0.6 : 0.15), o.t1, o.x, o.y, o.w, o.h, o.label);
  if (o.cover) SH(4, o.t0, o.t0 + 0.6, 1, o.x, o.y + o.h, rectP(o.w, o.h), `\\1c&H000000&\\t(0,550,0.5,\\fscy0)`);
}

// ---------- SFX ----------
const SYN = {
  whoosh: 'anoisesrc=d=1.0:c=pink:a=0.6,highpass=f=400,lowpass=f=4500,afade=t=in:d=0.45,afade=t=out:st=0.45:d=0.55',
  whoosh2: 'anoisesrc=d=0.7:c=white:a=0.5,bandpass=f=1800:w=1.2,afade=t=in:d=0.3,afade=t=out:st=0.3:d=0.4',
  rise: "aevalsrc='0.35*sin(2*PI*(180*t+260*t*t))*min(1,t/1.2)':d=1.8:s=44100",
  rev: 'anoisesrc=d=1.2:c=pink:a=0.6,highpass=f=500,lowpass=f=6000,afade=t=in:d=1.1,afade=t=out:st=1.1:d=0.1',
  static: 'anoisesrc=d=1.4:c=white:a=0.35,highpass=f=1500,tremolo=f=22:d=0.9,afade=t=out:st=1.0:d=0.4',
  scan: "aevalsrc='0.3*sin(2*PI*(900*t-450*t*t))*exp(-2*t)':d=0.9:s=44100",
  boom: "aevalsrc='0.9*sin(2*PI*(70*t-25*t*t))*exp(-3.2*t)':d=1.3:s=44100",
  shimmer: "aevalsrc='0.25*(sin(2*PI*2093*t)+sin(2*PI*3136*t)+sin(2*PI*4186*t))/3*exp(-2.2*t)':d=1.6:s=44100",
};
fs.mkdirSync(`${P}/SCRIPT/synth`, { recursive: true });
for (const [k, spec] of Object.entries(SYN)) { const o = `${P}/SCRIPT/synth/${k}.wav`; if (!fs.existsSync(o)) spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', spec, '-ar', '44100', '-ac', '2', o], { stdio: 'ignore' }); }
const KIND = {
  tick: ['INTERFACE', /tick/], click: ['INTERFACE', /click/], sw: ['INTERFACE', /switch/], tog: ['INTERFACE', /toggle/], err: ['INTERFACE', /error/],
  conf: ['INTERFACE', /confirm/], open: ['INTERFACE', /open|maximize/], close: ['INTERFACE', /close|minimize/], plk: ['INTERFACE', /pluck/], gl: ['INTERFACE', /glitch/],
  scr: ['INTERFACE', /scratch/], sel: ['INTERFACE', /select/], drop: ['INTERFACE', /drop/],
  zap: ['DIGITAL', /zap|laser/], pwr: ['DIGITAL', /power/], tone: ['DIGITAL', /tone/], hiup: ['DIGITAL', /high_up|highup/],
  imM: ['IMPACT', /metal/], imS: ['IMPACT', /soft/], imH: ['IMPACT', /bell|plate|heavy|tin|punch/],
};
const FUNGSI = { tick: 'penanda kata/ketikan', click: 'klik UI', sw: 'saklar HUD', tog: 'toggle elemen', err: 'notifikasi error', conf: 'konfirmasi', open: 'popup muncul', close: 'penutup panel', plk: 'penekanan kata', gl: 'ledakan glitch', scr: 'goresan coret', sel: 'seleksi teks', drop: 'scene masuk', zap: 'koneksi digital', pwr: 'power-up data', tone: 'nada interface', hiup: 'sapuan digital naik', imM: 'impact metal', imS: 'impact lembut', imH: 'impact berat/cinematic', whoosh: 'transisi sweep', whoosh2: 'whip pan', rise: 'riser ketegangan', rev: 'reverse sweep', static: 'noise statis', scan: 'data scan', boom: 'bass impact', shimmer: 'kilau akhir' };
const BANK = {}, cnt = {}, S = [];
function resolve(kind) {
  if (SYN[kind]) return `${P}/SCRIPT/synth/${kind}.wav`;
  const [dir, re] = KIND[kind];
  const all = (BANK[dir] ||= walk(`${V}/AUDIO/SFX/${dir}`, /\.(wav|ogg|mp3)$/i).filter(f => !/footstep/i.test(f)));
  let l = all.filter(f => re.test(path.basename(f)));
  if (!l.length) { console.log('SFX fallback:', kind); l = all; }
  return l[(cnt[kind] = (cnt[kind] ?? -1) + 1) % l.length];
}
const sx = (t, kind, vol = 0.5, o = {}) => S.push({ t, kind, vol, pit: o.pit ?? (0.94 + rnd(S.length * 3.7) * 0.16), maxd: o.maxd ?? (SYN[kind] ? 2 : 1.2) });
const SEG = [[0, 4.75, 'Pernah membayangkan… melalui Google?'], [4.75, 5.25, 'jeda'], [5.25, 6.33, 'Namanya Dark Web.'], [6.33, 6.92, 'jeda'], [6.92, 12.38, 'Sebuah bagian internet… konfigurasi khusus.'], [12.38, 12.92, 'jeda'], [12.92, 13.71, 'Di dalamnya,'], [13.71, 14.15, 'jeda'], [14.15, 16.34, 'identitas pengguna bisa disamarkan.'], [16.34, 16.88, 'jeda'], [16.88, 18.2, 'Ada forum tersembunyi,'], [18.2, 18.68, 'jeda'], [18.68, 19.84, 'komunitas anonim,'], [19.84, 20.3, 'jeda'], [20.3, 21.87, 'hingga aktivitas ilegal.'], [21.87, 22.39, 'jeda'], [22.39, 24.8, 'Tapi tidak semua Dark Web berisi kejahatan.'], [24.8, 25.36, 'jeda'], [25.36, 26.14, 'Jurnalis,'], [26.14, 26.6, 'jeda'], [26.6, 27.31, 'aktivis,'], [27.31, 27.76, 'jeda'], [27.76, 30.83, 'dan orang-orang … privasi … menggunakannya.'], [30.83, 31.33, 'jeda'], [31.33, 33.91, 'Dark Web bukan sekadar tempat misterius.'], [33.91, 34.49, 'jeda'], [34.49, 37.8, 'Ini adalah sisi lain internet … diketahui orang.'], [37.8, 40, 'narasi selesai']];
const narr = t => (SEG.find(s => t >= s[0] && t < s[1]) || [0, 0, '-'])[2];

// ---------- HUD ----------
const m = 34;
for (const [an, x, y] of [[7, m, m], [9, W - m, m], [1, m, H - m], [3, W - m, H - m]])
  for (const [w, h] of [[70, 3], [3, 70]]) SH(1, 0, DUR, an, x, y, rectP(w, h), `\\1c${CY}\\1a&H20&\\fscx1\\fscy1\\t(0,800,0.4,\\fscx100\\fscy100)`);
SH(1, 0, DUR, 7, m, H - m - 22, rectP(W - 2 * m, 4), `\\1c${CY}\\1a&HC0&`);
SH(2, 0, DUR, 7, m, H - m - 22, rectP(W - 2 * m, 4), `\\1c${CY}\\fscx1\\t(0,${DUR * 1000},1,\\fscx100)`);
for (let s = 0; s < DUR; s += 3) D(1, s, s + 3, 'Shp', `{\\an7\\p1\\1c${CY}\\1a&HE8&\\move(0,0,0,${H})}${rectP(W, 3)}`);
for (let s = 0; s < DUR; s++) D(3, s, s + 1, 'mono', `{\\an7\\pos(${m + 10},${m + 10})\\fs22\\1c${CY}\\bord0\\alpha&H30&}NAZE // REC 00:${pad(s)}`);
[[0, 5.25, '01 // QUERY'], [5.25, 12.9, '02 // DEFINE'], [12.9, 22.4, '03 // INSIDE'], [22.4, TE4, '04 // TRUTH'], [31.33, DUR, '05 // BEYOND']]
  .forEach(([a, b, l]) => D(3, a, b, 'mono', `{\\an9\\pos(${W - m - 10},${m + 10})\\fs22\\1c${CY}\\bord0\\fad(300,0)}${l}`));

// ---------- S1 · 0–5.25 · maskFx + charFx ----------
const L1 = ['ADA BAGIAN', 'INTERNET', 'YANG TAK', 'TERLIHAT?'], z1 = gsize('s1', L1, 104);
grp(maskFx, 's1', L1.slice(0, 2), 1.45, 5.1, 430, 115, { size: z1, dt: 0.5 });
grp(charFx, 's1', L1.slice(2), 2.95, 5.1, 700, 115, { size: z1, dt: 0.5 });
glitchBurst('s1', 'TERLIHAT?', 815, z1, 3.45, 9);
radar(1.0, 5.1, 545, 1030, 95);
typeFx('SIGNAL: NOT FOUND', 2.0, 5.0, 50, 960, { size: 24 });
typeFx('QUERY: 0 RESULT', 3.2, 5.0, 50, 1000, { size: 24 });
pop({ kind: 'v', ss: 1, t0: 3.0, t1: 5.1, x: 404, y: 150, w: 272, h: 153, label: 'FOUND?', cover: true });
glitchCut(4.75, 7); shock(4.75); flash(4.75, 0x90);
sx(0.15, 'sw', .45); sx(0.45, 'tick', .3, { pit: 1.2 }); sx(0.7, 'open', .3, { pit: 1.1 });
[[1.45, 1], [1.95, 1.12], [2.95, 1.25], [3.45, 1.4]].forEach(([t, p]) => sx(t, 'tick', .45, { pit: p }));
sx(2.0, 'scan', .3); sx(3.0, 'open', .5); sx(3.3, 'err', .5); sx(3.45, 'gl', .65); sx(3.5, 'rise', .45);
sx(4.75, 'imM', .85); sx(4.75, 'boom', .6); sx(5.1, 'whoosh', .5);

// ---------- S2 · 5.25–12.9 · track + grid + panel slide ----------
grid(5.8, 12.4, 60, 220, 600, 520, 6, 5);
grp(text, 's2', ['DARK', 'WEB'], 5.45, 12.8, 520, 165, { fx: 'track', size: 170, dt: 0.12, then: i => [{ t: 6.92 }, { t: 7.45, dy: -170 - i * 55, sc: 0.62, e: 'inOut' }] });
shock(6.1); flash(6.1, 0x60);
typeFx('SOFTWARE KHUSUS', 8.55, 12.8, 360, 640, { size: 30, an: 5 });
typeFx('KONFIGURASI KHUSUS', 10.35, 12.8, 360, 690, { size: 30, an: 5 });
counter(7.3, 12.3, 50, 1000, 'ACCESS ');
pop({ kind: 'v', ss: 5, t0: 7.2, t1: 12.3, x: 370, y: 720, w: 300, h: 400, dx: 420, label: 'ACCESS: RESTRICTED' });
wipe(12.45);
sx(5.45, 'rev', .4, { maxd: .8 }); sx(6.1, 'imH', .9); sx(6.1, 'boom', .7); sx(6.1, 'gl', .4); sx(6.95, 'whoosh2', .5); sx(7.1, 'whoosh', .35);
sx(7.25, 'open', .55); sx(7.6, 'plk', .4);
for (let i = 0; i < 5; i++) { sx(8.6 + i * .14, 'tick', .28, { pit: 1 + i * .06 }); sx(10.4 + i * .14, 'tick', .28, { pit: 1.3 - i * .05 }); }
sx(10.4, 'scan', .35); sx(10.45, 'sel', .45); sx(11.8, 'rise', .45); sx(12.38, 'imS', .6); sx(12.4, 'rev', .4); sx(12.45, 'whoosh2', .55);

// ---------- S3 · 12.9–22.4 · char, rot, glitch + ikon + waveform + network ----------
const ic = n => walk(`${V}/VISUAL/ICONS`, new RegExp(`glitch-icon-${pad(n)}\\.png$`))[0];
const must = f => f || 'glyph';
grp(charFx, 's3', ['ANONIMITAS'], 14.2, 22.1, 400, 0, { cap: 100 });
const z3 = gsize('s3', ['FORUM', 'TERSEMBUNYI', 'AKTIVITAS', 'ILEGAL'], 92);
grp(text, 's3', ['FORUM', 'TERSEMBUNYI'], 16.95, 22.1, 560, 105, { fx: 'rot', size: z3, dt: 0.25 });
grp(glitchFx, 's3', ['AKTIVITAS', 'ILEGAL'], 20.3, 22.1, 830, 105, { size: z3, dt: 0.2 });
pop({ kind: 'i', src: must(ic(ICONS[0])), t0: 14.25, t1: 22.1, x: 550, y: 250, w: 120, h: 120, label: 'ID: MASKED' });
pop({ kind: 'i', src: must(ic(ICONS[1])), t0: 17.2, t1: 22.1, x: 60, y: 500, w: 110, h: 110, label: 'FORUM' });
pop({ kind: 'i', src: must(ic(ICONS[2])), t0: 20.5, t1: 22.1, x: 570, y: 890, w: 110, h: 110, label: 'WARNING' });
wave(14.2, 22.1, 360, 1130, 560);
network(19.8, 22.1, [[80, 170], [250, 260], [430, 190], [620, 280], [330, 120]], [[0, 1], [1, 2], [2, 3], [1, 4], [4, 2]]);
accent(14.9, 22.1, 460);
shock(22.0, 360, 640, 1600); flash(22.35, 0xA0);
sx(12.95, 'drop', .5); sx(14.15, 'hiup', .5); sx(14.25, 'open', .5); sx(14.3, 'pwr', .35); sx(14.2, 'scan', .3, { pit: 1.2 });
[0, .12, .24, .36].forEach((d, i) => sx(14.25 + d, 'tick', .3, { pit: 1 + i * .08 }));
sx(16.9, 'sw', .5); sx(16.95, 'click', .45); sx(17.15, 'tone', .45); sx(17.2, 'open', .45); sx(18.7, 'tog', .4);
sx(19.8, 'scan', .3, { pit: .8 }); sx(19.85, 'zap', .5);
sx(20.3, 'err', .55); sx(20.32, 'imM', .8); sx(20.3, 'gl', .8); sx(20.48, 'gl', .5, { pit: .8 }); sx(20.3, 'static', .35); sx(20.5, 'open', .4);
sx(21.6, 'rev', .45); sx(21.87, 'imS', .6); sx(22.0, 'whoosh', .6);

// ---------- S4 · 22.4–30.85 · split, mask, strike, chip, kartu paralaks ----------
const L4 = ['PRIVASI', 'BUKAN', 'BERARTI', 'KEJAHATAN'], z4 = gsize('s4', L4, 110);
grp(splitFx, 's4', L4.slice(0, 2), 22.5, TE4, 380, 90, { size: z4, dt: 0.15 });
grp(maskFx, 's4', L4.slice(2), 23.4, TE4, 590, 90, { size: z4, dt: 0.35 });
strike(24.2, TE4, 690, Math.min(620, Math.round(9 * FW.s4 * z4)));
chip(25.4, TE4, 'JURNALIS', 40, 860); chip(26.65, TE4, 'AKTIVIS', 250, 860); chip(27.8, TE4, 'PRIVASI', 460, 860);
SH(2, 29.0, TE4, 7, 460, 860, rectP(180, 48), `\\1c${CY}\\1a&HA0&\\fad(100,250)`);
accent(29.0, TE4, 440, 420); shock(29.0, 550, 884, 500);
const hexF = walk(`${V}/VISUAL/PARTICLES`, /^hexagon\.png$/)[0];
if (hexF) pop({ kind: 'i', src: hexF, t0: 22.6, t1: TE4, x: 260, y: 150, w: 200, h: 200, fi: .5, fo: .4, frame: false });
pop({ kind: 'v', ss: 3, t0: 27.8, t1: TE4 - 0.05, x: 40, y: 980, w: 300, h: 170, dx: -380 });
pop({ kind: 'v', ss: 10, t0: 27.95, t1: TE4 - 0.05, x: 380, y: 1030, w: 300, h: 170, dx: 380 });
glitchCut(30.55, 10, 2);
sx(22.3, 'whoosh', .5); sx(22.4, 'imH', .85); sx(22.4, 'boom', .75); sx(22.55, 'gl', .45); sx(23.45, 'whoosh2', .35);
sx(24.2, 'scr', .5); sx(24.2, 'imS', .5);
sx(25.4, 'plk', .5, { pit: 1 }); sx(25.4, 'tick', .3); sx(26.65, 'plk', .5, { pit: 1.25 }); sx(27.8, 'plk', .5, { pit: 1.5 });
sx(27.7, 'whoosh2', .4); sx(27.85, 'open', .45); sx(29.0, 'hiup', .6); sx(29.0, 'imS', .5); sx(29.0, 'conf', .5); sx(29.8, 'rise', .5);
sx(30.55, 'gl', .7); sx(30.6, 'static', .5, { maxd: .5 }); sx(30.8, 'imM', .7, { pit: .8 });

// ---------- S5 · 31.33–40 · panel -> garis -> logo ----------
pop({ kind: 'v', ss: 6, t0: 31.5, t1: 34.35, x: 110, y: 470, w: 500, h: 290, label: '[ TIDAK SEKADAR MISTERIUS ]', cover: true });
D(4, 33.9, 34.3, 'Shp', `{\\an7\\p1\\1c&H000000&\\move(110,325,110,468,0,400)}${rectP(500, 145)}`);
D(4, 33.9, 34.3, 'Shp', `{\\an7\\p1\\1c&H000000&\\move(110,760,110,617,0,400)}${rectP(500, 145)}`);
SH(5, 34.3, 34.9, 7, 110, 613, rectP(500, 4), `\\1c${CY}\\t(0,600,0.5,\\fscx1)`);
typeFx('SISI LAIN INTERNET', 34.5, 37.7, 360, 600, { size: 34, an: 5 });
radar(34.6, 37.7, 360, 930, 80);
flash(37.8, 0xA0); shock(37.8, 360, 430, 1200);
grp(text, 's5', ['EXPLORE BEYOND', 'THE SCREEN'], 38.1, DUR - 0.2, 740, 72, { fx: 'wide', cap: 60, dt: 0.25 });
accent(38.8, DUR - 0.2, 830, 480);
const logoF = `${V}/VISUAL/LOGO/NAZE_LOGO.png`, sunF = walk(`${V}/VISUAL/PARTICLES`, /^sun\.png$/)[0];
pop({ kind: 'i', src: logoF, t0: 37.8, t1: DUR, x: 230, y: 0, w: 260, h: 260, ye: `300+120*pow(2,-10*clip((t-37.8)/0.7,0,1))`, fi: .4, fo: .3, frame: false });
if (sunF) pop({ kind: 'i', src: sunF, t0: 37.75, t1: 39.4, x: 10, y: 80, w: 700, h: 700, fi: .12, fo: 1.0, frame: false });
SH(9, DUR - 0.5, DUR, 7, 0, 0, rectP(W, H), `\\1c&H000000&\\1a&HFF&\\t(0,500,\\1a&H00&)`);
sx(31.35, 'sw', .5); sx(31.5, 'open', .5); sx(31.5, 'scan', .3);
for (let i = 0; i < 5; i++) { sx(32.0 + i * .14, 'tick', .26, { pit: 1 + i * .05 }); sx(34.5 + i * .14, 'tick', .26, { pit: 1.25 - i * .04 }); }
sx(33.9, 'rev', .5, { maxd: .8 }); sx(33.95, 'whoosh', .5); sx(34.3, 'close', .45); sx(34.6, 'scan', .3, { pit: .9 }); sx(36.6, 'rise', .55);
sx(37.8, 'imH', .9); sx(37.8, 'boom', .9); sx(37.85, 'imM', .5, { pit: .8 }); sx(38.1, 'whoosh2', .4); sx(38.6, 'shimmer', .5); sx(38.8, 'tone', .35);

// ---------- tulis ASS ----------
const styles = Object.entries(F).map(([k, f]) => `Style: ${k},${f.fam},100,&H00FFFFFF,&H000000FF,&H00FFFFFF,&H00000000,${f.bold},0,0,0,100,100,2,0,1,1.2,0,5,0,0,0,1`).join('\n');
const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n${styles}\nStyle: Shp,${F.mono.fam},20,&H00FFF000,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
const assPath = `${P}/SCRIPT/dark_v3.ass`;
fs.writeFileSync(assPath, header + ev.join('\n') + '\n');

// ---------- graph ffmpeg ----------
const footage = `${V}/VIDEO/INTRO/pixabay_215500_artificial_intelligence.mp4`;
const inArgs = ['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=${DUR}`];
let nIn = 1; const addIn = (...a) => { inArgs.push(...a); return nIn++; };
const vids = [], g = [];
if (vids.length) g.push(`[${FOOT}:v]split=${vids.length}${vids.map((_, i) => `[fv${i}]`).join('')}`);
let vi = 0, cur = '[0:v]';
pops.forEach((p, i) => {
  let src;
  if (p.kind === 'v') src = `[fv${vi++}]trim=start=${p.ss}:duration=${(p.t1 - p.t0 + 0.1).toFixed(2)},setpts=PTS-STARTPTS+${p.t0}/TB,scale=${p.w}:${p.h}:force_original_aspect_ratio=increase,crop=${p.w}:${p.h},eq=contrast=1.15:saturation=0.6`;
  else { const k = addIn('-loop', '1', '-framerate', `${FPS}`, '-t', `${DUR}`, '-i', p.src); src = `[${k}:v]scale=${p.w}:${p.h}:force_original_aspect_ratio=decrease`; }
  const fi = p.fi ?? 0.3, fo = p.fo ?? 0.3;
  g.push(`${src},format=rgba,fade=t=in:st=${p.t0}:d=${fi}:alpha=1,fade=t=out:st=${p.t1 - fo}:d=${fo}:alpha=1[pp${i}]`);
  const xe = p.dx ? `${p.x}+(${p.dx})*pow(2,-10*clip((t-${p.t0})/0.55,0,1))+(${p.dx})*pow(clip((t-${p.t1 - 0.4})/0.4,0,1),3)` : `${p.x}`;
  const ye = p.ye || `${p.y}+${p.bob || 0}*sin((t-${p.t0})*2.4)`;
  g.push(`${cur}[pp${i}]overlay=x='${xe}':y='${ye}':format=auto:enable='between(t,${p.t0},${p.t1})'[o${i}]`);
  cur = `[o${i}]`;
});
const IMPT = [4.75, 6.1, 20.32, 22.4, 29.0, 37.8];
const CAM = [[0, 5.25, 1.00, 1.07, 0, 0, 0, 0], [5.25, 12.9, 1.09, 1.00, 24, -24, 0, 0], [12.9, 22.4, 1.00, 1.06, -22, 22, 0, 0], [22.4, 31.33, 1.07, 1.00, 0, 0, 28, -28], [31.33, 40, 1.00, 1.05, 0, 0, 0, 0]];
const camSeg = (a, b) => CAM.reduceRight((acc, c) => `if(lt(t,${c[1]}),(${c[a]})+((${c[b]})-(${c[a]}))*(1-cos(PI*clip((t-${c[0]})/(${c[1]}-${c[0]}),0,1)))/2,${acc})`, `(${CAM.at(-1)[b]})`);
const SHK = `(${IMPT.map(ti => `gte(t,${ti})*exp(-9*(t-${ti}))`).join('+')})`;
const ZX = camSeg(2, 3), PX = `${camSeg(4, 5)}+14*${SHK}*sin(t*95)`, PY = `${camSeg(6, 7)}+14*${SHK}*cos(t*121)`;
const BK = addIn('-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=${DUR}`);
g.push(`${cur}format=yuv420p,ass=filename='${assPath}':fontsdir='${fdir}'[asv]`);
g.push(`[asv]scale=w='2*trunc(${W}*(${ZX})/2)':h='2*trunc(${H}*(${ZX})/2)':eval=frame:flags=bicubic[zz]`);
g.push(`[${BK}:v][zz]overlay=x='(W-w)/2+(${PX})':y='(H-h)/2+(${PY})':eval=frame:format=auto,format=yuv420p[v]`);

// ---------- audio ----------
const NAR = addIn('-i', `${P}/AUDIO/VOICE/narration.mp3`);
S.sort((a, b) => a.t - b.t);
const evs = S.map(e => ({ ...e, file: resolve(e.kind) })), byFile = new Map(), durC = {};
evs.forEach((e, i) => { if (!byFile.has(e.file)) byFile.set(e.file, []); byFile.get(e.file).push(i); });
const probeDur = f => durC[f] ??= (+spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout || 1);
for (const [file, idxs] of byFile) { const k = addIn('-i', file); g.push(`[${k}:a]aresample=44100,aformat=channel_layouts=stereo,asplit=${idxs.length}${idxs.map(i => `[u${i}]`).join('')}`); }
evs.forEach((e, i) => { const ms = Math.round(e.t * 1000); g.push(`[u${i}]asetrate=${Math.round(44100 * e.pit)},aresample=44100,atrim=end=${e.maxd},afade=t=out:st=${Math.max(0, e.maxd - 0.12).toFixed(2)}:d=0.12,volume=${e.vol},adelay=${ms}|${ms}[s${i}]`); });
g.push(`[${NAR}:a]aresample=44100,aformat=channel_layouts=stereo,volume=1.15,asplit=2[n1][n2]`);
g.push(`${evs.map((_, i) => `[s${i}]`).join('')}amix=inputs=${evs.length}:normalize=0:duration=longest[sm]`);
g.push(`[sm][n1]sidechaincompress=threshold=0.03:ratio=6:attack=8:release=250[sd]`);
g.push(`[n2][sd]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.95[a]`);

// ---------- timeline SFX ----------
fs.writeFileSync(`${P}/SOUND_TIMELINE.txt`, ['waktu | file | fungsi | durasi | volume | posisi terhadap narasi', ...evs.map(e => `${e.t.toFixed(2)}s | ${path.basename(e.file)} | ${FUNGSI[e.kind] || e.kind} | ${Math.min(e.maxd, probeDur(e.file) / e.pit).toFixed(2)}s | ${e.vol} | ${narr(e.t)}`)].join('\n') + '\n');
console.log(`ASS ${ev.length} event, SFX ${evs.length}, popup ${pops.length}, input ${nIn}`);

const out = `${P}/EXPORT/DARK_WEB_NAZE_V31${SCN ? '_S' + SCN : ''}.mp4`;
const args = ['-y', ...inArgs, '-filter_complex', g.join(';'), '-map', '[v]', '-map', '[a]', '-r', `${FPS}`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '192k', ...(SCN ? ['-ss', `${WIN[SCN - 1][0]}`, '-t', `${WIN[SCN - 1][1] - WIN[SCN - 1][0]}`] : ['-t', `${PREVIEW || DUR}`]), out];
fs.writeFileSync(`${P}/SCRIPT/graph_v3.txt`, g.join(';\n'));
if (DRY) { console.log('DRY OK. Cek SOUND_TIMELINE.txt dan SCRIPT/dark_v3.ass'); process.exit(0); }
const ff = spawn('ffmpeg', args, { stdio: 'inherit' });
ff.on('exit', c => console.log(c === 0 ? 'SELESAI: ' + out : 'GAGAL, kode ' + c));
