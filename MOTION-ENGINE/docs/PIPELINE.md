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
  "name": "STYLE-SHOWCASE",
  "style": "colorful-editorial",
  "palette": "sunset-editorial",
  "profile": "vertical-1080",
  "animationIntensity": 1,
  "accentWords": true,
  "burnInCc": true,
  "narration": { "engine": "espeak-ng", "language": "id", "speed": 145 },
  "scenes": [
    {
      "id": "scene-1",
      "title": "Ilustrasi Wajib",
      "narration": "Setiap video NAZE menggunakan ilustrasi orisinal.",
      "subjects": [
        { "kind": "character", "mood": "happy" },
        { "kind": "object", "name": "palette-swatch" }
      ],
      "sfx": [{ "file": "AUDIO/SFX/IMPACT/impact_punch_medium_000.ogg", "volume": 0.5, "at": 0.15 }]
    }
  ]
}
```

Jenis subjek ilustrasi: `character` (mood), `object` (rocket, brain,
lightbulb, phone, palette-swatch, gauge, globe, shield, star, chart),
`chart` (data), dan `icon` (name). Setiap scene wajib memiliki minimal
satu subjek - scene hanya-teks ditolak oleh kebijakan.

## Narasi dan CC

Narasi disintesis per cue CC lalu diukur dengan ffprobe, sehingga durasi
caption mengikuti durasi pengucapan nyata. SRT dan VTT ditulis sebagai
sidecar; CC juga diburn-in pada frame dengan pil semi-transparan, maksimal
dua baris, dan tidak menutupi area ilustrasi utama (posisi bawah, aman).

Mesin sintesis `espeak-ng` adalah penyedia demo untuk CI. Untuk kualitas
produksi, ganti tahap sintesis dengan TTS eksternal (lihat
`src/audio/narration.ts`); antarmuka `NarrationConfig.engine` siap
diperluas.

## Audio

Narasi selalu dominan (`alimiter` pada mix final). SFX dimainkan pada waktu
visual tertentu dengan `adelay`. Musik latar tidak pernah ditambahkan
secara otomatis; hanya jika `musicFile` diisi secara eksplisit.

## GitHub Actions

`.github/workflows/render.yml` merender melalui `workflow_dispatch` dengan
input `project` dan `profile`, atau otomatis saat file proyek berubah.
Hasil (`dist/**`, tanpa direktori kerja) diunggah sebagai artifact dan
diperiksa dengan ffprobe sebelum diunggah.

## Validasi

Dua belas pemeriksaan wajib dijalankan pada setiap render (lihat
`src/validation/validate.ts`). Jika satu saja gagal, render dinyatakan
gagal dan penyebabnya ditampilkan; pipeline keluar dengan kode error.
