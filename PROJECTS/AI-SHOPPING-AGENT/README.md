# AI-SHOPPING-AGENT

Video TikTok NAZE tentang asisten belanja AI (Douyin 5%/20%, JD.com 80 juta
pengguna). Bahasa Indonesia, tanpa musik latar, SFX dari vault repositori.

## Spesifikasi

- Rasio 9:16, standar render permanen NAZE: 1080x1920 @ 60 FPS CFR
  (permintaan awal 720x1280 @ 30 FPS disesuaikan ke standar, disetujui pengguna).
- Narasi: engine "file", rekaman manual pengguna
  `PROJECTS/speechma_audio_Remy Indonesian_at_5_25_49 PM_on_November_11th_2026.mp3`.
- Style: `editorial-kinetic`, palet gelap hitam dominan dengan neon green
  (#00FF88), cyan (#00D9FF), putih (#F5F7FA), orange (#FF8A00).
- ccStyle: `glitch-scan` (caption adaptif, maksimal 2 baris, burn-in).
- Backdrop: spotlight, circuit, panel-stack, blueprint, concentric, hex-mesh,
  noir-lines, corner-frame.
- Ilustrasi orisinal prosedural per scene; 4 objek baru ditambahkan ke engine:
  `assistant` (asisten AI holografik), `cart` (keranjang + konfirmasi checkout),
  `network` (jaringan pengguna - AI), `screen` (layar besar pemilihan produk).
- Tidak ada stock footage atau foto orang sungguhan.

## Pemetaan struktur yang diminta ke skema engine

Permintaan folder `assets/`, `audio/`, `subtitles/`, `renders/`, `final.mp4`
diadaptasi ke skema engine yang sudah berjalan:

- Konfigurasi scene/layers/SFX: `project.json`
- Dokumentasi narasi + pemetaan SFX: `narration.md`
- Audio narasi: MP3 unggahan pengguna di `PROJECTS/` (direferensikan langsung)
- Subtitle: dibuat otomatis oleh Adaptive Caption Engine (burn-in)
- Render: GitHub Actions workflow `.github/workflows/render.yml`, hasil MP4
  tersedia sebagai artifact CI `naze-render-all` (`dist/AI-SHOPPING-AGENT/AI-SHOPPING-AGENT.mp4`)

## Render

Push ke `main` memicu render otomatis proyek aktif `AI-SHOPPING-AGENT`
(12 pemeriksaan validasi otomatis + verifikasi ffprobe). Log kegagalan
dikomit ke branch `render-logs/<runId>-<attempt>`.
