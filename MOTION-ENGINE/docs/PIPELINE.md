# Pipeline Produksi NAZE

## Perintah Render

Dari direktori `MOTION-ENGINE`:

```bash
npx tsx src/cli.ts render ../PROJECTS/STYLE-SHOWCASE \
  --out ../dist/STYLE-SHOWCASE \
  --profile vertical-1080
```

Opsi:

- `--out <dir>` - direktori output (MP4, SRT, VTT, render-report.json).
- `--profile <id>` - `vertical-1080` (default), `vertical-1440`, `vertical-2160`.
- `--policy <file>` - berkas kebijakan (default `naze.policy.json` di root).
- `--explicit-override "alasan"` - satu-satunya cara melewati pelanggaran
  kebijakan; alasan tercatat di render report.

## Struktur Proyek

```json
{
  "schema": "naze-project/2.0",
  "name": "DARK-WEB",
  "style": "cyberpunk-multicolor",
  "palette": { "background": "#050505", "primary": "#00FF88", "secondary": "#00D9FF", "accent": "#FF3B3B", "text": "#F5F7FA", "dark": true },
  "profile": "vertical-1080",
  "narration": { "engine": "file", "file": "PROJECTS/DARK-WEB/AUDIO/VOICE/narration.mp3", "language": "id" },
  "scenes": [
    {
      "id": "scene-1",
      "title": "INTERNET TERSEMBUNYI",
      "narration": "Pernah membayangkan ada bagian internet yang tidak bisa kamu temukan melalui Google?",
      "subjects": [
        { "kind": "object", "name": "globe" },
        { "kind": "icon", "name": "scan" }
      ],
      "sfx": [{ "file": "AUDIO/SFX/INTERFACE/switch_001.wav", "volume": 0.45, "at": 0.5 }]
    }
  ]
}
```

- `style`: id gaya builtin, `[primaryId, ...accentIds]`, atau objek `StyleDef`
  lengkap (gaya kustom per proyek; otomatis terdaftar saat render).
- `palette`: id preset, atau objek palet kustom (semua peran hex wajib).
- Jenis subjek ilustrasi: `character` (mood), `object` (rocket, brain,
  lightbulb, phone, palette-swatch, gauge, globe, shield, star, chart),
  `chart` (data), dan `icon` (name). Setiap scene wajib memiliki minimal
  satu subjek - scene hanya-teks ditolak oleh kebijakan.
- Scene dapat mendefinisikan `layers` dan `camera` (sistem Editorial Kinetic
  Motion; lihat bagian Art Direction di bawah).

## Narasi dan CC

Dua engine narasi:

1. `espeak-ng` (demo CI): setiap cue CC disintesis lalu diukur dengan ffprobe,
   sehingga durasi caption mengikuti pengucapan nyata secara presisi.
2. `file` (suara manual): proyek menyediakan satu rekaman suara utuh
   (`narration.file`, path relatif repositori; default
   `PROJECTS/<NAMA>/narration.mp3`). Rekaman diputar dari 0,25 detik dan
   durasi tiap cue ditaksir dari bobot teks, lalu scene disusun rapat
   mengikuti rekaman. Teks narasi di `project.json` harus sama dengan isi
   rekaman; bila berbeda, perbaiki teksnya lalu render ulang.

Untuk kedua engine, trek narasi dirakit pada posisi timeline final
(`assembleNarrationTrack`): jeda antar-scene menjadi sunyi, bukan drift, jadi
narasi, CC burn-in, SFX, dan video selalu sejajar. SRT dan VTT ditulis
sebagai sidecar; CC diburn-in maksimal dua baris dan tidak menutupi area
ilustrasi utama.

Suara produksi dikirim manual lewat chat per proyek: simpan sebagai
`PROJECTS/<NAMA>/AUDIO/VOICE/narration.mp3`, isi `narration.file`, dan render
ulang tanpa perubahan kode. Karena chat hanya meneruskan transkripsi (bukan
byte audio), praktik termudah adalah mengunggah berkas MP3 langsung ke
repositori melalui antarmuka web GitHub pada jalur tersebut; push unggahan
tersebut otomatis memicu render ulang.

## Audio

