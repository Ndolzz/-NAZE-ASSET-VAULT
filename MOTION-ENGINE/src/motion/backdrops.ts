/**
 * Named backdrop assets: 30 reusable, palette-aware animated backgrounds.
 *
 * Penggunaan via project.json:
 *   - per scene : "backdrop": "<id>"
 *   - default proyek: "backdrop": "<id>" pada level proyek; pipeline
 *     menormalisasi nilai ini ke setiap scene tanpa backdrop sendiri.
 * Backdrop digambar di atas warna dasar palet dan style texture, di bawah
 * seluruh konten scene (jalur klasik maupun jalur berlapis editorial-kinetic),
 * sehingga aman dipakai di setiap proyek. Semua backdrop adaptif peran palet,
 * beranimasi sangat lambat, dan menjaga opasitas rendah agar tidak bersaing
 * dengan subjek, tipografi, dan CC.
 */
import { SKRSContext2D } from "@napi-rs/canvas";
import { Palette } from "../color/palette";
import { mulberry32 } from "../core/easing";

export interface BackdropKit {
  palette: Palette;
  scale: number;
  t: number;
  w: number;
  h: number;
  seed: number;
}

export interface BackdropDef {
  id: string;
  name: string;
  draw: (ctx: SKRSContext2D, kit: BackdropKit) => void;
}

