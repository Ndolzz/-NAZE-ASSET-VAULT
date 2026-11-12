// Usage: node tests/build-meta.js -> data/categories.json, data/color-tags.json, examples/project-config.example.json (+ cek referensi)
const fs=require('fs'),{h2r,hsl}=require('./lib');
const rd=f=>JSON.parse(fs.readFileSync(__dirname+'/../data/'+f,'utf8'));
const P=rd('solid-palettes.json').palettes,G=rd('gradients.json').gradients,TY=rd('typography.json').typography;
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const SPEC=['Monochrome','Minimalist','Modern Technology','Software Engineering','Cybersecurity','Artificial Intelligence','Corporate','Professional','Luxury','Editorial','Creative Studio','Gaming','Cinematic','Industrial','Nature','Forest','Ocean','Earth Tone','Desert','Sunset','Neon','Retro','Vintage','Pastel','Futuristic','Experimental'];
const GSPEC=[['Linear','Linear Gradient'],['Radial','Radial Gradient'],['Conic','Conic Gradient'],['Multi-stop','Multi-stop Gradient'],['Mesh-inspired','Mesh-inspired Gradient'],['Atmospheric','Atmospheric Gradient'],['Metallic','Metallic Gradient'],['Neon','Neon Gradient'],['Cinematic','Cinematic Gradient'],['Subtle','Subtle Background Gradient'],['Soft','Soft Gradient'],['High Contrast','High Contrast Gradient']];
const cat={version:1,solid:SPEC.map(n=>({id:'cat-'+slug(n),name:n,paletteIds:P.filter(p=>p.category===n).map(p=>p.id)})),
 gradient:GSPEC.map(([k,n])=>({id:'gcat-'+slug(k),key:k,name:n,gradientIds:G.filter(g=>g.category===k).map(g=>g.id)})),
 typography:[...new Set(TY.map(t=>t.category))].map(n=>({id:'tcat-'+slug(n),name:n,typographyIds:TY.filter(t=>t.category===n).map(t=>t.id)}))};
const hue=([h,s,l])=>{if(s<8)return'neutral';return h>=345||h<15?'red':h<40?'orange':h<65?'yellow':h<165?'green':h<195?'cyan':h<255?'blue':h<290?'purple':'magenta'};
const temp=([h,s])=>s<8?'neutral':(h<70||h>=330)?'warm':(h>=90&&h<270)?'cool':'neutral';
const sat=s=>s<30?'muted':s<60?'balanced':s<85?'vivid':'highly-saturated';
const bri=l=>l<35?'dark':l<65?'medium':'light';
const CH=['professional','elegant','energetic','calm','technical','futuristic','organic','editorial','playful','cinematic'];
const tags={version:1,usage:{'background.base':['background'],'background.surface':['surface'],'text.primary':['typography'],'brand.primary':['interactive','border','data-visualization'],'brand.accent':['accent','illustration','motion-graphics']},palettes:{}};
for(const p of P){const c=r=>p.colors.find(x=>x.role===r).hsl;const pr=c('brand.primary'),ac=c('brand.accent'),bg=c('background.base');
 tags.palettes[p.id]={mode:p.mode,brightness:bri(bg[2]),primary:{hue:hue(pr),temperature:temp(pr),saturation:sat(pr[1])},accent:{hue:hue(ac),temperature:temp(ac),saturation:sat(ac[1])},
  warmCoolBalance:temp(pr)===temp(ac)?temp(pr):'mixed',character:p.tags.filter(t=>CH.includes(t)),search:[...new Set([p.name.toLowerCase(),p.category.toLowerCase(),...p.tags,hue(pr),hue(ac)])]}}
fs.writeFileSync(__dirname+'/../data/categories.json',JSON.stringify(cat,null,1));
fs.writeFileSync(__dirname+'/../data/color-tags.json',JSON.stringify(tags,null,1));
fs.writeFileSync(__dirname+'/../examples/project-config.example.json',JSON.stringify({project:'contoh-proyek',colorSystem:{paletteId:'tech-slate',mode:'dark',gradientIds:['grad-slate-glow'],typographyId:'type-grotesk',locked:true},overrides:{}},null,2));
// cek referensi
let err=0;const ids=new Set(P.map(p=>p.id));
for(const p of P)if(!cat.solid.some(c=>c.paletteIds.includes(p.id))){err++;console.log('ERROR palet tanpa kategori spec:',p.id,p.category)}
for(const g of G)if(!cat.gradient.some(c=>c.gradientIds.includes(g.id))){err++;console.log('ERROR gradien tanpa kategori:',g.id)}
for(const c of cat.solid)if(!c.paletteIds.length)console.log('WARN kategori kosong:',c.name);
const ex=JSON.parse(fs.readFileSync(__dirname+'/../examples/project-config.example.json','utf8'));
if(!ids.has(ex.colorSystem.paletteId)||!ex.colorSystem.gradientIds.every(i=>G.some(g=>g.id===i))||!TY.some(t=>t.id===ex.colorSystem.typographyId)){err++;console.log('ERROR contoh konfigurasi merujuk ID tidak ada')}
console.log('kategori solid:',cat.solid.length,'gradien:',cat.gradient.length,'font:',cat.typography.length,'| error:',err);process.exit(err?1:0);