Narasi selalu dominan (`alimiter` pada mix final). SFX dimainkan pada waktu
visual tertentu dengan `adelay`; sumber SFX adalah vault repositori
(`AUDIO/SFX/DIGITAL`, `AUDIO/SFX/IMPACT`, `AUDIO/SFX/INTERFACE`). Musik latar
tidak pernah ditambahkan secara otomatis; hanya jika `musicFile` diisi secara
eksplisit.

## GitHub Actions

`.github/workflows/render.yml` merender melalui `workflow_dispatch` dengan
input `project` dan `profile`, atau otomatis saat file proyek atau engine
berubah: pada push, seluruh proyek (STYLE-SHOWCASE, DARK-WEB, dan
AI-CYBERSECURITY) dirender berurutan, masing-masing dengan ffprobe,
verifikasi laporan 12 titik, dan log diagnostik otomatis saat gagal
(ringkasan langkah, cabang `render-logs/<run>`, artifact log). Hasil diunggah
sebagai artifact `naze-render-all`.

## Validasi

Dua belas pemeriksaan wajib dijalankan pada setiap render (lihat
`src/validation/validate.ts`). Jika satu saja gagal, render dinyatakan
gagal dan penyebabnya ditampilkan; pipeline keluar dengan kode error.

## Art Direction: Editorial Kinetic Motion (identitas permanen)

Sejak November 2026, **Editorial Kinetic Motion** adalah art direction permanen NAZE: tipografi sebagai elemen visual utama, desain grafis editorial kontras tinggi, layer compositor, dan camera rig. Style lain tetap tersedia sepenuhnya; setiap produksi bebas memilih arah visualnya.

- Style bawaan: `editorial-kinetic` (style 18), palet `editorial-ink` (kertas #F2F0EB, tinta #111111, aksen merah #E63B2E).
- Digunakan oleh: **AI-CYBERSECURITY** (perbaikan penuh).
- Opt-in per scene: aktif bila style memiliki `motion.system = "editorial-kinetic"`, atau scene mendefinisikan `layers` / `camera`. Path komposisi klasik tidak berubah.

### Layer compositor (per scene, field `layers`)

Setiap layer: `id`, `kind` (typography, panel, card, cutout, colorblock, grid, shape, halftone, subject, null), `box` [x, y, w, h] ternormalisasi 0..1, `parent` (parent-child / null object), `z` (kedalaman parallax), `fill` (peran palet: text, primary, secondary, accent, background, invert; atau #hex), `mask` ({shape: rect, circle, band; inset}), `subjectIndex`, `shape` (rect, circle, triangle, bar, ring, stripe), `underline`, `seed`, `spinSpeed`, `rotate`, `transform`, `enter`.

- `transform`: track per properti (x, y, rotate, scale, alpha, skew, blur), masing-masing array keyframe [{t, value, easing}].
- `enter`: {type: slideL, slideR, rise, pop, spin, wipe, none; at, dur, ease}. Tanpa `at`, stagger otomatis per indeks layer.
- Anak layer memakai koordinat absolut kanvas; transformasi parent berporos pada pusat parent (alur kerja null object ala Alight Motion).

Mode tipografi (`kind: typography`, field `mode`): `oversized`, `stacked`, `splitWords`, `rotating`, `perspective`, `maskReveal`, `collage`.

### Camera rig (per scene, field `camera`)

`shots`: array [{at, zoom, panX, panY, rotate, dolly, track, ease}]. `track` mengikuti layer mana pun berdasarkan `id`; `dolly` (0..1) mengatur kekuatan tarikan. Tanpa shots, kamera default push-in lembut. Nilai di-clamp aman (zoom 0.6-2.4, pan ±0.4, roll ±12 derajat).

### Transisi grafis

Transisi baru: `textWipe`, `rotationWhip`, `maskSlide`, `matchCut`; seluruh transisi klasik tetap tersedia (dissolve, slidePush, wipe, zoomDissolve, panelSwipe, shapeWipe). Produksi editorial tidak mengulang fade sederhana.

### Aturan art direction

1. Tipografi adalah elemen visual utama; setiap scene memiliki satu focal point yang jelas.
2. Kontras tinggi, bentuk grafis tebal, asimetri, halftone, panel berlapis, kartu miring.
3. Aksen warna sesuai topik; biru tidak boleh dominan.
4. Logo resmi hanya jika tersedia secara legal; tidak ada logo acak sebagai dekorasi.
5. Path komposisi klasik tidak berubah; sistem ini opt-in per scene.
