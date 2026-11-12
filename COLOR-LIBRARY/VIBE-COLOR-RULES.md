# VIBE-COLOR-RULES

Pedoman wajib untuk Vibe, Claude, dan proyek NAZE lain saat memilih dan memakai warna. Sumber warna adalah NAZE Color Library, bukan ingatan percakapan.

## Status data (jujur)

Saat ini katalog berisi 60 palet, 60 gradien, dan 30 gaya font (`data/typography.json`). Data ada di `data/*.json` (dibuat dari `app/index.html` lewat `tests/build-data.js`), dan aplikasi masih memakai salinan tertanam. Target awal 60 dan 60 sudah tercapai.

## Aturan inti

1. **Satu proyek, satu sistem warna utama.** Jangan mencampur beberapa palet utama tanpa alasan desain yang tertulis.
2. **Warna punya fungsi.** Pakai sesuai peran token, bukan karena terlihat menarik.
3. **Aksen terkontrol.** Aksen hanya untuk satu fokus per layar: aksi utama, status, atau penanda penting. Batas praktis: sekitar 10% area visual.
4. **Kontras wajib diperiksa.** Teks normal minimal 4,5:1, teks besar dan komponen UI minimal 3:1 (WCAG 2.2 AA). Hitung dengan relative luminance, jangan menebak.
5. **Gradien dengan tujuan.** Boleh untuk hero, fokus, atau kedalaman. Dilarang sebagai dekorasi otomatis di setiap kartu, tombol, dan latar.
6. **Jangan mengubah identitas proyek sembarangan.** Jika konfigurasi `locked: true`, sistem warna tidak boleh diganti tanpa persetujuan user.
7. **Baca file, bukan ingatan.** Ambil warna dari katalog atau token proyek. Jangan memakai warna yang kebetulan pernah disebut di percakapan.
8. **Setiap perubahan punya alasan.** Saat mengganti palet, tulis alasan desain dan komponen yang terdampak.

## Peran token

Urutan warna pada setiap palet saat ini:

| Indeks | Token | Fungsi |
|---|---|---|
| 0 | `background.base` | Latar halaman |
| 1 | `background.surface` | Kartu, panel |
| 2 | `text.primary` | Teks utama |
| 3 | `brand.primary` | Tombol utama, tautan, elemen interaktif |
| 4 | `brand.accent` | Penanda sekunder, highlight, data |

Token lain (`text.secondary`, `border.*`, `interactive.*`, `status.*`) diturunkan dari token di atas dan belum tersimpan per palet. Status wajib disertai teks, ikon, atau bentuk, tidak boleh hanya warna.

## Alur memilih palet

1. **Cek konfigurasi proyek.** Jika sudah ada `paletteId` dengan `locked: true`, pakai itu dan berhenti.
2. **Tentukan jenis proyek dan audiens**, lalu pilih kategori:

| Konteks | Kategori yang dipertimbangkan |
|---|---|
| Developer tool, dashboard teknis | Software Engineering, Monochrome, Industrial |
| Keamanan, infrastruktur | Cybersecurity, Industrial |
| Produk AI | Artificial Intelligence, Futuristic |
| Bisnis, finansial, B2B | Corporate, Professional |
| Brand premium | Luxury, Editorial, Vintage |
| Game, hiburan | Gaming, Neon, Retro, Cinematic |
| Wellness, edukasi, lingkungan | Nature, Forest, Ocean, Pastel |
| Portofolio, studio kreatif | Creative Studio, Editorial, Experimental |

3. **Pilih mode.** Gunakan `dark` atau `light` sesuai tag palet. Jangan membalik palet secara manual.
4. **Validasi.** Teks/latar minimal 4,5:1, primer/latar dan aksen/latar minimal 3:1. Jika gagal, laporkan rasio aktual dan sarankan perbaikan. Jangan mengubah warna sumber secara diam-diam.
5. **Variasi antarproyek.** Jangan terus memakai kombinasi yang sama. NAZE tidak identik dengan cyan, biru, atau neon.

