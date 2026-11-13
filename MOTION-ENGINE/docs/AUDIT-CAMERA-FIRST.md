# Audit Engine & Rencana Migrasi: Camera-First Editorial Motion

Tanggal audit: 2026-11-13. Basis kode yang diaudit: `main` pada commit `25abdc66`
(mesin tipografi v2, run CI 72 sukses). Audit dilakukan terhadap implementasi
aktual, bukan dokumentasi; setiap temuan merujuk berkas dan fungsi konkret.

Dokumen ini adalah hasil PHASE 1 dan rencana migrasi PHASE 2-12. Tidak ada
perubahan implementasi pada commit ini.

---

## 1. Cakupan audit

- `MOTION-ENGINE/src/core` (keyframes, easing, animation, timeline, transitions, policy)
- `MOTION-ENGINE/src/motion` (types, camera, layer-compositor, editorial, typography, text-styles, backdrops)
- `MOTION-ENGINE/src/captions` (anchors, tracking, layout, engine, cc-styles, theme, draw, adaptive-types)
- `MOTION-ENGINE/src/render` (scene-composer, renderer, encoder, profiles)
- `MOTION-ENGINE/src/styles` (library 18 style, registry, types)
- `MOTION-ENGINE/src/pipeline/production.ts`, `src/validation/validate.ts`, `src/cli.ts`
- `.github/workflows/render.yml`, `render-3d.yml`, `color-policy.yml`
- `naze.references.json`, `MOTION-ENGINE/docs/*`

## 2. Temuan per subsistem

### 2.1 Sistem keyframe (`core/keyframes.ts`, `core/easing.ts`)

1. Track bersifat skalar 1D: `Array<{t, value, easing}>`. Tidak ada track
   vektor, tidak ada cubic bezier, tidak ada kurva kustom, tidak ada opsi
   kontinuitas velocity. Setiap segmen di-ease secara independen sehingga
   velocity tidak kontinu di keyframe (perubahan arah/kecepatan mendadak).
2. Properti transform hanya 7: x, y, rotate, scale (seragam), alpha, skew (Y
   saja), blur. Tidak ada: posisi Z, rotasi X/Y, scale X/Y, anchor point track,
   depth track. `TransformSpec` (motion/types.ts) adalah batas skemanya.
3. Timebase: detik scene-lokal dipakai konsisten di track, camera shots,
   `enter`, dan cue. Konsisten dalam praktik, tetapi tidak didokumentasikan
   dan tidak ada helper konversi frame/detik.
4. `applyEasing` meng-clamp keluaran ke 0..1; aman untuk progress, tetapi
   membuat kurva kustom bernilai di luar 0..1 mustahil tanpa jalur baru.

### 2.2 Camera system (`motion/camera.ts`)

1. Model kamera adalah afinitas 2D: rotasi di sekitar pusat kanvas, zoom
   seragam, translasi pan. Tidak ada tilt (rotasi X), tidak ada pan/yaw (rotasi
   Y) sebagai gerak 3D, tidak ada proyeksi perspektif, tidak ada focal length.
2. `dolly` BUKAN dolly. Implementasinya adalah "tarikan 0..1 ke layer yang
   di-track" yang menambah zoom + pan (`evaluateCamera`, blok tracking).
   Zoom (perubahan focal length) dan dolly (perpindahan posisi kamera)
   terkonflasi pada satu skalar. Pelanggaran langsung terhadap target PHASE 4.
3. Tidak ada orbit, camera follow tersmoothing, reframing, atau gerak kamera
   depth-aware.
4. `evaluateCamera` menormalisasi, memfilter, dan mengurutkan ulang seluruh
   array shots SETIAP FRAME, plus alokasi objek baru per frame (bottleneck
   kecil tapi mubazir; dipanggil juga per frame oleh anchors.ts).
5. Pergantian `trackId` terjadi di tengah interpolasi (`e >= 0.5`), dan offset
   tracking diterapkan mentah tanpa smoothing: saat layer yang di-track
   bergerak cepat, pan kamera melompat sebanding `dolly`.
6. Clamp aman (zoom 0.6-2.4, pan +-0.4, roll +-12 deg) tidak disertai overscan
   world: pada zoom < 1 tepi kanvas terlihat sebagai latar polos karena world
   = ukuran kanvas.

### 2.3 Transform pipeline dan layer hierarchy (`motion/layer-compositor.ts`)

