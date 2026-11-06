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

## Aset Gambar Mentahan (VISUAL/RAW)

Folder `VISUAL/RAW/` menampung gambar mentahan yang belum diproses;
gambar di sini belum siap pakai dan tidak boleh digunakan dalam produksi
sebelum latar belakangnya dihapus dan rencana animasinya ditetapkan.
Hasil cutout yang telah diproses disimpan di folder visual final yang
sesuai, bukan kembali di folder ini.

## Persistensi

Kebijakan disimpan sebagai konfigurasi global di `naze.policy.json` dan
ditegakkan oleh `MOTION-ENGINE/src/core/policy.ts` pada setiap render.
Kebijakan tetap aktif setelah restart, pembuatan proyek baru, penggantian
konfigurasi proyek, pembaruan engine, dan eksekusi ulang workflow.

Pengecualian hanya boleh dilakukan jika pengguna secara eksplisit
menginstruksikannya melalui `--explicit-override "alasan"`; alasan
tersebut tercatat permanen pada render report.

## Referensi

- Arsitektur: `MOTION-ENGINE/docs/ARCHITECTURE.md`
- Pustaka style: `MOTION-ENGINE/docs/STYLES.md`
- Pipeline: `MOTION-ENGINE/docs/PIPELINE.md`
- Standar editing referensi: `naze.references.json`
- Workflow render: `.github/workflows/render.yml`
