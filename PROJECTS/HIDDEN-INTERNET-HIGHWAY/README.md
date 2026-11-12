# HIDDEN-INTERNET-HIGHWAY

Video edukasi teknologi sinematik NAZE: jalan raya tersembunyi kabel fiber
optik bawah laut. 10 scene, format vertikal 1080x1920 @ 60 FPS CFR, tanpa musik
latar (narasi + 60 event SFX dari vault).

## Struktur

- `project.json` - konfigurasi proyek (scene, layers, camera, captions, SFX)
- `narration.md` - teks narasi per scene + pemetaan SFX + status konfirmasi
- Audio narasi: `PROJECTS/speechma_audio_Remy Indonesian_at_5_50_51 PM_on_November_12th_2026.mp3`
  (unggahan pengguna, tidak dipindahkan; `narration.engine: "file"`)

Output render: artifact CI `naze-render-all` pada workflow render.yml
(proyek aktif: HIDDEN-INTERNET-HIGHWAY).

## Sistem warna (patuh COLOR-LIBRARY)

Sesuai kebijakan warna wajib, semua warna berasal dari katalog COLOR-LIBRARY:

- `colorSystem.paletteId`: `fut-aurora` (katalog solid-palettes, kategori
  dark/futuristic, mode dark)
- Peran palet: background #080b16 (background.base, warna katalog paling
  gelap mendekati hitam murni), primary #00e5ff, secondary #f59e0b,
  accent #b2ff59 (neon green asli palet), text #e9f0ff
- `colorSystem.overrides`: primary #00e5ff (cyan elektrik, token brand.accent
  katalog neon-night), secondary #f59e0b (oranye, token brand.accent katalog
  tech-slate). Kedua nilai adalah warna katalog yang terdaftar.
- `gradientIds`: grad-deep-space, grad-ocean-depth
- `typographyId`: type-chrome

Trade-off: engine membatasi maksimal satu peran bernada biru, sehingga cyan
dan electric blue digabung menjadi satu primary #00e5ff. Oranye (secondary)
dan hijau neon (accent) menjaga palet tidak serba biru.

## Scene dan tipografi

| Scene | Judul | Backdrop | TextStyle utama | Ilustrasi prosedural |
|---|---|---|---|---|
| 1 DIGITAL WORLD | EVERYTHING IS CONNECTED | starfield | signal-flash | earth, phone |
| 2 THE HIDDEN NETWORK | THE HIDDEN INTERNET | waves | stencil-track | submarine-cable, gauge |
| 3 GLOBAL CONNECTION | GLOBAL SUBMARINE CABLE NETWORK | blueprint | headline-break | cable-map, earth |
| 4 99 PERCENT | 99% INTERNATIONAL DATA TRAFFIC | concentric | stencil-track, ticker-scroll | fiber-core, chart |
| 5 FIBER OPTIC TECHNOLOGY | LIGHT CARRIES DATA | circuit | terminal-code | fiber-core, submarine-cable |
| 6 THE THREAT | ONE CABLE. GLOBAL IMPACT. | radar-sweep | stamp-red | cargo-ship, anchor |
| 7 CABLE DAMAGE | CONNECTION LOST | scanlines | ink-slam | broken-cable, anchor, chart |
| 8 REPAIR OPERATION | UNDERWATER REPAIR OPERATION | dot-wave | terminal-code | repair-ship, network |
| 9 FINAL REVEAL | THE WORLD IS CONNECTED | topographic | headline-break | cable-map, earth |
| 10 NAZE | NAZE | spotlight | final-cut | rocket |

Ilustrasi prosedural baru ditambahkan ke
`MOTION-ENGINE/src/illustration/generator.ts` (murni penambahan case, tanpa
mengubah case lama): earth, submarine-cable, cable-map, fiber-core,
cargo-ship, anchor, broken-cable, repair-ship.

CC: `captions.ccStyle: "glitch-scan"` (Adaptive Caption Engine + smart
placement camera-aware). Style: `editorial-kinetic`, jalur komposisi berlapis
(layers parent-child, null object, transform tracks, camera shots per scene).