1. Model koordinat anak: "absolute canvas coordinates" dengan kompensasi poros
   statis (`ctx.translate(-cx, -cy)`). Anak mewarisi rotasi/skala/skew/offset
   parent, tetapi `z` anak diabaikan; hanya `z` root yang menghasilkan parallax
   (`depth === 0` guard).
2. Parallax adalah hack linear layar: `translate(-pan * 0.5 * PARALLAX * (z-1) * 0.35)`.
   Tidak dipengaruhi zoom, tidak ada perspective scaling, tidak ada occlusion
   selain urutan gambar z root. Hasilnya "layer digeser dengan kecepatan
   berbeda", bukan kedalaman natural (target PHASE 6 belum terpenuhi).
3. `layerCenterNormalized` (pusat untuk camera tracking) mengabaikan rantai
   parent: kamera yang men-track layer anak mengikuti pusat box mentahnya,
   bukan posisi world hasil komposisi. Keyframe/track tidak mengikuti parent
   transform untuk keperluan tracking.
4. Duplikasi matematis: `captions/anchors.ts` mereplikasi rantai parent +
   transform kamera (`applyParent`, `toScreen`) secara terpisah dari
   compositor; `captions/tracking.ts` menduplikasi `cameraToScreen` lagi.
   Tiga salinan rumus yang harus tetap identik; setiap evolusi kamera
   berisiko drift antara render dan anchor caption (sumber klasik bug
   "transform ganda" dan tracking meleset).
5. `evaluateTransform` membakar offset `enter` ke x/y saat track tidak ada;
   alpha dikalikan progress enter. Perilaku ini benar, tetapi tidak
   terdokumentasi sebagai kontrak dan tidak dipakai bersama oleh replika di
   anchors.ts (yang sengaja mengabaikan offset enter).

### 2.4 Caption system (`captions/*`)

1. CC adaptif sudah camera-aware (commit c9fc6ac + 106bb57): anchoring
   scene-space, `zoomFontScale`, grid ruang kosong, batas tabrakan wajah/subjek,
   recovery. Ini fondasi yang baik dan dipertahankan.
2. Anchor tetap dihitung dari REPLIKA matematis (lihat 2.3.4) dan parallax root
   sengaja diabaikan untuk anchor (`par` dinetralkan) sehingga layer z tinggi
   dapat meleset dari anchor-nya saat kamera pan.
3. Empat wrapper editorial resmi (Solid News Box, Dark Glass, Word Highlight,
   Editorial Label) BELUM ADA sebagai toolkit. Yang ada: 24 CaptionType, 9 tema
   (`theme.ts`), 40 preset `cc-styles.ts` yang memaketkan tipe+posisi+animasi,
   tidak satu pun mengekspos keempat wrapper tersebut.
4. `injectCameraFollow` (cc-styles.ts) menggerakkan KAMERA menuju zona CC
   (logika terbalik yang disengaja, maks 4 shot/scene). Dipertahankan, tetapi
   harus tetap idempoten terhadap sistem shot baru.
5. Jalur CC klasik (pil bawah statis) sepenuhnya screen-space; tidak terdampak
   kamera. Sesuai target PHASE 7, ini sah sebagai HUD, tetapi belum dinyatakan
   eksplisit sebagai Screen Space.

### 2.5 Shot design

`CameraShot` flat numerik {at, zoom, panX, panY, rotate, dolly, track, ease}.
Tidak ada tipe shot (establishing/wide/medium/close-up/ECU/insert/tracking/
dolly/detail-reveal), tidak ada semantik framing, subjek, hierarki visual,
durasi, dan transisi per shot. Semua shot harus ditulis numerik manual di
project.json. Sistem shot design (PHASE 8) belum ada.

### 2.6 Scene composition dan visual language

1. Jalur klasik (`scene-composer.ts`) sepenuhnya screen-space statis: subjek di
   slot tetap `illoY = 0.44h`, judul di `0.145h`, bob sinus. Ini jalur 17 style
   lama.
2. Backdrop digambar DI LUAR transform kamera (langkah 2b, sebelum cabang
   layered): backdrop tidak pernah merespons gerak kamera, merusak ilusi
   kedalaman pada scene berlapis.
3. Vignette digambar SETELAH caption (langkah 7) sehingga sedikit menggelapkan
   CC; minor tapi seharusnya sebelum caption.
