// Usage: node GENERATED-2D/tests/validate-catalog.js -> exit 1 jika katalog tidak valid.
// Kebijakan: GENERATED-2D adalah sumber visual utama produksi (lihat ../asset-policy.json
// dan NAZE-STANDARDS.md). Katalog wajib utuh: 200 aset, id/file unik, file SVG ada dan terbaca.
const fs = require('fs');
const path = require('path');

const LIB = path.join(__dirname, '..');
const errors = [];
const E = (m) => errors.push(m);

let catalog;
try {
  catalog = JSON.parse(fs.readFileSync(path.join(LIB, 'catalog.json'), 'utf8'));
} catch (e) {
  console.error('ERROR catalog.json bukan JSON valid: ' + e.message);
  process.exit(1);
}

if (!Array.isArray(catalog.assets)) {
  console.error('ERROR catalog.assets bukan array');
  process.exit(1);
}
if (catalog.totalAssets !== catalog.assets.length) {
  E('totalAssets (' + catalog.totalAssets + ') != jumlah entri assets (' + catalog.assets.length + ')');
}
if (catalog.totalAssets !== 200) {
  E('totalAssets = ' + catalog.totalAssets + ', pustaka wajib berisi 200 aset');
}

const seenId = new Set();
const seenFile = new Set();
for (const a of catalog.assets) {
  if (!a.id) E('aset tanpa id');
  else if (seenId.has(a.id)) E('id duplikat: ' + a.id);
  else seenId.add(a.id);

  if (!a.file) { E('aset ' + (a.id || '?') + ' tanpa field file'); continue; }
  if (seenFile.has(a.file)) E('file duplikat: ' + a.file);
  else seenFile.add(a.file);

  if (!/\.svg$/i.test(a.file)) E('aset ' + a.id + ' bukan .svg: ' + a.file);

  const fp = path.join(LIB, a.file);
  if (!fs.existsSync(fp)) { E('file tidak ditemukan: ' + a.file); continue; }
  const head = fs.readFileSync(fp, 'utf8').slice(0, 1024);
  if (!head.includes('<svg')) E('file bukan SVG yang dapat dirender: ' + a.file);
}

// Konsistensi ringkasan kategori vs isi
const counts = {};
for (const a of catalog.assets) counts[a.category] = (counts[a.category] || 0) + 1;
for (const c of catalog.categories || []) {
  if ((counts[c.category] || 0) !== c.count) {
    E('kategori ' + c.category + ': katalog klaim ' + c.count + ', aktual ' + (counts[c.category] || 0));
  }
}

for (const e of errors) console.log('ERROR ' + e);
console.log('');
console.log('Katalog: ' + catalog.assets.length + ' aset diperiksa, ' + errors.length + ' pelanggaran');
process.exit(errors.length ? 1 : 0);
