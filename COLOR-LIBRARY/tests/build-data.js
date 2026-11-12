// Usage: node tests/build-data.js (membaca app/index.html, menulis data/*.json)
const fs=require('fs'),{h2r,hsl}=require('./lib');
const src=fs.readFileSync(__dirname+'/../app/index.html','utf8');
const a=src.indexOf('const P=['),b=src.indexOf('const ROLES'),c=src.indexOf('const G=['),d=src.indexOf('// ===== COLOR MATH');
const {P,G,T}=new Function(src.slice(a,b)+src.slice(c,d)+'return {P,G,T}')();
const ROLES=['background.base','background.surface','text.primary','brand.primary','brand.accent'];
const palettes=P.map(p=>({id:p.id,name:p.name,category:p.cat,tags:p.tags,
 mode:p.tags.includes('dark')?'dark':'light',
 colors:p.c.map((h,i)=>({role:ROLES[i],hex:'#'+h,rgb:h2r(h),hsl:hsl(h2r(h))}))}));
const gradients=G.map(g=>{
 const type=g.css.startsWith('linear')?'linear':g.css.startsWith('radial')?'radial':'conic';
 const raw=[...g.css.matchAll(/(#[0-9a-fA-F]{6})(?:\s+(\d+)%)?/g)];
 const stops=raw.map((m,i)=>({hex:m[1].toLowerCase(),position:m[2]!==undefined?+m[2]:Math.round(i*100/(raw.length-1))}));
 return{id:g.id,name:g.name,category:g.type,type,css:g.css,stops,textColor:g.tx};});
fs.writeFileSync(__dirname+'/../data/solid-palettes.json',JSON.stringify({version:1,palettes},null,1));
fs.writeFileSync(__dirname+'/../data/gradients.json',JSON.stringify({version:1,gradients},null,1));
const typography=T.map(t=>({id:t[0],name:t[1],category:t[2],heading:{family:t[3],fallback:t[4]=='s'?'serif':t[4]=='m'?'monospace':'sans-serif',weight:t[5],letterSpacing:t[6],textTransform:t[7]},body:{family:t[8],fallback:t[9]=='s'?'serif':t[9]=='m'?'monospace':'sans-serif'},paletteId:t[10],headingRole:t[11],bodyRole:'text.primary',linkRole:'brand.primary'}));
fs.writeFileSync(__dirname+'/../data/typography.json',JSON.stringify({version:1,typography},null,1));
console.log('font:',typography.length);console.log('palet:',palettes.length,'gradien:',gradients.length);
