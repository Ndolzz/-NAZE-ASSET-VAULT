# NAZE 2D Asset Pack

Isi paket ini adalah 200 aset SVG 2D terpisah, `catalog.json`, dan `preview.html` offline.

- Objek dan karakter: SVG 1024 x 1024 dengan area luar transparan.
- UI dan motion overlay: SVG 1024 x 1024, transparan di luar elemen.
- Environment dan background: SVG 1920 x 1080.
- Tidak ada caption atau watermark yang dibakar ke aset.
- Preview bisa dibuka secara lokal melalui `preview.html`.

Folder `VISUAL/` dapat disalin ke root asset vault atau ke subfolder khusus, misalnya `GENERATED-2D/`.

## Pustaka Produksi Aktif

Folder ini adalah sumber visual utama produksi NAZE dan wajib diperiksa
sebelum membuat visual baru. Prosedur pra-produksi, aturan pemakaian,
format `ASSET-MAP.json`, dan daftar validasi: lihat `NAZE-STANDARDS.md`
(bagian "Pustaka Aset Wajib") dan `asset-policy.json`.

- Katalog mesin-terbaca: `catalog.json` (200 aset; field id, title,
  category, type, format, file, notes).
- Aset baru wajib dicatat di `catalog.json`; aset library yang tidak
  terdaftar akan ditolak validator.
- Kepatuhan proyek (ASSET-MAP.json dan keberadaan file aset) divalidasi
  otomatis oleh `.github/workflows/asset-policy.yml` melalui
  `tests/validate-catalog.js` dan `tests/validate-project-assets.js`.
