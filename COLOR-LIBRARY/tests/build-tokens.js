// Usage: node tests/build-tokens.js -> data/semantic-tokens.json, tokens/*.{css,json}
const fs=require('fs'),{mix,cr}=require('./lib');
const P=JSON.parse(fs.readFileSync(__dirname+'/../data/solid-palettes.json','utf8')).palettes;
const ST={dark:{success:'4ade80',warning:'fbbf24',error:'f87171',info:'60a5fa'},light:{success:'15803d',warning:'b45309',error:'b91c1c',info:'1d4ed8'}};
const out={version:1,derivation:'Token dasar dari palet; token turunan dihitung deterministik (mix RGB). Tidak ada warna sumber yang diubah.',palettes:{}};
for(const p of P){
 const g=r=>p.colors.find(c=>c.role===r).hex.slice(1);
 const bg=g('background.base'),sf=g('background.surface'),tx=g('text.primary'),pr=g('brand.primary'),ac=g('brand.accent');
 const inv=cr('ffffff',pr)>=cr('000000',pr)?'ffffff':'000000';
 const t={'brand.primary':pr,'brand.secondary':mix(pr,bg,.35),'brand.accent':ac,
 'background.base':bg,'background.surface':sf,'background.elevated':mix(sf,tx,.06),'background.overlay':bg+'cc',
 'text.primary':tx,'text.secondary':mix(tx,bg,.22),'text.muted':mix(tx,bg,.42),'text.inverse':inv,
 'border.subtle':mix(bg,tx,.12),'border.default':mix(bg,tx,.25),'border.strong':(()=>{let t=.45,c=mix(bg,tx,t);while(cr(c,bg)<3&&t<1){t+=.05;c=mix(bg,tx,t)}return c})(),
 'interactive.default':pr,'interactive.hover':mix(pr,tx,.15),'interactive.active':mix(pr,tx,.3),'interactive.disabled':mix(bg,tx,.3),'interactive.focus':ac,
 'status.success':ST[p.mode].success,'status.warning':ST[p.mode].warning,'status.error':ST[p.mode].error,'status.info':ST[p.mode].info};
 out.palettes[p.id]={mode:p.mode,tokens:Object.fromEntries(Object.entries(t).map(([k,v])=>[k,'#'+v]))};}
fs.writeFileSync(__dirname+'/../data/semantic-tokens.json',JSON.stringify(out,null,1));
const v=k=>'--'+k.replace('.','-');
let css='/* Dibuat oleh tests/build-tokens.js. Pakai: <html data-palette="tech-slate"> */\n';
for(const[id,o]of Object.entries(out.palettes))css+=`[data-palette="${id}"]{\n`+Object.entries(o.tokens).map(([k,h])=>`  ${v(k)}: ${h};`).join('\n')+'\n}\n';
fs.writeFileSync(__dirname+'/../tokens/css-variables.css',css);
const dt={};for(const[id,o]of Object.entries(out.palettes)){dt[id]={};for(const[k,h]of Object.entries(o.tokens)){const[a,b]=k.split('.');(dt[id][a]=dt[id][a]||{})[b]={$value:h,$type:'color'}}}
fs.writeFileSync(__dirname+'/../tokens/design-tokens.json',JSON.stringify(dt,null,1));
const tw={};for(const k of Object.keys(Object.values(out.palettes)[0].tokens)){const[a,b]=k.split('.');(tw[a]=tw[a]||{})[b]=`var(${v(k)})`}
fs.writeFileSync(__dirname+'/../tokens/tailwind-tokens.json',JSON.stringify({theme:{extend:{colors:tw}},note:'Set data-palette pada elemen root; warna mengikuti variabel CSS.'},null,1));
console.log('token:',Object.keys(out.palettes).length,'palet x',Object.keys(Object.values(out.palettes)[0].tokens).length,'token');
