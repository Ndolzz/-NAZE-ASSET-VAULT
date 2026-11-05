const fs = require('fs');
if (!fs.existsSync('SCRIPT/v3.mjs')) { console.log('SCRIPT/v3.mjs tidak ada'); process.exit(1); }
let out = fs.readFileSync('SCRIPT/v3.mjs', 'utf8'), bad = 0, n = 0;
const re = /@@OLD\n([\s\S]*?)\n@@NEW\n([\s\S]*?)\n@@END/g;
for (const m of fs.readFileSync('SCRIPT/patch31.txt', 'utf8').matchAll(re)) {
  n++; const c = out.split(m[1]).length - 1;
  if (c !== 1) { bad++; console.log(`BLOK ${n} GAGAL (ditemukan ${c}x): ${m[1].split('\n')[0].slice(0, 70)}`); continue; }
  out = out.replace(m[1], () => m[2]);
}
if (bad) { console.log('Patch dibatalkan, v3.mjs tidak berubah.'); process.exit(1); }
fs.writeFileSync('SCRIPT/v31.mjs', out); console.log(`OK: ${n} blok -> SCRIPT/v31.mjs`);
