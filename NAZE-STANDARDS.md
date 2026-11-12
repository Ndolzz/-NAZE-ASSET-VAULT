# NAZE-STANDARDS - Standar Global Permanen

Dokumen ini adalah sumber kebenaran kebijakan NAZE Motion Engine. Berlaku
untuk semua video, proyek baru, template, preset, workflow, dan pembaruan
engine, sekarang dan di masa mendatang. Konfigurasi proyek tidak dapat
menonaktifkan persyaratan wajib di bawah ini.

## Standar Output

| Parameter | Standar |
|---|---|
| Resolusi | 1080 x 1920 (render native, tanpa upscale) |
| Rasio | 9:16 |
| Frame rate | 60 FPS CFR |
| Codec video | H.264 / yuv420p |
| Codec audio | AAC |
| Container | MP4 (faststart) |
| Subtitle | CC wajib pada seluruh video bernarasi |
| Ilustrasi | Wajib pada setiap video |
| Rendering | GitHub Actions |

Profil tambahan yang diizinkan: 1440 x 2560 dan 2160 x 3840, keduanya
60 FPS CFR. Tidak ada profil di bawah standar 1080 x 1920.

## Persyaratan Wajib

1. Ilustrator wajib menjadi bagian setiap produksi; ilustrasi orisinal,
   relevan dengan narasi, dan dianimasikan. Stok foto/video tidak dapat
   menggantikan ilustrasi.
2. CC wajib tersedia dan tersinkronisasi pada setiap video bernarasi;
   maksimal dua baris, mudah dibaca di ponsel, tidak menutupi ilustrasi
   utama. Render dinyatakan gagal jika narasi ada tetapi CC tidak ada.
3. Standar resolusi utama 1080 x 1920; frame rate 60 FPS CFR.
4. Minimal 17 style visual selalu tersedia dan dapat dipilih.
5. Warna tidak boleh didominasi biru secara permanen; palet mengikuti
   topik dengan 3-5 warna utama dan lima peran warna.
6. Background music tidak boleh ditambahkan tanpa permintaan eksplisit.
7. Hasil produksi wajib lolos validasi otomatis 12 titik; kegagalan
   apa pun berarti render gagal dan penyebabnya dilaporkan.
8. Setiap gambar yang digunakan sebagai subjek ilustrasi utama wajib
   diproses sebelum dipakai: latar belakang dihapus terlebih dahulu
   (cutout transparan), lalu gambar wajib dianimasikan (keyframes,
   layers, atau camera). Gambar mentahan dari `VISUAL/RAW/` tidak
   boleh dipakai langsung.
9. Setiap proyek baru wajib memenuhi standar editing referensi
   `naze.references.json`: layer, keyframe, tata letak berlapis, visual,
   null object, kamera, dan transisi. Proyek legacy yang terdaftar di
   `exemptProjects` pada berkas tersebut dikecualikan dan dibiarkan apa
   adanya.
10. Pustaka aset `GENERATED-2D/` wajib diperiksa sebelum membuat visual
    baru, aset yang relevan wajib dipakai, dan pemakaian aset wajib
    didokumentasikan di `PROJECTS/<NAMA>/ASSET-MAP.json` (bagian
    Pustaka Aset Wajib di bawah).

## Pustaka Aset Wajib (GENERATED-2D)

`GENERATED-2D/` adalah sumber visual utama produksi NAZE: 200 aset SVG 2D
(karakter, objek per topik, lingkungan, background, UI, dan motion assets).
Katalog mesin-terbaca: `GENERATED-2D/catalog.json`; pratinjau offline:
`GENERATED-2D/preview.html`. Kebijakan: `GENERATED-2D/asset-policy.json`.
Pustaka ini adalah sumber daya produksi aktif, bukan koleksi yang hanya
disimpan.

### Prosedur wajib sebelum produksi

Setiap kali memulai proyek atau scene baru:

1. Identifikasi topik dan kategori konten.
2. Baca `GENERATED-2D/catalog.json` untuk menemukan aset yang relevan,
   lalu periksa `preview.html` sebelum memilih.
3. Tentukan karakter, objek, lingkungan, background, dan UI yang
   dibutuhkan setiap scene.
4. Tentukan palet melalui COLOR-LIBRARY (`policy.json` +
   `VIBE-COLOR-RULES.md`); jangan menentukan palet di luar katalog.
5. Buat `PROJECTS/<NAMA>/ASSET-MAP.json` yang menghubungkan kebutuhan
   scene dengan file aset sebenarnya.
6. Gunakan aset yang tersedia sebelum membuat aset pengganti. Jangan
   membuat ilustrasi baru jika aset yang sesuai sudah ada, dan jangan
   mengabaikan aset yang relevan hanya karena lebih mudah membuat visual
   dari nol.

### Aturan pemakaian aset

- Pilih aset berdasarkan makna narasi, bukan sekadar dekorasi.
- Sesuaikan ukuran dan proporsi dengan komposisi; pertahankan
  transparansi objek.
- Transformasi (warna, ukuran, rotasi, posisi, animasi), masking,
  clipping, dan compositing diperbolehkan selama identitas visual dan
  aturan desain tetap terjaga.
- Jangan mengubah file sumber library untuk kebutuhan satu proyek;
  buat salinan atau hasil transformasi di direktori proyek.
- Jangan menumpuk objek tanpa tujuan visual dan jangan memaksakan
  seluruh aset ke satu scene.
- Setiap scene harus memiliki hierarki visual yang jelas: fokus utama,
  informasi pendukung, dan elemen dekoratif.
