// Usage: node tests/validate-tokens.js -> exit 1 jika token hilang/format salah; kontras gagal = WARN
const fs=require('fs'),{cr}=require('./lib');
const T=JSON.parse(fs.readFileSync(__dirname+'/../data/semantic-tokens.json','utf8')).palettes;
const NEED=['brand.primary','brand.secondary','brand.accent','background.base','background.surface','background.elevated','background.overlay','text.primary','text.secondary','text.muted','text.inverse','border.subtle','border.default','border.strong','interactive.default','interactive.hover','interactive.active','interactive.disabled','interactive.focus','status.success','status.warning','status.error','status.info'];
const css=fs.readFileSync(__dirname+'/../tokens/css-variables.css','utf8');
let err=0,warn=0;const stat={};
const CH=[['text.secondary','background.base',4.5],['text.muted','background.base',3],['text.inverse','interactive.default',4.5],['border.strong','background.base',3],['interactive.default','background.base',3],['interactive.hover','background.base',3],['interactive.focus','background.base',3],['status.success','background.base',3],['status.warning','background.base',3],['status.error','background.base',3],['status.info','background.base',3]];
for(const[id,o]of Object.entries(T)){
 for(const k of NEED){const h=o.tokens[k];if(!h||!/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(h)){err++;console.log('ERROR token',id,k,h)}}
 if(!css.includes(`[data-palette="${id}"]`)){err++;console.log('ERROR CSS tidak memuat',id)}
 for(const[a,b,min]of CH){const A=o.tokens[a],B=o.tokens[b];if(!A||!B)continue;const v=cr(A.slice(1,7),B.slice(1,7));if(v<min){warn++;stat[a]=(stat[a]||0)+1;if(process.argv[2]=='-v')console.log(`WARN  ${id} ${a}/${b} ${v.toFixed(2)}:1 < ${min}:1`)}}}
console.log(Object.keys(T).length+' palet, '+err+' error, '+warn+' peringatan kontras (jalankan dengan -v untuk rincian)');
console.log('per token:',JSON.stringify(stat));
process.exit(err?1:0);
