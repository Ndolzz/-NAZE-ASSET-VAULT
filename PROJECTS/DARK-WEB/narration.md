# DARK-WEB — Restyle NAZE v2

## Ringkasan

Proyek lama (720x1280 @30 FPS, teks statis drawtext, musik latar otomatis,
jalur Termux) direstyle penuh dengan NAZE Motion Engine v2:

- Standar permanen: 1080x1920 @ 60 FPS CFR, H.264/yuv420p, AAC, MP4.
- Gaya: `dark-web-cyber` (custom, terdaftar otomatis saat render) — identitas
  merek dari `VISUAL/brand.txt`: latar #050505, primer hijau-neon #00FF88,
  sekunder sian #00D9FF, aksen merah #FF3B3B, font Orbitron.
- Ilustrasi orisinal prosedural di setiap scene (kebijakan wajib).
- CC tersinkronisasi, maksimal 2 baris, sidecar SRT + VTT, burn-in.
- SFX dari vault repositori (AUDIO/SFX/DIGITAL, IMPACT, INTERFACE); tanpa
  musik latar otomatis.

## Narasi (Engine "file" — suara manual)

Rekaman suara: `AUDIO/VOICE/narration.mp3` (rekaman lama proyek ini).
Pipeline memutar rekaman secara utuh dan menaksir durasi tiap cue CC dari
bobot teks. PENTING: teks di bawah direkonstruksi dari SOUND_TIMELINE.txt
lama dan harus dicek terhadap isi rekaman; bila berbeda, perbaiki teks
scene di `project.json` lalu render ulang.

1. scene-1 — "Pernah membayangkan ada bagian internet yang tidak bisa kamu
   temukan melalui Google?"
2. scene-2 — "Namanya Dark Web. Sebuah bagian internet yang hanya bisa
   diakses dengan perangkat dan konfigurasi khusus."
3. scene-3 — "Di dalamnya, identitas pengguna bisa disamarkan."
4. scene-4 — "Ada forum tersembunyi, komunitas anonim, hingga aktivitas
   ilegal."
5. scene-5 — "Tapi tidak semua isi Dark Web adalah kejahatan. Jurnalis,
   aktivis, dan orang-orang yang menjunjung privasi menggunakannya."
6. scene-6 — "Ini adalah sisi lain internet yang tidak ingin diketahui
   orang."
7. scene-7 — "Dark Web bukan sekadar tempat misterius. Explore beyond the
   screen."

Untuk suara baru: kirim berkas audio lewat chat, simpan sebagai
`PROJECTS/<NAMA>/AUDIO/VOICE/narration.mp3` (atau isi `narration.file`),
lalu render ulang. Sinkronisasi per-cue presisi dapat dilakukan dengan
menyediakan berkas per cue; saat ini taksiran berbasis teks sudah memadai
untuk narasi berirama stabil.

## Pemetaan SFX (desain suara lama -> vault)

| Fungsi lama | Berkas vault |
| --- | --- |
| data scan | AUDIO/SFX/DIGITAL/laser_1.ogg |
| riser ketegangan | AUDIO/SFX/DIGITAL/phaser_up_*.ogg |
| transisi sweep / whoosh | AUDIO/SFX/DIGITAL/high_up.ogg, phaser_down_1.ogg |
| reverse sweep | AUDIO/SFX/DIGITAL/low_down.ogg |
| bass impact / boom | AUDIO/SFX/IMPACT/impact_punch_heavy_*.ogg |
| kilau akhir | AUDIO/SFX/DIGITAL/pep_sound_1.ogg |
| noise statis / glitch | AUDIO/SFX/INTERFACE/glitch_*.wav, DIGITAL/zap_1.ogg |

Tick, maximize, switch, error, pluck, confirmation, dan impact
lainnya memakai nama yang sama seperti desain lama (folder INTERFACE dan
IMPACT).
