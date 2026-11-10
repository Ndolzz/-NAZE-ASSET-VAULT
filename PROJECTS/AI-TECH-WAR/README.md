# AI-TECH-WAR

Dokumenter teknologi: "PERANG AI AMERIKA VS TIONGKOK: SIAPA YANG MENGUASAI MASA DEPAN?"

## Struktur proyek

Proyek mengikuti skema engine `naze-project/2.0` agar dapat dirender ulang oleh
NAZE Motion Engine dan CI:

- `project.json` - seluruh definisi video (scene, layer, kamera, SFX, palet, CC).
- `narration.md` - teks narasi per scene dan pemetaan SFX.
- Rekaman narasi: `PROJECTS/proyek baru/speechma_audio_Remy Indonesian_at_8_59_52 PM_on_November_10th_2026.mp3`
  (dibiarkan di lokasi unggahan asli; berkas biner tidak dipindah via API).
- Output render (MP4, SRT, VTT, render-report.json) dihasilkan GitHub Actions
  sebagai artifact `naze-render-all`, bukan disimpan di repositori.

## Identitas visual

- Style: `editorial-kinetic` (jalur berlapis: layers, null object, camera rig).
- Palet: latar #050505, cyan #00D9FF (primary), hijau neon #00FF88 (secondary),
  merah #FF4444 (accent), putih #F5F7FA (text). Tervalidasi WCAG rumus engine
  (teks/latar 18,99; aksen/latar 5,98; luminansi aksen 0,258; satu-satunya peran
  bernada biru adalah cyan).
- Backdrop per scene: circuit, blueprint, city-night, radar-sweep, hex-mesh,
  dot-wave, starfield, spotlight.
- textStyle per scene: ink-slam, terminal-code, headline-break, stamp-red,
  stencil-track, signal-flash, ticker-scroll, final-cut.
- CC adaptif: `captions.ccStyle: "glitch-scan"`, burn-in, maksimal 2 baris.

## Spesifikasi output

- 1080x1920 (9:16), 60 FPS CFR standar NAZE (permintaan 30 FPS diturunkan ke
  standar permanen; konfigurasi proyek tidak dapat melanggar naze.policy.json),
  H.264/yuv420p, AAC, MP4 faststart. Bahasa Indonesia, tanpa musik latar.

## Render ulang

- Otomatis: push apa pun ke jalur PROJECTS/**, MOTION-ENGINE/**, kebijakan, atau
  workflow ini memicu `.github/workflows/render.yml` (proyek aktif: AI-TECH-WAR).
- Manual: tab Actions, jalankan "NAZE Render" dengan input project=AI-TECH-WAR,
  profile=vertical-1080. Hasil di artifact `naze-render-all`.

## Validasi

12 pemeriksaan otomatis engine + ffprobe di CI. Render gagal bila ada satu saja
pelanggaran (termasuk narasi tanpa CC). Override hanya via `--explicit-override`.
