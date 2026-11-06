# Audit Aset - DIGITAL-FOOTPRINT

Audit aset khusus video "Internet Tahu Lebih Banyak Tentangmu Daripada Kamu Kira".
Hanya aset yang relevan dengan kebutuhan visual video ini yang dipakai. Aset asli
tidak diubah maupun dihapus.

## Aset vault terpilih

| Kebutuhan | Aset terpilih | Alasan |
| --- | --- | --- |
| Font display | FONTS/GOOGLE/TECHNO/orbitron.ttf | Sans-serif geometris; cocok tema teknologi |
| Musik latar | AUDIO/MUSIC/DARK/theme.ogg | Nuansa gelap sinematik sesuai prompt produksi |
| SFX antarmuka | AUDIO/SFX/INTERFACE/*.wav (17 titik) | Klik, gulir, glitch, konfirmasi, tick |
| SFX digital | AUDIO/SFX/DIGITAL/*.ogg (19 titik) | Zap, laser, phaser, power-up, tone |
| SFX dampak | AUDIO/SFX/IMPACT/*.ogg (14 titik) | Bell, punch, metal, footstep concrete/wood |

Total 50 peristiwa SFX terpetakan per scene (lihat narration.md).

## Gambar mentahan (VISUAL/RAW)

19 JPG mentahan di VISUAL/RAW tidak dipakai langsung: standar produksi
(NAZE-STANDARDS.md Persyaratan Wajib no. 8) mensyaratkan cutout latar dan animasi.
Seluruh ilustrasi scene dibuat orisinal dan prosedural agar karakter dan objek
konsisten sepanjang video.

## Ilustrasi kustom prosedural

| Objek | Scene | Detail |
| --- | --- | --- |
| character | 1, 3, 5, 6 | Rambut, topi, kacamata, kemeja (kerah + resleting), celana, sepatu, jam tangan pintar; fitur aktif identik di semua scene |
| shoe | 2, 5 | Sol, upper, tali, garis aksen neon, glow, partikel data |
| footprint | 3, 6, 7 | Tapak, tumit, lima jari, denyut glow, partikel data |
| phone | 1, 2, 4 | Bezel, layar, bar aplikasi animatif, aliran partikel data (dataFlow) |
| globe | 4, 7 | Bola dunia bergaris data; merepresentasikan server analisis |
| gauge | 5 | Jarum profil berlabel kustom "PROFIL" |
| chart | 6 | Batang data animatif |

## Penempatan CC

CC burn-in memakai renderer v2 (pil gelap #0A0A0A alpha 0.78, teks terang,
maksimal dua baris, auto-shrink, bayangan lembut). Khusus proyek ini margin bawah
CC dinaikkan ke 0.17 tinggi frame (di atas zona UI TikTok) lewat
captions.bottomMargin; proyek lain tetap memakai default 0.10.
