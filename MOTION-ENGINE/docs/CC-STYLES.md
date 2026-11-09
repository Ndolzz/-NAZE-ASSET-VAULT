# Pustaka Gaya CC NAZE

40 preset closed caption reusable untuk Adaptive Caption Engine. Setiap
preset memaketkan tipe caption, pola penempatan yang berganti per cue
(bawah, atas, tengah, apung, sudut, samping, layar penuh), animasi masuk
dari 20 preset engine, tema visual dari 9 preset tema, dan kekuatan
kamera pengikut CC (kamera rig bergeser halus mengikuti perpindahan
zona CC pada scene yang sudah memiliki camera).

## Penggunaan

Satu baris pada project.json:

```json
"captions": { "ccStyle": "midnight-orbit" }
```

Pipeline Stage 6 otomatis:

1. Mengaktifkan mode CC adaptif (pil klasik bawah tidak lagi dipakai).
2. Membangkitkan direktif per cue (tipe, posisi berotasi, animasi, tema)
   untuk setiap scene yang belum punya direktif manual scene.captions;
   direktif manual selalu dihormati dan tidak ditimpa.
3. Menyuntikkan shot kamera pengikut saat zona CC berpindah (maksimal 4
   per scene, jarak minimal 2 detik, hanya pada scene dengan camera rig).

Penempatan tetap dijaga solver adaptif: tabrakan dengan wilayah penting
(wajah, subjek, judul) dihindari dan safe area TikTok/Reels dihormati.

## Katalog

| # | Id | Nama | Tipe | Pola posisi | Animasi | Tema | Kamera |
|---|---|---|---|---|---|---|---|
| 1 | `midnight-orbit` | Orbit Malam | editorial-subtitle | bottom -> top -> float | fade-up | minimal-dark | 0.5 |
| 2 | `ink-slide` | Geser Tinta | subtitle | bottom -> top | slide-up | editorial | 0.45 |
| 3 | `signal-bounce` | Pantulan Sinyal | emphasis | center -> bottom | scale-bounce | impact | 0.5 |
| 4 | `alert-shake` | Guncangan Waspada | impact | center -> top | shake | impact | 0.6 |
| 5 | `glitch-scan` | Pindai Glitch | kinetic | center -> top | glitch | tech | 0.55 |
| 6 | `terminal-type` | Ketikan Terminal | instruction | left -> right | typewriter | tech | 0.4 |
| 7 | `headline-word` | Kata Headline | kinetic | center | word-reveal | editorial | - |
| 8 | `ticker-top` | Ticker Atas | top-subtitle | top -> bottom | slide-down | documentary | 0.5 |
| 9 | `drift-float` | Apung Tenang | floating-caption | float -> center | smooth-floating | minimal-dark | 0.35 |
| 10 | `corner-patrol` | Patroli Sudut | corner-caption | corner-bl -> corner-tr -> corner-tl -> corner-br | pop-in | minimal-dark | 0.55 |
| 11 | `notify-stream` | Aliran Notifikasi | notification-bubble | corner-tr -> corner-tl | slide-right | tech | 0.5 |
| 12 | `side-story` | Cerita Samping | side-annotation | right -> left | fade-in | data | 0.45 |
| 13 | `split-focus` | Fokus Belah | split-caption | center -> top | split-reveal | editorial | 0.5 |
| 14 | `center-stage` | Panggung Tengah | center-caption | center | fade-in | minimal-dark | - |
| 15 | `banner-bottom` | Spanduk Bawah | subtitle | bottom | slide-up | minimal-dark | - |
| 16 | `top-lamp` | Lampu Atas | top-subtitle | top | fade-down | minimal-dark | 0.3 |
| 17 | `elastic-pop` | Pop Elastis | emphasis | center -> top | elastic | impact | 0.5 |
| 18 | `soft-reveal` | Ungkap Lembut | subtitle | bottom -> float | mask-reveal | documentary | 0.4 |
| 19 | `blur-focus` | Fokus Kabur | center-caption | center -> bottom | blur-reveal | minimal-dark | 0.45 |
| 20 | `char-stream` | Aliran Karakter | instruction | left -> bottom | character-reveal | tech | - |
| 21 | `comic-punch` | Pukulan Komik | impact | center -> top | overshoot | comic | 0.5 |
| 22 | `gold-instruction` | Instruksi Emas | instruction | left -> bottom | fade-up | instruction | 0.4 |
| 23 | `docu-note` | Catatan Dokumenter | subtitle | bottom -> top | fade-in | documentary | 0.5 |
| 24 | `neon-pop` | Pop Neon | emphasis | center -> float | pop-in | tech | 0.45 |
| 25 | `wide-stack` | Tumpukan Lebar | editorial-subtitle | bottom -> top -> center | slide-left | editorial | 0.55 |
| 26 | `jump-cut` | Lompatan Potret | floating-caption | float -> bottom -> top | pop-in | minimal-dark | 0.6 |
| 27 | `wave-slide` | Gelombang Geser | subtitle | bottom -> top | slide-right | minimal-dark | 0.5 |
| 28 | `ping-pong` | Bolak-Balik | top-subtitle | top -> bottom | slide-up | data | 0.55 |
| 29 | `spotlight-center` | Sorotan Tengah | impact | center | fade-up | impact | - |
| 30 | `zoom-word` | Kata Zoom | kinetic | center -> float | scale-bounce | editorial | 0.45 |
| 31 | `left-diary` | Buku Harian Kiri | left-caption | left -> bottom | fade-up | editorial | 0.4 |
| 32 | `right-memo` | Memo Kanan | right-caption | right -> top | fade-in | data | 0.4 |
| 33 | `full-bleed` | Penuh Layar | fullscreen-typography | fullscreen | word-reveal | impact | - |
| 34 | `shadow-rise` | Naik Bayangan | subtitle | bottom -> float -> top | fade-up | minimal-dark | 0.5 |
| 35 | `accent-frame` | Bingkai Aksen | center-caption | center -> bottom | pop-in | minimal-dark | 0.45 |
| 36 | `retro-scan` | Pindai Retro | top-subtitle | top -> float | typewriter | tech | 0.45 |
| 37 | `soft-bounce` | Pantul Lembut | emphasis | float -> center | scale-bounce | minimal-dark | 0.4 |
| 38 | `dual-zone` | Zona Ganda | split-caption | center -> bottom | split-reveal | minimal-dark | 0.5 |
| 39 | `hard-cut` | Potongan Keras | impact | top -> center -> bottom | fade-in | impact | 0.65 |
| 40 | `orbit-mega` | Orbit Besar | kinetic | center -> top -> bottom | mask-reveal | editorial | 0.6 |

## Aturan desain

1. Keterbacaan diutamakan: maksimal 2 baris, kontras ditegakkan otomatis.
2. Rotasi posisi deterministik per cue (indeks modulo) - hasil identik
   pada setiap render.
3. Kamera pengikut hanya bergeser saat zona berubah dan membawa state
   kamera karya asli, sehingga jalur kamera author tetap mulus.
4. Id tak dikenal tidak menggagalkan render; CC adaptif berjalan polos.
