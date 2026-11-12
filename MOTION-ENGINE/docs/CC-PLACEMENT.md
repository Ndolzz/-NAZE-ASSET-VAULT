# CC Placement: Camera-Aware Tracking & Intelligent Placement

Dokumen teknis untuk revisi sistem penempatan CC (caption) pada Motion Engine.

## Akar masalah (hasil audit)

1. `captions/engine.ts` memecahkan penempatan ulang setiap frame tanpa memori antar frame: posisi dapat melompat saat skor berubah; tidak ada smoothing, histeresis, maupun recovery.
2. `captions/layout.ts` hanya menyediakan slot layar statis (bottom/top/corner/float/anchor). Kamera tidak memengaruhi caption tanpa anchor, sehingga CC terlihat "ditempel" saat kamera bergerak.
3. `SceneMeta.camera` (zoom, panX, panY, rotateDeg) tidak pernah dipakai solver.
4. Tidak ada analisis ruang kosong; solver hanya menghukum tabrakan. Wajah hanya penalti bobot 10, bukan larangan keras.
5. Tidak ada mekanisme recovery saat anchor hilang; `resolveAnchor` diam-diam jatuh ke `anchors[0]`.

## Pendekatan tracking: transformasi koordinat analitik

Engine merender secara prosedural (layer dan kamera diketahui pasti setiap frame), sehingga optical flow atau feature tracking tidak diperlukan. Modul `captions/tracking.ts` memakai:

1. Transform maju adegan ke layar (`cameraToScreen`): rotasi di sekitar pusat, skala zoom, translasi pan. Identik dengan transform layer-compositor dan `anchors.ts`.
2. Transform balik (`cameraScreenToScene`): invers eksaknya, memetakan titik layar kembali ke ruang adegan.
3. Anchor adegan: setelah solver memilih posisi awal, pusat CC disimpan dalam ruang adegan (normalized). Setiap frame titik itu diproyeksikan ulang dengan kamera frame tersebut, sehingga CC mengikuti pan/tilt/zoom/rotasi/dolly secara eksak tanpa lag dan tanpa jitter (proyeksi analitik bersifat deterministik dan mulus).
4. Caption ber-anchor (bubble/anotasi) tetap mengikuti anchor bergerak lewat kandidat layout, kini dengan smoothing dan batas kecepatan.

## Sistem penempatan

### Ruang kosong cerdas (negative space)

- `buildSpaceGrid`: grid 12x20 berbobot dari `SceneMeta.regions` (wajah 10, subjek 3, judul 4, grafis 1.2).
- `negativeSpaceCandidates`: pita baris sel bebas (bobot di bawah 1.0) diperluas menjadi kotak; kotak CC diletakkan di kiri/tengah/kanan run. Preferensi naik bila kandidat sejajar dengan span subjek/wajah sehingga CC memilih sisi berlawanan objek utama (subjek kiri maka CC kanan, subjek kanan maka CC kiri, subjek tengah maka sisi kiri/kanan yang bebas).
- Kandidat ruang kosong berpreferensi 0.45: menang hanya bila slot preferensi tipe (subtitle bawah, dan sebagainya) berkonflik, sehingga struktur komposisi lama tetap terjaga.

### Komposisi adaptif & collision

- Histeresis: penalti 0.25 untuk perpindahan zona, bonus -0.05 untuk zona yang sama.
- Tabrakan wajah: fraksi overlap di atas 2% menolak target dan memicu re-anchor (melewati cooldown).
- Tabrakan subjek: fraksi overlap di atas 35% memicu re-anchor dengan cooldown 0.6 detik agar tidak osilasi.
- Zoom: `zoomFontScale` = pow(zoom, 0.3) dibatasi 0.85 sampai 1.18; diterapkan pada `theme.fontScale` sebelum pengukuran dan penggambaran sehingga ukuran CC proporsional dengan zoom.

### Smoothing & recovery

- Transisi re-anchor: interpolasi easeOutCubic 0.3 detik dari posisi tergambar ke target baru.
- Batas kecepatan universal: 2.5 tinggi-frame per detik; lompatan patologis dari sumber apa pun dipadatkan menjadi gerakan mulus.
- Anchor hilang: posisi terakhir ditahan (mode "held") selama masih layak; setelah cooldown, solver memilih posisi baru dan bertransisi halus.
- Proyeksi keluar safe area lebih dari 0.25 tinggi frame dianggap anchor tidak valid, lalu re-anchor.

## Integrasi

- `engine.ts`: `smartPlacement` default aktif pada mode "adaptive". Jalur lama (`smartPlacement: false`) memakai kode lama sepenuhnya.
- `adaptive-types.ts`: field `smartPlacement?: boolean` pada `AdaptiveCaptionsConfig` (project.json: `project.captions.smartPlacement`).
- Gaya CC (`cc-styles.ts`) tidak diubah: shot camera-follow yang diinjeksi adalah keyframe statis, sehingga tidak ada umpan balik dengan tracking CC; CC ikut bergerak mengikuti transformasi kamera frame tersebut.
- CI: langkah baru "Uji penempatan & tracking CC (camera-aware)" di `.github/workflows/render.yml` menjalankan `src/captions/placement-tests.ts` sebelum render.

## Pemetaan pengujian (placement-tests.ts)

| Kondisi footage | Asersi |
| --- | --- |
| 1. Kamera diam, subjek tengah | CC tidak menutupi subjek, dalam safe area |
| 2. Kamera horizontal | pergeseran CC mengikuti pan (120-200 px) |
| 3. Kamera vertikal | pergeseran CC mengikuti tilt (150-230 px) |
| 4. Zoom | proyeksi menjauh dari pusat + skala font terbatas |
| 5. Kamera mengikuti orang (diagonal) | dua sumbu mengikuti |
| 6. Subjek kiri ke kanan | CC mengikuti anchor, wajah 0% tertutup |
| 7. Banyak objek | subjek kiri maka CC kanan; subjek kanan maka CC kiri |
| 8. Hampir tanpa ruang kosong | fallback tetap dalam safe area |
| 9. Anchor hilang sementara | tanpa lompatan, pulih mulus |
| Tambahan | round-trip transform, grid okupansi, tanpa jitter (di bawah 1 px), transisi re-anchor halus, engine 150 frame kamera bergerak, jalur legacy |

## Batasan yang diketahui

- Tracking analitik mengasumsikan satu transform kamera global per frame; paralaks antar layer mendalam tidak dimodelkan (sama dengan perilaku anchor sebelumnya).
- Skala font zoom dibatasi 0.85 sampai 1.18 demi keterbacaan; zoom ekstrem tidak mengubah ukuran CC secara proporsional penuh.
- Analisis komposisi berbasis wilayah penting dari scene (bukan piksel); footage eksternal tanpa metadata subjek hanya mendapat grid dari region bawaan engine.
- `cc-styles.ts` (camera-follow) tetap menginjeksi keyframe statis pada gaya tertentu; interaksinya didokumentasikan di atas.