4. Latar utama saat ini ditentukan palet proyek. Identitas visual baru
   (Near-Black Navy #06101F, aksen adaptif topik, anti-glow berlebihan) akan
   ditegakkan sebagai standar visual jalur editorial, tanpa memaksa palet
   proyek grandfathered berubah (kebijakan COLOR-LIBRARY tetap berlaku).

### 2.7 Motion presets dan style library (`styles/library.ts`)

18 style; hanya `editorial-kinetic` yang membawa `motion.system =
"editorial-kinetic"`. 17 style lain adalah jalur klasik statis tanpa kamera,
layer, atau depth. PHASE 9 menuntut seluruh pustaka dimigrasikan memanfaatkan
camera movement, keyframe hierarchy, perspective, depth, parallax, dynamic
typography, caption wrappers, dan layer composition, dengan >= 17 pilihan
visual yang karakter motion-nya benar-benar berbeda.

### 2.8 Transitions (`core/transitions.ts`)

10 transisi (6 klasik + 4 editorial). Beroperasi pada frame jadi, agnostik
kamera; tidak ada masalah transformasi ganda. Tidak ada transisi yang
mengeksploitasi gerak kamera (mis. whip-pan match); opsional pada PHASE 8.

### 2.9 Rendering pipeline dan performa

1. Render native per frame -> rawvideo RGB24 -> ffmpeg; CFR 60; yuv420p;
   faststart; AAC. Standar PHASE 10 sudah terpenuhi oleh `render/encoder.ts`
   dan `profiles.ts`.
2. Titik optimasi tanpa mengorbankan akurasi: cache normalisasi shots kamera
   per scene, evaluasi matriks world sekali per frame dan dipakai bersama
   oleh compositor dan caption anchors (menghapus tiga salinan rumus),
   hindari alokasi objek per frame di jalur panas.
3. Background music tetap tidak otomatis (kebijakan permanen, tidak diubah).

### 2.10 Pengujian

Yang ada: caption-tests (50 asersi), placement-tests (21), typography-tests
(18). Yang belum ada sama sekali: pengujian transform world/camera/screen,
parent-child, gerak kamera, tracking, interpolasi, kontinuitas velocity,
parallax, caption anchoring terhadap kamera, collision/clipping, multi-layer,
transisi, konsistensi antarframe, dan regresi performa (PHASE 11).

### 2.11 Placeholder dan catatan lingkup

1. `NAZE-3D/` + `render-3d.yml` adalah pipeline demo 3D terpisah (720x1280);
   tidak terintegrasi MOTION-ENGINE. Di luar lingkup overhaul ini; tidak
   diubah dan tidak dihapus.
2. `EXAMPLE_VIDEO/` (4 mp4) masih menjadi standar referensi editing di
   `naze.references.json`. PHASE 12: standar referensi diganti standar
   engine-native; berkas contoh dipertahankan sebagai arsip, tidak dihapus.
3. Proyek render aktif CI saat ini: `HIDDEN-INTERNET-HIGHWAY` (render.yml).
   Setiap push ke `MOTION-ENGINE/**` memicu render penuh; migrasi harus
   menjaga proyek ini tetap lolos validasi 12 titik.

## 3. Daftar defect prioritas

P0 (merusak kebenaran visual, wajib diperbaiki):

- D1. Zoom dan dolly terkonflasi (2.2.2).
- D2. Tiga salinan rumus transform kamera/parent (2.3.4) - risiko transform
  ganda dan tracking meleset.
- D3. Camera tracking mengabaikan parent transform (2.3.3).
- D4. Parallax bukan perspektif; z anak diabaikan (2.3.2).
- D5. Tidak ada sistem koordinat eksplisit world/camera/screen (2.2.1, 2.4.5).

P1 (kualitas motion):

- D6. Interpolasi tanpa kontinuitas velocity, tanpa bezier/kurva kustom (2.1.1).
- D7. TransformSpec tidak lengkap (tidak ada Z, rotasi X/Y, scale X/Y, anchor,
  depth) (2.1.2).
- D8. Tidak ada sistem shot design (2.5).
- D9. Empat wrapper caption resmi belum ada (2.4.3).
- D10. Backdrop di luar transform kamera (2.6.2); vignette setelah caption (2.6.3).
- D11. Alokasi/sort ulang kamera per frame (2.2.4); tracking offset tanpa
  smoothing (2.2.5).

P2 (polish):

- D12. Zoom < 1 tanpa overscan world (2.2.6).
- D13. Style library belum bermigrasi (2.7).
- D14. Cakupan test belum memenuhi PHASE 11 (2.10).
- D15. Timebase tidak terdokumentasi (2.1.3).

## 4. Rencana migrasi (commit terpisah, deskriptif)

Urutan dirancang agar setiap commit tetap kompilabel dan proyek CI aktif tetap
lolos validasi. Jalur klasik (scene tanpa layers/camera, style non-kinetic)
tidak berubah perilaku; perubahan menyasar jalur editorial-kinetic dan modul
inti secara aditif.

| Commit | Isi | Fase |
|---|---|---|
| 1 | Audit report + rencana migrasi (dokumen ini) | PHASE 1 |
| 2 | `motion/transform3.ts`: satu sumber kebenaran matriks world/layer/kamera (world, camera, screen space; proyeksi perspektif 2.5D; parenting penuh). `core/keyframes.ts` + `core/easing.ts`: keyframe v2 (track transform 3D lengkap, linear/ease/bezier/kurva kustom, kontinuitas velocity Hermite, helper timebase). Backward-compatible: field lama dipetakan. | PHASE 3, 4, 5 |
| 3 | `motion/camera.ts` v2: posisi kamera + focal length terpisah dari zoom, dolly = perpindahan Z, pan/tilt/roll, orbit, follow tersmoothing, reframing, overscan world; shim kompatibilitas `evaluateCamera`. `layer-compositor.ts` memakai transform3 (proyeksi per layer, z anak dihormati, occlusion z). Backdrop masuk world space; vignette sebelum caption. | PHASE 4, 6, 10 |
| 4 | Caption: empat wrapper resmi (solid-news-box, dark-glass, word-highlight, editorial-label) di `theme.ts`/`draw.ts` + preset `cc-styles.ts`; anchors/tracking dialihkan ke transform3 (duplikasi rumus dihapus); subject anchor + caption anchor. | PHASE 7 |
| 5 | `motion/shots.ts`: sistem shot design (9 tipe shot: subject, posisi kamera, gerakan, framing, hierarki, durasi, transisi) + integrasi pipeline. | PHASE 8 |
| 6 | Style library: konfigurasi motion v2 untuk 18 style (karakter motion berbeda per style, id stabil, katalog `docs/STYLES.md` diperbarui). | PHASE 9 |
| 7 | `motion/engine-tests.ts`: 15 area pengujian PHASE 11 + langkah CI baru di `render.yml`. | PHASE 11 |
| 8 | Dokumentasi: `CAMERA-SYSTEM.md`, `VISUAL-LANGUAGE.md`, pembaruan `PIPELINE.md`, `ARCHITECTURE.md`, `STYLES.md`; `naze.references.json` beralih ke standar engine-native (EXAMPLE_VIDEO jadi arsip). | PHASE 12 |

Aturan migrasi yang diikuti:

- Tidak ada destructive migration: field skema lama tetap valid dan dipetakan;
  scene format baru terdokumentasi di `PIPELINE.md`.
- Aset produksi yang masih dipakai tidak dihapus; EXAMPLE_VIDEO hanya berhenti
  menjadi standar referensi.
- Setiap commit diverifikasi statis (keseimbangan sintaks, referensi impor,
  simulasi logika) sebelum push; verifikasi penuh melalui CI render + test.
- Pekerjaan tidak dinyatakan selesai hanya karena dokumentasi diperbarui:
  acceptance criteria PHASE akhir menuntut CI hijau dan seluruh test lulus.

## 5. Kriteria penerimaan (dari brief, diverifikasi di akhir)

1. Kamera terintegrasi keyframe engine; perubahan transform kamera tercermin
   pada seluruh child.
2. Objek mengikuti koordinat world dan parent transform konsisten; tidak ada
   transformasi ganda (satu sumber kebenaran matriks).
3. Caption dapat mengikuti objek (subject anchor) maupun tetap HUD (screen
   space); empat wrapper berfungsi.
4. Parallax dan depth natural (perspektif, bukan geser seragam).
5. Motion bebas jitter (kontinuitas velocity + smoothing tracking + clamp).
6. Style library termigrasi; >= 17 style dengan karakter motion berbeda.
7. Seluruh test lulus di CI; GitHub Actions hijau.
8. Dokumentasi sesuai implementasi aktual.
