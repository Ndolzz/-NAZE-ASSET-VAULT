const h2r=h=>{h=String(h).replace(/^#/,'');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
const hsl=([r,g,b])=>{r/=255;g/=255;b/=255;const M=Math.max(r,g,b),m=Math.min(r,g,b),l=(M+m)/2,d=M-m;let h=0,s=0;
 if(d){s=d/(1-Math.abs(2*l-1));h=M==r?((g-b)/d)%6:M==g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360}return[Math.round(h),Math.round(s*100),Math.round(l*100)]};
const lum=h=>{const[r,g,b]=h2r(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b};
const cr=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
module.exports={h2r,hsl,lum,cr};
module.exports.mix=(a,b,t)=>{const x=module.exports.h2r(a),y=module.exports.h2r(b);return x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('')};
