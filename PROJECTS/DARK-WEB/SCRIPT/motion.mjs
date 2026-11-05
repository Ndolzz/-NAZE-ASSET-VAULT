import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';

const V = path.join(os.homedir(), 'NAZE-ASSET-VAULT');
const P = process.cwd();
const W = 720, H = 1280, DUR = 39;
const FONT_DIR = `${V}/FONTS/DISPLAY/rajdhani`, FAMILY = 'Rajdhani';
const CY = '&HFFF000&', RED = '&H552AFF&';
console.log('Font:', fs.readdirSync(FONT_DIR).join(', '));

const walk = (d, re, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p, re, o) : re.test(e.name) && o.push(p); } return o; };
const rnd = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
const pad = n => String(n).padStart(2, '0');
const ts = s => { const cs = Math.round(s * 100); return `${Math.floor(cs / 360000)}:${pad(Math.floor(cs / 6000) % 60)}:${pad(Math.floor(cs / 100) % 60)}.${pad(cs % 100)}`; };

// ---------- scene ----------
const times = [[0, 7], [7, 14], [14, 24], [24, 33], [33, 39]];
const scenes = times.map(([s, e], i) => ({
  s, e, lines: fs.readFileSync(`${P}/VISUAL/TEXT/scene_0${i + 1}.txt`, 'utf8').split('\n').map(l => l.trim().toUpperCase()).filter(Boolean),
}));
const impacts = scenes.map(s => s.s + 0.35);

// ---------- ASS ----------
const ev = [];
const D = (layer, s, e, style, text) => ev.push(`Dialogue: ${layer},${ts(s)},${ts(e)},${style},,0,0,0,,${text}`);
const rect = (w, h) => `m 0 0 l ${w} 0 ${w} ${h} 0 ${h}`;

// HUD: bracket sudut menggambar diri
const m = 34, L = 70;
for (const [an, x, y] of [[7, m, m], [9, W - m, m], [1, m, H - m], [3, W - m, H - m]])
  for (const [w, h] of [[L, 3], [3, L]])
    D(1, 0, DUR, 'Shape', `{\\an${an}\\pos(${x},${y})\\p1\\fscx1\\fscy1\\1c${CY}\\1a&H20&\\t(0,800,0.4,\\fscx100\\fscy100)}${rect(w, h)}`);
// progress bar
D(1, 0, DUR, 'Shape', `{\\an7\\pos(${m},${H - m - 22})\\p1\\1c${CY}\\1a&HC0&}${rect(W - 2 * m, 4)}`);
D(2, 0, DUR, 'Shape', `{\\an7\\pos(${m},${H - m - 22})\\p1\\1c${CY}\\fscx1\\t(0,${DUR * 1000},1,\\fscx100)}${rect(W - 2 * m, 4)}`);
// scanline
for (let s = 0; s < DUR; s += 3) D(1, s, s + 3, 'Shape', `{\\an7\\p1\\1c${CY}\\1a&HE8&\\move(0,0,0,${H})}${rect(W, 3)}`);
// timecode + label
for (let s = 0; s < DUR; s++) D(3, s, s + 1, 'Hud', `{\\an7\\pos(${m + 10},${m + 10})}NAZE // REC 00:${pad(s)}`);
D(3, 0, DUR, 'Hud', `{\\an9\\pos(${W - m - 10},${m + 10})\\fad(600,0)}DARK WEB`);
// hex rain
for (let i = 0; i < 10; i++) for (let s = 0; s < DUR; s += 4) {
  const x = 40 + i * 62, y0 = Math.round(rnd(i * 7 + s) * 500 - 100), hex = Math.floor(rnd(i + s * 3) * 65535).toString(16).toUpperCase();
  D(0, s, s + 4, 'Hud', `{\\an7\\1a&HD8&\\fad(500,500)\\move(${x},${y0},${x},${y0 + 600})}0x${hex}`);
}

// kinetic typography: tiap huruf punya keyframe sendiri
const kin = (line, t0, mode) => { let o = '', j = 0;
  for (const ch of line) { if (ch === ' ') { o += ' '; continue; }
    const d = t0 + j * 40; j++;
    o += mode === 'fill'
      ? `{\\1a&HFF&\\fscy0\\blur8\\t(${d},${d + 120},0.5,\\1a&H00&\\fscy125\\blur0)\\t(${d + 120},${d + 300},\\fscy100)}${ch}`
      : `{\\3a&HFF&\\fscy0\\t(${d},${d + 300},0.5,\\3a&H50&\\fscy100)}${ch}`; }
  return o; };

const sfx = [];
const add = (f, t, vol = 1) => { if (f && fs.existsSync(f)) sfx.push({ f, t: Math.max(0, t), vol }); else console.log('SFX tidak ada:', f); };
const A = `${V}/AUDIO/SFX`;
const whoosh = ['WHOOSH', 'SCI-FI', 'DIGITAL'].flatMap(d => { try { return walk(`${A}/${d}`, /\.(wav|ogg|mp3|flac|m4a)$/i); } catch { return []; } })[0];
const IMPACT = `${A}/IMPACT/impact_metal_heavy_000.ogg`, GLITCH = `${A}/INTERFACE/glitch_001.wav`,
  SWITCH = `${A}/INTERFACE/switch_001.wav`, DIGITAL = `${A}/DIGITAL/phase_jump_1.ogg`;