## Kontrak integrasi

Referensi palet memakai ID stabil, misalnya `tech-slate`, `lux-noirgold`, `grad-dusk-linear`. ID tidak boleh berubah walau nama atau urutan berubah.

```json
{
  "project": "contoh-proyek",
  "colorSystem": {
    "paletteId": "tech-slate",
    "mode": "dark",
    "gradientIds": ["grad-slate-glow"],
    "locked": true
  },
  "overrides": {
    "brand.accent": "#f59e0b"
  }
}
```

- `overrides` hanya berlaku di proyek tersebut dan tidak mengubah katalog global.
- Setiap override tetap harus lolos validasi kontras.
- Palet kustom dari Generator memakai ID berawalan `custom-` dan hanya tersimpan di browser sampai diekspor.

## Larangan

- Memilih warna acak atau mengulang kombinasi tanpa alasan.
- Memakai teks berkontras rendah demi estetika.
- Menumpuk lebih dari satu gradien dominan dalam satu layar.
- Mengganti palet berstatus `locked` tanpa persetujuan.
- Membedakan status hanya dengan warna.

## Tipografi dan warna font

- Setiap gaya font di `typography.json` merujuk `paletteId` dan peran token, bukan menyalin HEX. Ganti palet berarti warna font ikut berubah.
- Pasangan font dipilih sesuai karakter proyek. Maksimal 2 keluarga font per proyek, satu untuk judul dan satu untuk isi.
- Warna judul bertipe `text.*` minimal 4,5:1. Judul berwarna `brand.*` boleh minimal 3:1 hanya untuk teks besar (sekitar 24px atau lebih). Teks isi selalu 4,5:1.
- Tautan memakai `brand.primary` dan harus 4,5:1 terhadap latar. Jika gagal, validator melaporkan rasio aktualnya.
- Selalu sediakan font cadangan (`serif`, `sans-serif`, atau `monospace`) karena font web bisa gagal dimuat.

## Penegakan wajib (CI)

Aturan dalam dokumen ini DITEGAKKAN otomatis dan tidak boleh dilewati.

- Workflow `.github/workflows/color-policy.yml` menjalankan `COLOR-LIBRARY/tests/validate.js` dan `COLOR-LIBRARY/tests/validate-project-colors.js` pada setiap push/PR yang menyentuh `PROJECTS/**` atau `COLOR-LIBRARY/**`. Pelanggaran menghasilkan ERROR dan run merah.
- Kepatuhan per proyek (`PROJECTS/<NAMA>/project.json`):
  1. Tetapkan `colorSystem.paletteId` yang terdaftar di `data/solid-palettes.json`, ATAU
  2. pakai objek `palette` yang warnanya identik dengan palet katalog. Pemetaan peran: `background` = `background.base`, `primary` = `brand.primary`, `secondary` = `brand.secondary` (dari `data/semantic-tokens.json`), `accent` = `brand.accent`, `text` = `text.primary`.
- Perbedaan warna hanya boleh lewat `colorSystem.overrides`, wajib lolos kontras (teks 4,5:1, brand 3:1), dan tidak mengubah katalog global.
- `colorSystem.gradientIds` dan `colorSystem.typographyId` wajib terdaftar di katalog.
- Palet preset engine (mis. `palette: "editorial-ink"`) dan `colorScheme` engine BUKAN warna dari COLOR-LIBRARY; untuk proyek baru akan ditolak validator.
- Proyek yang sudah ada sebelum kebijakan ini terdaftar di `COLOR-LIBRARY/policy.json` bagian `grandfathered` dan tidak diubah tanpa persetujuan pengguna. Menghapus proyek dari daftar tersebut berarti proyek itu wajib patuh penuh.
- Menonaktifkan, menghapus, atau mem-bypass validasi ini dilarang.
