// Usage: node tests/validate-project-colors.js -> exit 1 jika ada pelanggaran.
// Kebijakan: semua warna proyek NAZE wajib berasal dari COLOR-LIBRARY (lihat ../policy.json).
const fs = require('fs');
const path = require('path');
const { cr } = require('./lib');

const ROOT = path.join(__dirname, '..', '..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', p), 'utf8'));

const policy = rd('policy.json');
const palettes = rd('data/solid-palettes.json').palettes;
const gradients = rd('data/gradients.json').gradients;
const typography = rd('data/typography.json').typography;
const semantic = rd('data/semantic-tokens.json').palettes;

const norm = (h) => String(h || '').toLowerCase();
const byId = new Map(palettes.map((p) => [p.id, p]));
const gradIds = new Set(gradients.map((g) => g.id));
const typeIds = new Set(typography.map((t) => t.id));

// Pemetaan peran palette engine -> token COLOR-LIBRARY
function expectedColors(paletteId) {
  const p = byId.get(paletteId);
  if (!p) return null;
  const role = (r) => { const c = p.colors.find((x) => x.role === r); return c && norm(c.hex); };
  const st = semantic[paletteId] && semantic[paletteId].tokens;
  return {
    background: role('background.base'),
    primary: role('brand.primary'),
    secondary: st && norm(st['brand.secondary']),
    accent: role('brand.accent'),
    text: role('text.primary'),
    dark: p.mode === 'dark',
  };
}

function contrastOk(role, hex, bg) {
  if (!bg) return true;
  const min = role.startsWith('text') ? 4.5 : 3;
  return cr(hex, bg) >= min;
}

const errors = [];
const notes = [];
const E = (m) => errors.push(m);
const N = (m) => notes.push(m);

const projectsDir = path.join(ROOT, 'PROJECTS');
if (!fs.existsSync(projectsDir)) {
  console.log('PROJECTS/ tidak ditemukan; tidak ada proyek yang divalidasi.');
  process.exit(0);
}

const dirs = fs.readdirSync(projectsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

let checked = 0, ok = 0, grandfathered = 0;

for (const dir of dirs) {
  const pjPath = path.join(projectsDir, dir, 'project.json');
  if (!fs.existsSync(pjPath)) continue;
  checked++;
  const reason = policy.grandfathered && policy.grandfathered[dir];
  if (reason) { grandfathered++; N(dir + ': grandfathered (' + reason + ')'); continue; }
  let pj;
  try { pj = JSON.parse(fs.readFileSync(pjPath, 'utf8')); }
  catch (e) { E(dir + ': project.json bukan JSON valid (' + e.message + ')'); continue; }

  const cs = pj.colorSystem || null;
  const pal = pj.palette === undefined ? null : pj.palette;

  if (cs) {
    if (!cs.paletteId || !byId.has(cs.paletteId)) {
      E(dir + ': colorSystem.paletteId "' + (cs.paletteId || '') + '" tidak terdaftar di COLOR-LIBRARY');
    }
    for (const g of cs.gradientIds || []) if (!gradIds.has(g)) E(dir + ': gradientId "' + g + '" tidak terdaftar di COLOR-LIBRARY');
    if (cs.typographyId && !typeIds.has(cs.typographyId)) E(dir + ': typographyId "' + cs.typographyId + '" tidak terdaftar di COLOR-LIBRARY');
  }

  if (pal && typeof pal === 'object') {
    let expected = cs && byId.has(cs.paletteId) ? expectedColors(cs.paletteId) : null;
    let matchedId = cs && cs.paletteId;
    if (!expected) {
      for (const p of palettes) {
        const exp = expectedColors(p.id);
        if (exp && ['background', 'primary', 'secondary', 'accent', 'text'].every((r) => !exp[r] || exp[r] === norm(pal[r]))) {
          expected = exp; matchedId = p.id; break;
        }
      }
    }
    if (!expected) {
      E(dir + ': palet tidak berasal dari COLOR-LIBRARY (tidak ada palet katalog yang cocok dan colorSystem.paletteId tidak ditetapkan)');
      continue;
    }
    const overrides = (cs && cs.overrides) || {};
    for (const role of ['background', 'primary', 'secondary', 'accent', 'text']) {
      const actual = norm(pal[role]);
      if (!actual) continue;
      const want = expected[role];
      if (want && actual === want) continue;
      const overrideKey = Object.keys(overrides).find((k) => norm(overrides[k]) === actual);
      if (overrideKey) {
        if (!contrastOk(role, actual, expected.background)) {
          E(dir + ': override ' + role + ' ' + actual + ' (' + overrideKey + ') kontras di bawah ambang terhadap latar katalog');
        }
        continue;
      }
      E(dir + ': ' + role + ' ' + actual + ' != token katalog ' + matchedId + ' (' + (want || 'n/a') + ') dan tidak dideklarasikan di colorSystem.overrides');
    }
    if (typeof pal.dark === 'boolean' && expected.dark !== pal.dark) {
      E(dir + ': mode ' + (pal.dark ? 'dark' : 'light') + ' tidak cocok dengan palet katalog ' + matchedId + ' (' + (expected.dark ? 'dark' : 'light') + '); jangan membalik palet secara manual');
    }
    ok++;
  } else if (typeof pal === 'string') {
    E(dir + ': palette "' + pal + '" adalah preset engine, bukan warna dari COLOR-LIBRARY');
  } else if (!cs) {
    E(dir + ': tidak memiliki colorSystem maupun palette dari COLOR-LIBRARY');
  } else {
    ok++;
  }
}

for (const n of notes) console.log('SKIP  ', n);
for (const e of errors) console.log('ERROR ', e);
console.log('');
console.log(checked + ' proyek diperiksa: ' + ok + ' patuh, ' + grandfathered + ' grandfathered, ' + errors.length + ' pelanggaran');
process.exit(errors.length ? 1 : 0);
