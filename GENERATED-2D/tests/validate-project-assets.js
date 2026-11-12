// Usage: node GENERATED-2D/tests/validate-project-assets.js -> exit 1 jika ada pelanggaran.
// Kebijakan: setiap proyek produksi NAZE wajib memiliki PROJECTS/<NAMA>/ASSET-MAP.json
// yang memetakan kebutuhan scene ke file aset sebenarnya (lihat ../asset-policy.json
// dan NAZE-STANDARDS.md, bagian Pustaka Aset Wajib).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const LIB = path.join(ROOT, 'GENERATED-2D');
const policy = JSON.parse(fs.readFileSync(path.join(LIB, 'asset-policy.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(LIB, 'catalog.json'), 'utf8'));
const catalogFiles = new Set(catalog.assets.map((a) => a.file));

const ALLOWED_ROLES = policy.allowedRoles || [];

const errors = [];
const notes = [];
const E = (m) => errors.push(m);
const N = (m) => notes.push(m);

// Path aset library ditulis relatif terhadap GENERATED-2D (VISUAL/...) atau
// berawalan GENERATED-2D/; path lain dianggap relatif terhadap root repositori.
function resolveAssetPath(p) {
  if (typeof p !== 'string' || !p) return null;
  if (p.startsWith('GENERATED-2D/')) return path.join(ROOT, p);
  if (p.startsWith('VISUAL/')) return path.join(LIB, p);
  return path.join(ROOT, p);
}
function catalogKey(p) {
  return p.startsWith('GENERATED-2D/') ? p.slice('GENERATED-2D/'.length) : p;
}

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
  const mapPath = path.join(projectsDir, dir, 'ASSET-MAP.json');
  const hasProject = fs.existsSync(path.join(projectsDir, dir, 'project.json'));
  if (!hasProject && !fs.existsSync(mapPath)) continue;
  checked++;

  const reason = policy.grandfathered && policy.grandfathered[dir];
  if (reason) { grandfathered++; N(dir + ': grandfathered (' + reason + ')'); continue; }

  if (!fs.existsSync(mapPath)) {
    E(dir + ': ASSET-MAP.json wajib ada untuk setiap proyek produksi (lihat NAZE-STANDARDS.md, Pustaka Aset Wajib)');
    continue;
  }
  let map;
  try { map = JSON.parse(fs.readFileSync(mapPath, 'utf8')); }
  catch (e) { E(dir + ': ASSET-MAP.json bukan JSON valid (' + e.message + ')'); continue; }

  if (map.project && map.project !== dir) {
    E(dir + ': ASSET-MAP.project "' + map.project + '" != nama folder proyek');
  }
  if (!Array.isArray(map.assets) || map.assets.length === 0) {
    E(dir + ': ASSET-MAP.assets kosong atau bukan array');
    continue;
  }

  map.assets.forEach((a, i) => {
    const label = dir + ': assets[' + i + ']';
    if (!a || typeof a !== 'object') { E(label + ' bukan objek'); return; }
    if (!a.scene) E(label + ' tanpa field scene');
    if (!a.path) { E(label + ' tanpa field path'); return; }
    if (/placeholder|lorem|TODO/i.test(a.path)) E(label + ': path mengandung placeholder: ' + a.path);

    const abs = resolveAssetPath(a.path);
    if (!abs || !fs.existsSync(abs)) { E(label + ': path tidak ditemukan: ' + a.path); return; }

    if (a.path.startsWith('VISUAL/') || a.path.startsWith('GENERATED-2D/')) {
      if (!catalogFiles.has(catalogKey(a.path))) {
        E(label + ': aset GENERATED-2D "' + a.path + '" tidak terdaftar di catalog.json; daftarkan aset baru ke katalog');
      }
    }

    if (a.role && !ALLOWED_ROLES.includes(a.role)) {
      E(label + ': role "' + a.role + '" tidak dikenal (diizinkan: ' + ALLOWED_ROLES.join(', ') + ')');
    }
    if (a.animation !== undefined && typeof a.animation !== 'string') {
      E(label + ': animation harus berupa string');
    }
    if (a.palette !== undefined && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(a.palette) && !/^[a-z0-9-]+$/.test(a.palette)) {
      E(label + ': palette harus hex atau id palet COLOR-LIBRARY');
    }
  });
  ok++;
}

for (const n of notes) console.log('SKIP  ' + n);
for (const e of errors) console.log('ERROR ' + e);
console.log('');
console.log(checked + ' proyek diperiksa: ' + ok + ' patuh, ' + grandfathered + ' grandfathered, ' + errors.length + ' pelanggaran');
process.exit(errors.length ? 1 : 0);
