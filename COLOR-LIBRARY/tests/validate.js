// Usage: node tests/validate.js -> exit 1 jika ada ERROR. Kontras gagal = WARN (dilaporkan, tidak diubah).
const fs=require('fs'),{h2r,hsl,cr}=require('./lib');
const rd=f=>JSON.parse(fs.readFileSync(__dirname+'/../data/'+f,'utf8'));
const TY=rd('typography.json').typography;
const P=rd('solid-palettes.json').palettes,G=rd('gradients.json').gradients;
let err=0,warn=0;const E=m=>{err++;console.log('ERROR',m)},W=m=>{warn++;console.log('WARN ',m)};
const ids=new Set();
for(const x of [...P,...G,...TY]){if(ids.has(x.id))E('ID ganda: '+x.id);ids.add(x.id)}
const seen={};
for(const p of P){
 const k=p.colors.map(c=>c.hex).join();if(seen[k])E(`palet duplikat: ${p.id} = ${seen[k]}`);seen[k]=p.id;
 for(const c of p.colors){
  if(!/^#[0-9a-f]{6}$/.test(c.hex))E(`HEX tidak valid ${p.id} ${c.hex}`);
  const h=c.hex.slice(1);if(JSON.stringify(h2r(h))!==JSON.stringify(c.rgb))E(`RGB tidak cocok ${p.id} ${c.hex}`);
  if(JSON.stringify(hsl(h2r(h)))!==JSON.stringify(c.hsl))E(`HSL tidak cocok ${p.id} ${c.hex}`);}
 const t=r=>p.colors.find(c=>c.role===r).hex.slice(1);
 for(const[n,a,b,min]of[['teks/latar','text.primary','background.base',4.5],['teks/permukaan','text.primary','background.surface',4.5],['primer/latar','brand.primary','background.base',3],['aksen/latar','brand.accent','background.base',3]]){
  const v=cr(t(a),t(b));if(v<min)W(`${p.id} ${n} ${v.toFixed(2)}:1 < ${min}:1`)}}
for(const g of G){
 if(!/^(linear|radial|conic)-gradient\(/.test(g.css))E('CSS gradien tidak valid '+g.id);
 if(g.stops.length<2)E('stop kurang '+g.id);
 let prev=-1;for(const s of g.stops){if(!/^#[0-9a-f]{6}$/.test(s.hex))E('stop HEX '+g.id);if(s.position<prev||s.position<0||s.position>100)E('posisi stop salah '+g.id);prev=s.position}}
for(const t of TY){const p=P.find(x=>x.id===t.paletteId);if(!p){E('palet font tidak ada '+t.id);continue}
 const c=r=>{const o=p.colors.find(x=>x.role===r);if(!o)E(`peran ${r} tidak ada di ${p.id}`);return o&&o.hex.slice(1)};
 if(!t.heading.family||!t.body.family)E('font kosong '+t.id);
 const bg=c('background.base'),hc=c(t.headingRole),bc=c(t.bodyRole),lk=c(t.linkRole);if(!bg||!hc||!bc||!lk)continue;
 const hm=t.headingRole.startsWith('text')?4.5:3;
 if(cr(hc,bg)<hm)W(`${t.id} judul ${cr(hc,bg).toFixed(2)}:1 < ${hm}:1`);
 if(cr(bc,bg)<4.5)W(`${t.id} isi ${cr(bc,bg).toFixed(2)}:1 < 4.5:1`);
 if(cr(lk,bg)<4.5)W(`${t.id} tautan ${cr(lk,bg).toFixed(2)}:1 < 4.5:1`)}
console.log(`\n${P.length} palet, ${G.length} gradien, ${TY.length} font, ${err} error, ${warn} peringatan kontras`);
process.exit(err?1:0);
