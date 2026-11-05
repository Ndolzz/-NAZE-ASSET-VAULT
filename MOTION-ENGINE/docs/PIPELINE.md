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
ulang tanpa perubahan kode.

## Audio

Narasi selalu dominan (`alimiter` pada mix final). SFX dimainkan pada waktu
visual tertentu dengan `adelay`; sumber SFX adalah vault repositori
(`AUDIO/SFX/DIGITAL`, `AUDIO/SFX/IMPACT`, `AUDIO/SFX/INTERFACE`). Musik latar
tidak pernah ditambahkan secara otomatis; hanya jika `musicFile` diisi secara
eksplisit.

## GitHub Actions

`.github/workflows/render.yml` merender melalui `workflow_dispatch` dengan
input `project` dan `profile`, atau otomatis saat file proyek atau engine
berubah: pada push, seluruh proyek (STYLE-SHOWCASE dan DARK-WEB) dirender
berurutan, masing-masing dengan ffprobe, verifikasi laporan 12 titik, dan
log diagnostik otomatis saat gagal (ringkasan langkah, cabang
`render-logs/<run>`, artifact log). Hasil diunggah sebagai artifact
`naze-render-all`.

## Validasi

Dua belas pemeriksaan wajib dijalankan pada setiap render (lihat
`src/validation/validate.ts`). Jika satu saja gagal, render dinyatakan
gagal dan penyebabnya ditampilkan; pipeline keluar dengan kode error.