- Placeholder, kotak kosong, ikon generik pengganti, atau teks
  sementara tidak boleh muncul pada hasil final.

### Aset baru ketika katalog tidak tersedia

1. Identifikasi objek yang belum tersedia.
2. Buat ilustrasi SVG 2D baru sesuai gaya NAZE.
3. Gunakan warna sesuai COLOR-LIBRARY.
4. Optimalkan ukuran file dan kompleksitas SVG.
5. Simpan di folder aset proyek, atau di folder kategori library yang
   tepat bila bersifat reusable.
6. Catat aset baru dalam `GENERATED-2D/catalog.json` (aset dari
   GENERATED-2D yang tidak terdaftar di katalog akan ditolak validator).

### Asset mapping (ASSET-MAP.json)

Setiap proyek produksi wajib memiliki `PROJECTS/<NAMA>/ASSET-MAP.json`:

```json
{
  "project": "NAMA-PROYEK",
  "assets": [
    {
      "scene": "scene-01",
      "path": "VISUAL/OBJECTS/AI/objects-ai-neural-network.svg",
      "role": "primary_visual",
      "animation": "scale_in",
      "palette": "id-palet-color-library"
    }
  ]
}
```

- `path` aset library ditulis relatif terhadap `GENERATED-2D/`
  (mis. `VISUAL/CHARACTERS/...`) atau berawalan `GENERATED-2D/`;
  aset lokal proyek ditulis relatif terhadap root repositori
  (`PROJECTS/<NAMA>/assets/...`).
- `role` salah satu dari: primary_visual, supporting_visual,
  background, environment, ui_element, motion_asset, character,
  decorative.
- Setiap path wajib ada di repositori; aset dari GENERATED-2D wajib
  terdaftar di `catalog.json`.
- Proyek yang sudah berjalan sebelum kebijakan ini terdaftar pada
  `grandfathered` di `GENERATED-2D/asset-policy.json` dan tidak diubah.

### Integrasi motion dan camera tracking

- Objek, caption, dan motion graphics wajib terintegrasi dengan
  pergerakan kamera; jangan memakai posisi layar statis untuk elemen
  yang seharusnya mengikuti ruang adegan.
- Gunakan sistem camera-aware tracking yang tersedia di MOTION-ENGINE
  dan penempatan CC adaptif sesuai `MOTION-ENGINE/docs/CC-PLACEMENT.md`.
- Gunakan penempatan berbasis ruang kosong, terapkan smoothing, dan
  periksa tabrakan antara caption, objek, dan elemen UI.
- Jangan membuat sistem caption atau tracking tandingan tanpa alasan
  teknis yang jelas.

### Validasi pra-render

Sebelum produksi dinyatakan selesai:

1. Seluruh path aset valid dan SVG dapat dirender.
2. Warna sesuai `COLOR-LIBRARY/policy.json` (validator warna wajib
   dijalankan; jangan menonaktifkan validator agar pipeline terlihat
   berhasil).
3. Caption tidak menutupi fokus utama; animasi dan narasi tersinkron.
4. Compositing dan ukuran output wajib sesuai standar.
5. Hasil render tidak mengandung placeholder atau elemen yang belum
   selesai.

Kepatuhan aset diverifikasi otomatis oleh
`.github/workflows/asset-policy.yml` (validasi katalog + validasi
ASSET-MAP.json pada setiap perubahan `PROJECTS/` atau `GENERATED-2D/`).

## Aset Gambar Mentahan (VISUAL/RAW)

Folder `VISUAL/RAW/` menampung gambar mentahan yang belum diproses;
gambar di sini belum siap pakai dan tidak boleh digunakan dalam produksi
sebelum latar belakangnya dihapus dan rencana animasinya ditetapkan.
Hasil cutout yang telah diproses disimpan di folder visual final yang
sesuai, bukan kembali di folder ini.

## Persistensi

Kebijakan disimpan sebagai konfigurasi global di `naze.policy.json` dan
ditegakkan oleh `MOTION-ENGINE/src/core/policy.ts` pada setiap render.
Kebijakan aset disimpan di `GENERATED-2D/asset-policy.json` dan
kebijakan warna di `COLOR-LIBRARY/policy.json`; keduanya ditegakkan oleh
workflow CI. Kebijakan tetap aktif setelah restart, pembuatan proyek
baru, penggantian konfigurasi proyek, pembaruan engine, dan eksekusi
ulang workflow.

Pengecualian hanya boleh dilakukan jika pengguna secara eksplisit
menginstruksikannya melalui `--explicit-override "alasan"`; alasan
tersebut tercatat permanen pada render report.

## Referensi

- Arsitektur: `MOTION-ENGINE/docs/ARCHITECTURE.md`
- Pustaka style: `MOTION-ENGINE/docs/STYLES.md`
- Pipeline: `MOTION-ENGINE/docs/PIPELINE.md`
- Standar editing referensi: `naze.references.json`
- Katalog aset 2D: `GENERATED-2D/catalog.json`
- Kebijakan aset: `GENERATED-2D/asset-policy.json`
- Kebijakan warna: `COLOR-LIBRARY/policy.json` + `COLOR-LIBRARY/VIBE-COLOR-RULES.md`
- Penempatan CC camera-aware: `MOTION-ENGINE/docs/CC-PLACEMENT.md`
- Workflow render: `.github/workflows/render.yml`
- Workflow kebijakan aset: `.github/workflows/asset-policy.yml`
