const fs = require('fs');
const [src, pat, dst] = process.argv.slice(2);
if (!fs.existsSync(src)) { console.log('File sumber tidak ada: ' + src); process.exit(1); }
let out = fs.readFileSync(src, 'utf8'), bad = 0, n = 0;
for (const m of fs.readFileSync(pat, 'utf8').matchAll(/@@OLD\n([\s\S]*?)\n@@NEW\n([\s\S]*?)\n@@END/g)) {
  n++; const c = out.split(m[1]).length - 1;
  if (c !== 1) { bad++; console.log(`BLOK ${n} GAGAL (ditemukan ${c}x): ${m[1].split('\n')[0].slice(0, 70)}`); continue; }
  out = out.replace(m[1], () => m[2]);
}
if (bad) { console.log('Dibatalkan, sumber tidak berubah.'); process.exit(1); }
fs.writeFileSync(dst, out); console.log(`OK: ${n} blok -> ${dst}`);