scenes.forEach((sc, i) => {
  const n = sc.lines.length, cy = i === 4 ? 800 : 640, ti = impacts[i];
  const info = sc.lines.map((line, j) => ({
    line, y: Math.round(cy + (j - (n - 1) / 2) * 150),
    size: Math.round(Math.min(n === 1 && i !== 4 ? 170 : 120, (W - 100) / (line.length * 0.52))),
  }));
  info.forEach(({ line, y, size }, j) => {
    const base = `\\an5\\pos(360,${y})\\fs${size}\\fad(0,350)`, t0 = 150 + j * 500;
    D(4, sc.s, sc.e, 'Main', `{${base}\\bord10\\blur16\\3c${CY}\\1a&HFF&}${kin(line, t0, 'glow')}`);
    D(5, sc.s, sc.e, 'Main', `{${base}}${kin(line, t0, 'fill')}`);
    add(SWITCH, sc.s + 0.15 + j * 0.5, 0.5);
  });
  const yl = info.at(-1).y + 95;
  D(3, sc.s, sc.e, 'Shape', `{\\an5\\pos(360,${yl})\\p1\\1c${CY}\\fscx1\\t(300,1100,0.4,\\fscx100)\\fad(0,350)}${rect(560, 4)}`);
  // glitch RGB-slice setelah impact
  for (let k = 0; k < 10; k++) info.forEach(({ line, y, size }, j) => {
    const st = ti + k / 30, band = Math.round(y - 70 + rnd(k * 13 + j * 7 + i) * 90), bh = 20 + Math.round(rnd(k * 5 + j + i * 3) * 70);
    [[RED, -1], [CY, 1]].forEach(([col, sg], q) => {
      const dx = Math.round(sg * (4 + rnd(k * 17 + q + j + i) * 14));
      D(6, st, st + 0.034, 'Main', `{\\an5\\pos(${360 + dx},${y})\\fs${size}\\clip(0,${band},${W},${band + bh})\\1c${col}\\1a&H30&}${line}`);
    });
  });
  D(7, ti, ti + 0.12, 'Shape', `{\\an7\\pos(0,0)\\p1\\1c&HFFFFFF&\\1a&H70&\\t(0,120,\\1a&HFF&)}${rect(W, H)}`);
  add(whoosh, sc.s - 0.05, 0.8); add(IMPACT, ti, 0.9); add(GLITCH, ti - 0.05, 0.6);
  if (i === 4) add(DIGITAL, sc.s + 0.1, 0.8);
});

const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Main,${FAMILY},100,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,3,0,1,0,0,5,0,0,0,1
Style: Hud,${FAMILY},22,&H00FFF000,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,2,0,1,0,0,7,0,0,0,1
Style: Shape,${FAMILY},20,&H00FFF000,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
const assPath = `${P}/SCRIPT/dark.ass`;
fs.writeFileSync(assPath, header + ev.join('\n') + '\n');
console.log('ASS:', ev.length, 'event');

// ---------- ffmpeg ----------
const footage = `${V}/VIDEO/INTRO/pixabay_215500_artificial_intelligence.mp4`;
const logoF = `${V}/VISUAL/LOGO/NAZE_LOGO.png`;
const voice = `${P}/AUDIO/VOICE/narration.mp3`;
const music = `${V}/AUDIO/MUSIC/TECHNO/technological_messup.ogg`;
const out = `${P}/EXPORT/DARK_WEB_NAZE_V2.mp4`;
const ls = scenes[4].s + 0.1;
const amp = impacts.map(t => `gte(t,${t})*exp(-10*(t-${t}))`).join('+');
const ms = s => Math.round(s.t * 1000);

const fc = [
  `[0:v]scale=770:1370:force_original_aspect_ratio=increase,crop=${W}:${H}:x='(iw-${W})/2+22*(${amp})*sin(t*120)':y='(ih-${H})/2+22*(${amp})*cos(t*143)',eq=contrast=1.15:brightness=-0.2:saturation=0.5,vignette=PI/4,noise=alls=8:allf=t,format=yuv420p,ass=filename='${assPath}':fontsdir='${FONT_DIR}'[v0]`,
  `[1:v]scale=260:-1,format=rgba,fade=t=in:st=${ls}:d=0.6:alpha=1[lg]`,
  `[v0][lg]overlay=x=(W-w)/2:y='200+90*exp(-7*max(t-${ls},0))':enable='gte(t,${ls})',format=yuv420p[v]`,
  `[2:a]volume=1.0[vo]`,
  `[3:a]volume=0.3,afade=t=in:d=1,afade=t=out:st=${DUR - 3}:d=3[mu]`,
  ...sfx.map((s, i) => `[${4 + i}:a]adelay=${ms(s)}|${ms(s)},volume=${s.vol}[s${i}]`),
  `[vo][mu]${sfx.map((_, i) => `[s${i}]`).join('')}amix=inputs=${2 + sfx.length}:normalize=0:duration=longest,alimiter=limit=0.95[a]`,
].join(';');

const ff = spawn('ffmpeg', ['-y',
  '-stream_loop', '-1', '-i', footage,
  '-loop', '1', '-i', logoF,
  '-i', voice, '-i', music,
  ...sfx.flatMap(s => ['-i', s.f]),
  '-filter_complex', fc, '-map', '[v]', '-map', '[a]',
  '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
  '-c:a', 'aac', '-b:a', '192k', '-t', `${DUR}`, out], { stdio: 'inherit' });
ff.on('exit', c => console.log(c === 0 ? 'SELESAI: ' + out : 'GAGAL, kode ' + c));