function hexToRgb(hex: string): [number, number, number] {
  const raw = (hex || "#000000").replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = parseInt(full, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function withAlpha(hex: string, alpha: number): string {
  const c = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return "rgba(" + c[0] + ", " + c[1] + ", " + c[2] + ", " + a + ")";
}

function mod(v: number, m: number): number {
  return ((v % m) + m) % m;
}

export const BACKDROPS: BackdropDef[] = [
  {
    id: "grid-fade",
    name: "Grid perspektif memudar ke atas",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      ctx.strokeStyle = withAlpha(palette.text, 0.12);
      ctx.lineWidth = Math.max(1, s);
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + i * w * 0.055, h);
        ctx.lineTo(w / 2 + i * w * 0.22, 0);
        ctx.stroke();
      }
      const band = h * 0.16;
      const drift = mod(t * 14 * s, band);
      for (let r = 0; r < 9; r++) {
        const p = (r + drift / band) / 9;
        const y = h - Math.pow(p, 1.8) * h;
        ctx.globalAlpha = 0.05 + p * 0.09;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  {
    id: "dot-wave",
    name: "Kolom titik bergelombang sinus",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      ctx.fillStyle = withAlpha(palette.text, 0.14);
      const step = 54 * s;
      const off = mod(t * 18 * s, step);
      for (let x = -step; x < w + step; x += step) {
        for (let y = 0; y < h; y += step) {
          const yy = y + Math.sin((x + t * 40) * 0.008) * 26 * s;
          ctx.beginPath();
          ctx.arc(x + off, yy, 3 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    },
  },
  {
    id: "diag-stripes",
    name: "Garis diagonal paralel bergeser",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      ctx.strokeStyle = withAlpha(palette.text, 0.08);
      ctx.lineWidth = 10 * s;
      const gap = 90 * s;
      const off = mod(t * 10 * s, gap);
      for (let x = -h - gap; x < w + h; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x + off, 0);
        ctx.lineTo(x + off + h * 0.45, h);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  {
    id: "scanlines",
    name: "Garis CRT bergerak lambat",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      ctx.fillStyle = withAlpha(palette.text, 0.06);
      const step = 9 * s;
      const off = mod(t * 6 * s, step);
      for (let y = -step; y < h; y += step) ctx.fillRect(0, y + off, w, 3 * s);
      ctx.restore();
    },
  },
  {
    id: "starfield",
    name: "Bintang dua lapis parallax berkedip",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h, seed } = kit;
      const rng = mulberry32(seed >>> 0);
      ctx.save();
      for (let layer = 0; layer < 2; layer++) {
        const n = layer === 0 ? 60 : 30;
        const speed = layer === 0 ? 6 : 14;
        const base = layer === 0 ? 0.08 : 0.16;
        const r = (layer === 0 ? 1.6 : 2.6) * s;
        for (let i = 0; i < n; i++) {
          const x = rng() * w;
          const y0 = rng() * h;
          const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
          ctx.globalAlpha = base * (0.5 + tw * 0.5);
          ctx.fillStyle = withAlpha(palette.text, 1);
          ctx.beginPath();
          ctx.arc(x, mod(y0 + t * speed * s, h), r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    },
  },
  {
    id: "bokeh",
    name: "Lingkaran cahaya lembut naik",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h, seed } = kit;
      const rng = mulberry32(seed >>> 0);
      ctx.save();
      for (let i = 0; i < 14; i++) {
        const x = rng() * w;
        const y0 = rng() * h;
        const r = (30 + rng() * 70) * s;
        const speed = 8 + rng() * 18;
        const y = mod(y0 - t * speed * s, h + r * 2) - r;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, withAlpha(palette.text, 0.06));
        g.addColorStop(1, withAlpha(palette.text, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  },
  {
    id: "concentric",
    name: "Cincin konsentris berdenyut",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      ctx.strokeStyle = withAlpha(palette.text, 1);
      ctx.lineWidth = Math.max(1, s);
      const pulse = 1 + Math.sin(t * 1.4) * 0.04;
      const maxR = w * 0.62 * pulse;
      for (let i = 1; i <= 7; i++) {
        ctx.globalAlpha = 0.14 - i * 0.012;
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.42, (maxR * i) / 7, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  {
    id: "sunburst",
    name: "Berkas sinar dari atas berayun",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      ctx.translate(w / 2, -h * 0.05);
      ctx.rotate(Math.sin(t * 0.12) * 0.08);
      const rays = 14;
      for (let i = 0; i < rays; i++) {
        const a0 = (i / rays) * Math.PI;
        const a1 = a0 + (Math.PI / rays) * 0.6;
        ctx.fillStyle = withAlpha(palette.accent, i % 2 === 0 ? 0.05 : 0.03);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, h * 0.9, a0, a1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },
  },
  {
    id: "hex-mesh",
    name: "Jala heksagon bergeser",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      ctx.strokeStyle = withAlpha(palette.text, 0.08);
      ctx.lineWidth = Math.max(1, s);
      const R = 44 * s;
      const hexW = Math.sqrt(3) * R;
      const hexH = 1.5 * R;
      const off = mod(t * 6 * s, hexH);
      for (let row = -2; row * hexH < h + hexH * 2; row++) {
        for (let col = -2; col * hexW < w + hexW * 2; col++) {
          const cx = col * hexW + (row % 2 === 0 ? 0 : hexW / 2);
          const cy = row * hexH + off;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = Math.PI / 6 + (k / 6) * Math.PI * 2;
            const px = cx + Math.cos(a) * R;
            const py = cy + Math.sin(a) * R;
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.restore();
    },
  },
  {
    id: "topographic",
    name: "Garis kontur peta bergelombang",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      ctx.strokeStyle = withAlpha(palette.text, 0.1);
      ctx.lineWidth = Math.max(1, s);
      for (let ring = 1; ring <= 6; ring++) {
        const base = (ring / 6) * w * 0.55;
        ctx.beginPath();
        for (let a = 0; a <= 64; a++) {
          const ang = (a / 64) * Math.PI * 2;
          const wob = Math.sin(ang * 3 + ring + t * 0.3) * 16 * s + Math.sin(ang * 5 - ring) * 8 * s;
          const r = base + wob;
          const px = w / 2 + Math.cos(ang) * r;
          const py = h * 0.45 + Math.sin(ang) * r * 0.9;
          if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  {
    id: "circuit",
    name: "Jejak sirkuit dengan node berdenyut",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h, seed } = kit;
      const rng = mulberry32(seed >>> 0);
      ctx.save();
      ctx.strokeStyle = withAlpha(palette.secondary, 0.14);
      ctx.lineWidth = Math.max(1, s);
      for (let i = 0; i < 26; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const dx = (rng() * 2 - 1) * w * 0.12;
        const dy = (rng() * 2 - 1) * h * 0.08;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
        const glow = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.2 + i));
        ctx.fillStyle = withAlpha(palette.accent, 0.2 * glow);
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  },
  {
    id: "terminal-rain",
    name: "Hujan karakter biner ala terminal",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h, seed } = kit;
      const rng = mulberry32(seed >>> 0);
      ctx.save();
      ctx.font = Math.round(16 * s) + "px monospace";
      const colW = 34 * s;
      for (let c = 0; c * colW < w + colW; c++) {
        const speed = 40 + rng() * 120;
        const chars: string[] = [];
        for (let k = 0; k < 12; k++) chars.push((rng() * 2) < 1 ? "0" : "1");
        const head = mod(t * speed * s + c * 97, h + 200 * s);
        for (let k = 0; k < 12; k++) {
          const y = head - k * 20 * s;
          if (y < -20 || y > h + 20) continue;
          ctx.fillStyle = withAlpha(palette.text, k === 0 ? 0.32 : 0.13 * (1 - k / 12));
          ctx.fillText(chars[k], c * colW + 8 * s, y);
        }
      }
      ctx.restore();
    },
  },
  {
    id: "radar-sweep",
    name: "Sapuan radar dengan cincin",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      ctx.translate(w / 2, h * 0.42);
      ctx.strokeStyle = withAlpha(palette.text, 0.1);
      ctx.lineWidth = Math.max(1, s);
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, (i / 4) * w * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, 0);
      ctx.lineTo(w * 0.5, 0);
      ctx.moveTo(0, -w * 0.5);
      ctx.lineTo(0, w * 0.5);
      ctx.stroke();
      const ang = t * 0.9;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.5);
      g.addColorStop(0, withAlpha(palette.accent, 0.1));
      g.addColorStop(1, withAlpha(palette.accent, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, w * 0.5, ang - 0.5, ang);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "city-night",
    name: "Siluet skyline dua lapis dengan jendela menyala",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h, seed } = kit;
      const rng = mulberry32(seed >>> 0);
      const layers = [
        { alpha: 0.14, minH: 0.16, maxH: 0.34, wMin: 60, wMax: 130 },
        { alpha: 0.22, minH: 0.28, maxH: 0.5, wMax: 100, wMin: 40 },
      ];
      ctx.save();
      layers.forEach((L) => {
        ctx.fillStyle = withAlpha(palette.primary, L.alpha);
        let x = -20 * s;
        while (x < w + 20) {
          const bw = (L.wMin + rng() * (L.wMax - L.wMin)) * s;
          const bh = h * (L.minH + rng() * (L.maxH - L.minH));
          ctx.fillRect(x, h - bh, bw, bh);
          if (L.alpha > 0.2) {
          const cols = Math.max(1, Math.floor(bw / (14 * s)));
          const rows = Math.max(1, Math.floor(bh / (22 * s)));
          for (let wc = 0; wc < cols; wc++) {
            for (let wr = 0; wr < rows; wr++) {
              if ((wc + wr) % 3 !== 0) continue;
              const lit = 0.5 + 0.5 * Math.sin(t * 3 + wc * 2 + wr);
              ctx.fillStyle = withAlpha(palette.accent, 0.12 * lit);
              ctx.fillRect(x + 4 * s + wc * 14 * s, h - bh + 6 * s + wr * 22 * s, 4 * s, 6 * s);
            }
          }
          }
          x += bw + 4 * s;
        }
      });
      ctx.restore();
    },
  },
  {
    id: "aurora",
    name: "Pita aurora berlapis bergelombang",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      for (let band = 0; band < 3; band++) {
        const baseY = h * (0.12 + band * 0.09);
        const amp = h * 0.04;
        ctx.fillStyle = withAlpha(band === 1 ? palette.accent : palette.secondary, 0.06);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let x = 0; x <= w; x += 12 * s) {
          const y = baseY + Math.sin(x * 0.006 + t * 0.5 + band * 1.4) * amp + Math.sin(x * 0.017 - t * 0.3) * amp * 0.4;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },
  },
  {
    id: "waves",
    name: "Garis gelombang horizontal bergeser",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      ctx.strokeStyle = withAlpha(palette.text, 0.1);
      ctx.lineWidth = Math.max(1, s);
      const step = 70 * s;
      const off = mod(t * 12 * s, step);
      for (let row = 0; row * step < h + step; row++) {
        const y = row * step + off;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 14 * s) {
          const yy = y + Math.sin(x * 0.008 + row * 0.7 + t * 0.6) * 8 * s;
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  {
    id: "checker-fade",
    name: "Papan catur memudar ke bawah",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      const cell = 64 * s;
      const shift = Math.floor((t * 10 * s) / cell);
      for (let row = 0; row * cell < h; row++) {
        for (let col = 0; col * cell < w; col++) {
          if (((row + shift) + col) % 2 !== 0) continue;
          ctx.fillStyle = withAlpha(palette.text, 0.03 + Math.min(1, row / 10) * 0.05);
          ctx.fillRect(col * cell, row * cell, cell, cell);
        }
      }
      ctx.restore();
    },
  },
  {
    id: "halftone-burst",
    name: "Halftone membesar dari pusat ke tepi",
    draw: (ctx, kit) => {
      const { palette, scale: s, w, h } = kit;
      ctx.save();
      ctx.fillStyle = withAlpha(palette.text, 0.12);
      const step = 40 * s;
      const cx = w / 2;
      const cy = h * 0.42;
      for (let row = 0; row * step < h + step; row++) {
        for (let col = 0; col * step < w + step; col++) {
          const x = col * step + step / 2;
          const y = row * step + step / 2;
          const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
          const r = Math.max(0.6, (d / (h * 0.6)) * 6.5) * s;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    },
  },
  {
    id: "panel-stack",
    name: "Persegi panjang miring bertumpuk parallax",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h, seed } = kit;
      const rng = mulberry32(seed >>> 0);
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const pw = w * (0.5 + rng() * 0.35);
        const ph = h * (0.08 + rng() * 0.06);
        const x = rng() * (w - pw);
        const y = h * (0.08 + i * 0.15) + Math.sin(t * 0.5 + i) * 6 * s;
        ctx.save();
        ctx.translate(x + pw / 2, y + ph / 2);
        ctx.rotate(((rng() * 8 - 4) * Math.PI) / 180);
        ctx.fillStyle = withAlpha(i % 2 === 0 ? palette.primary : palette.accent, 0.05 + (i % 3) * 0.02);
        ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
        ctx.restore();
      }
      ctx.restore();
    },
  },
  {
    id: "arches",
    name: "Lengkungan berulang dari bawah",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      ctx.strokeStyle = withAlpha(palette.text, 0.09);
      ctx.lineWidth = Math.max(1, s);
      const step = 120 * s;
      const off = mod(t * 8 * s, step);
      for (let x = -step; x < w + step; x += step) {
        ctx.beginPath();
        ctx.arc(x + off, h, step * 0.62, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  {
    id: "memphis",
    name: "Bentuk memphis tersebar mengambang",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h, seed } = kit;
      const rng = mulberry32(seed >>> 0);
      ctx.save();
      ctx.lineWidth = Math.max(1.5, 2 * s);
      for (let i = 0; i < 16; i++) {
        const x = rng() * w;
        const y = rng() * h + Math.sin(t * 0.6 + i) * 8 * s;
        const kind = Math.floor(rng() * 3);
        const sz = (24 + rng() * 40) * s;
        ctx.strokeStyle = withAlpha(i % 3 === 0 ? palette.accent : palette.text, 0.14);
        if (kind === 0) {
          ctx.beginPath();
          for (let k = 0; k < 4; k++) {
            const zx = x + k * sz * 0.4;
            const zy = y + (k % 2 === 0 ? -sz * 0.3 : sz * 0.3);
            if (k === 0) ctx.moveTo(zx, zy); else ctx.lineTo(zx, zy);
          }
          ctx.stroke();
        } else if (kind === 1) {
          ctx.beginPath();
          ctx.arc(x, y, sz * 0.3, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + sz, y);
          ctx.lineTo(x + sz / 2, y - sz);
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.restore();
    },
  },
  {
    id: "paper-fold",
    name: "Garis lipatan kertas origami",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      ctx.strokeStyle = withAlpha(palette.primary, 0.06);
      ctx.lineWidth = Math.max(1, s * 1.5);
      for (let i = 0; i < 7; i++) {
        const y = h * (0.08 + i * 0.14);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w * (0.3 + (i % 3) * 0.2), y + h * 0.03 + Math.sin(t * 0.4 + i) * 4 * s);
        ctx.lineTo(w, y + h * 0.005);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo((w * i) / 4, 0);
        ctx.lineTo((w * (i + 1)) / 4, h);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  {
    id: "ink-splash",
    name: "Blob tinta organik berdenyut lembut",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h, seed } = kit;
      const rng = mulberry32(seed >>> 0);
      ctx.save();
      for (let i = 0; i < 7; i++) {
        const cx = rng() * w;
        const cy = rng() * h;
        const r = (40 + rng() * 90) * s;
        ctx.fillStyle = withAlpha(i % 2 === 0 ? palette.primary : palette.secondary, 0.05);
        ctx.beginPath();
        for (let a = 0; a <= 24; a++) {
          const ang = (a / 24) * Math.PI * 2;
          const rr = r * (0.7 + 0.3 * Math.sin(ang * 3 + i * 2 + t * 0.2));
          const px = cx + Math.cos(ang) * rr;
          const py = cy + Math.sin(ang) * rr;
          if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },
  },
  {
    id: "spotlight",
    name: "Kerucut sorot dari atas dengan lantai",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      ctx.translate(Math.sin(t * 0.5) * w * 0.03, 0);
      ctx.fillStyle = withAlpha(palette.primary, 0.05);
      ctx.beginPath();
      ctx.moveTo(w / 2, -h * 0.02);
      ctx.lineTo(w * 0.28, h * 0.78);
      ctx.lineTo(w * 0.72, h * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = withAlpha(palette.primary, 0.04);
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.78, w * 0.34, h * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "corner-frame",
    name: "Bracket sudut dan tick tepi ala HUD",
    draw: (ctx, kit) => {
      const { palette, scale: s, w, h } = kit;
      ctx.save();
      ctx.strokeStyle = withAlpha(palette.text, 0.18);
      ctx.lineWidth = Math.max(2, 3 * s);
      const m = 42 * s;
      const len = 64 * s;
      const corners: Array<[number, number, number, number]> = [
        [m, m, 1, 1],
        [w - m, m, -1, 1],
        [m, h - m, 1, -1],
        [w - m, h - m, -1, -1],
      ];
      for (const c of corners) {
        ctx.beginPath();
        ctx.moveTo(c[0] + c[2] * len, c[1]);
        ctx.lineTo(c[0], c[1]);
        ctx.lineTo(c[0], c[1] + c[3] * len);
        ctx.stroke();
      }
      ctx.lineWidth = Math.max(1, s);
      for (let y = m * 2; y < h - m; y += 90 * s) {
        ctx.beginPath();
        ctx.moveTo(m * 0.5, y);
        ctx.lineTo(m * 0.9, y);
        ctx.moveTo(w - m * 0.9, y);
        ctx.lineTo(w - m * 0.5, y);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  {
    id: "blueprint",
    name: "Grid teknik halus dengan marker silang",
    draw: (ctx, kit) => {
      const { palette, scale: s, w, h, seed } = kit;
      const rng = mulberry32(seed >>> 0);
      ctx.save();
      const step = 48 * s;
      for (let x = 0; x <= w; x += step) {
        ctx.strokeStyle = withAlpha(palette.text, (x / step) % 4 === 0 ? 0.1 : 0.05);
        ctx.lineWidth = Math.max(1, s);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += step) {
        ctx.strokeStyle = withAlpha(palette.text, (y / step) % 4 === 0 ? 0.1 : 0.05);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = withAlpha(palette.accent, 0.18);
      for (let i = 0; i < 6; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const c = 10 * s;
        ctx.beginPath();
        ctx.moveTo(x - c, y);
        ctx.lineTo(x + c, y);
        ctx.moveTo(x, y - c);
        ctx.lineTo(x, y + c);
        ctx.stroke();
      }
      ctx.strokeStyle = withAlpha(palette.secondary, 0.08);
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.42, w * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "noir-lines",
    name: "Garis kecepatan horizontal berjalan",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h, seed } = kit;
      const rng = mulberry32((seed + 7) >>> 0);
      ctx.save();
      ctx.strokeStyle = withAlpha(palette.text, 0.07);
      ctx.lineWidth = Math.max(1, s * 1.5);
      for (let i = 0; i < 40; i++) {
        const y = rng() * h;
        const len = w * 0.15 + rng() * w * 0.45;
        const x = rng() * (w - len);
        const drift = mod(t * (20 + i) * s, w + len) - len;
        ctx.beginPath();
        ctx.moveTo(x + drift, y);
        ctx.lineTo(x + drift + len, y);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  {
    id: "bubble-rise",
    name: "Gelembung outline naik perlahan",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h, seed } = kit;
      const rng = mulberry32(seed >>> 0);
      ctx.save();
      ctx.strokeStyle = withAlpha(palette.text, 0.1);
      ctx.lineWidth = Math.max(1, s);
      for (let i = 0; i < 18; i++) {
        const x = rng() * w;
        const y0 = rng() * h;
        const r = (8 + rng() * 26) * s;
        const speed = 12 + rng() * 26;
        ctx.beginPath();
        ctx.arc(x, mod(y0 - t * speed * s, h + r * 2) - r, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  {
    id: "triangle-mesh",
    name: "Segitiga outline berputar lambat",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h, seed } = kit;
      const rng = mulberry32(seed >>> 0);
      ctx.save();
      ctx.strokeStyle = withAlpha(palette.secondary, 0.12);
      ctx.lineWidth = Math.max(1, s);
      for (let i = 0; i < 14; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const sz = (26 + rng() * 60) * s;
        const rot = rng() * Math.PI + t * 0.08 * (i % 2 === 0 ? 1 : -1);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(0, -sz);
        ctx.lineTo(sz * 0.87, sz * 0.5);
        ctx.lineTo(-sz * 0.87, sz * 0.5);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    },
  },
  {
    id: "gradient-veil",
    name: "Selubung gradien aksen atas dan bawah",
    draw: (ctx, kit) => {
      const { palette, scale: s, t, w, h } = kit;
      ctx.save();
      const breathe = 0.8 + 0.2 * Math.sin(t * 0.5);
      const gTop = ctx.createLinearGradient(0, 0, 0, h * 0.35);
      gTop.addColorStop(0, withAlpha(palette.accent, 0.09 * breathe));
      gTop.addColorStop(1, withAlpha(palette.accent, 0));
      ctx.fillStyle = gTop;
      ctx.fillRect(0, 0, w, h * 0.35);
      const gBot = ctx.createLinearGradient(0, h, 0, h * 0.65);
      gBot.addColorStop(0, withAlpha(palette.primary, 0.07 * breathe));
      gBot.addColorStop(1, withAlpha(palette.primary, 0));
      ctx.fillStyle = gBot;
      ctx.fillRect(0, h * 0.65, w, h * 0.35);
      ctx.restore();
    },
  },
];

export const BACKDROP_IDS: string[] = BACKDROPS.map((b) => b.id);

export function backdropById(id: string): BackdropDef | undefined {
  return BACKDROPS.find((b) => b.id === id);
}

export function drawBackdropById(ctx: SKRSContext2D, id: string, kit: BackdropKit): boolean {
  const def = backdropById(id);
  if (!def) return false;
  ctx.save();
  try {
    def.draw(ctx, kit);
  } catch {
    // Backdrop adalah hiasan latar; kegagalannya tidak boleh menggagalkan
    // render - frame jatuh kembali ke latar polos palet.
  }
  ctx.restore();
  return true;
}
