# 2500 SERANGAN SIBER - Narasi dan Pemetaan SFX

Status: TEKS DARI PROMPT PRODUKSI (menunggu konfirmasi terhadap rekaman).

Rekaman narasi: `PROJECTS/2500 serangan siber/speechma_audio_Remy Indonesian_at_10_03_28 AM_on_November_9th_2026.mp3`
(714.384 byte, diunggah pengguna via antarmuka web GitHub; proyek merujuk berkas ini langsung,
mengikuti pola DIGITAL-FOOTPRINT - berkas biner tidak dipindah melalui alat chat agar byte tidak rusak.)
Tanpa musik latar; narasi dominan, SFX dari vault repositori.

## Teks narasi

1. Bayangkan, saat kamu sedang tidur, ada ribuan komputer yang terus mencoba mencari celah untuk menembus sistem digital di Indonesia.
2. Pada 7 November 2026, dashboard keamanan FortiGuard mencatat sekitar 350.600 aktivitas ancaman siber dalam periode 24 jam di Indonesia.
3. Tapi, bagaimana sebenarnya serangan siber bekerja?
4. Salah satu metodenya adalah port scanning. Sebuah program otomatis memindai server untuk mencari port yang terbuka dan kemungkinan celah keamanan.
5. Bayangkan sebuah gedung dengan ratusan pintu. Program tersebut seperti seseorang yang memeriksa setiap pintu untuk menemukan mana yang tidak terkunci.
6. Jika menemukan kelemahan, penyerang bisa mencoba masuk melalui sistem yang belum diperbarui, kata sandi lemah, atau konfigurasi yang tidak aman.
7. Jika berhasil, mereka bisa mencuri data, mengganggu layanan, bahkan menyebarkan program berbahaya.
8. Namun, ada satu hal penting: 350 ribu aktivitas ancaman bukan berarti 350 ribu sistem berhasil diretas.
9. Sebagian aktivitas tersebut bisa dideteksi dan diblokir oleh sistem keamanan sebelum berhasil menembus target.
10. Salah satunya adalah firewall, teknologi yang memeriksa lalu lintas jaringan dan membantu memblokir koneksi mencurigakan.
11. Ancaman siber juga tidak hanya menyasar perusahaan besar. Pengguna biasa bisa menjadi target melalui phishing, pencurian kata sandi, dan aplikasi berbahaya.
12. Karena itu, gunakan kata sandi yang kuat, aktifkan autentikasi dua faktor, hindari tautan mencurigakan, dan rutin perbarui perangkat.
13. Sebab, di dunia digital, ancaman tidak selalu terlihat. Terkadang, semuanya bekerja diam-diam di balik layar.
14. NAZE. Understand Technology Beyond the Screen.

Catatan: penutup mengikuti prompt produksi ("NAZE. Understand Technology Beyond the Screen.").
Teks CC mengikuti teks di atas apa adanya; bila rekaman ternyata berbeda (mis. "NAZ." seperti
proyek AI-CYBERSECURITY), koreksi scene-9 di `project.json` lalu render ulang.

## Peta scene

| Scene | Judul kinetic | Kalimat | Fungsi storytelling |
|---|---|---|---|
| 1 | WHILE YOU SLEEP | 1 | Hook malam hari: Indonesia dipindai ribuan komputer (globe + grafik naik). |
| 2 | 350K IN 24 HOURS | 2 | Angka dashboard FortiGuard 7 Nov 2026: 350.600 aktivitas dalam 24 jam (gauge + chart). |
| 3 | PORT SCANNING | 3-4 | Cara kerja serangan: program otomatis memindai port (brain + gauge PORT, matriks port + garis pemindai). |
| 4 | HUNDREDS OF DOORS | 5 | Metafora gedung ratusan pintu: ilustrasi kustom `building` + karakter pemeriksa pintu. |
| 5 | WHEN THEY GET IN | 6-7 | Konsekuensi keberhasilan masuk: pencurian data, layanan terganggu (phone dataFlow + korban shocked). |
| 6 | BLOCKED IN TIME | 8-9 | Klarifikasi: bukan 350 ribu peretasan; banyak diblokir (shield + gauge BLOKIR). |
| 7 | THE FIREWALL | 10 | Firewall: ilustrasi kustom `firewall` (tembok bata, gerbang cek, paket diblokir). |
| 8 | PROTECT YOURSELF | 11-12 | Perlindungan pengguna biasa: sandi kuat, 2FA, update (karakter + lightbulb tips). |
| 9 | BEYOND THE SCREEN | 13-14 | Penutup: ancaman tak terlihat + branding NAZE (globe + shield). |

## Sistem visual

- Style builtin `editorial-kinetic` (identitas visual permanen NAZE #18), jalur komposisi berlapis
  penuh (layers, null object, camera rig) sesuai standar editing `naze.references.json`.
- Palet kustom gelap "malam ancaman" (topik siber, tanpa biru): background #0B0B0F,
  primary #F2F0EB, secondary #8E8E99, accent #E63B2E (merah sinyal), text #F5F5F0, dark: true.
- Tipografi kinetic: ketujuh mode dipakai (oversized, stacked, splitWords, rotating, perspective,
  maskReveal, collage); grid/halftone/panel/kartu miring/color blocking; kamera dolly track per scene.

## Ilustrasi kustom (dibuat prosedural di engine)

- `building` (BARU, ditambahkan ke `MOTION-ENGINE/src/illustration/generator.ts`): fasad gedung
  dengan grid pintu, beberapa pintu tak terkunci menyala aksen, antena berkedip - scene 4.
- `firewall` (BARU, idem): tembok bata dengan gerbang centang menyala, paket jaringan diblokir
  dengan tanda X aksen - scene 7.
- Subjek bawaan lain: globe, chart, gauge (label kustom), brain, character (mood), phone (dataFlow),
  shield, lightbulb.

## Pemetaan SFX (semua dari vault repositori)

| Scene | Berkas SFX | Momen |
|---|---|---|
| 1 | INTERFACE/switch_001, DIGITAL/laser_2, INTERFACE/glitch_001, DIGITAL/phaser_up_2, DIGITAL/low_random, IMPACT/impact_metal_heavy_000 | malam aktif, pemindaian samar, impact ancaman |
| 2 | INTERFACE/click_001, INTERFACE/tick_001, DIGITAL/laser_4, DIGITAL/zap_1, INTERFACE/confirmation_001, IMPACT/impact_bell_heavy_000, DIGITAL/tone_1 | dashboard, angka terisi, konfirmasi 350.600 |
| 3 | DIGITAL/laser_1, INTERFACE/tick_002, DIGITAL/phase_jump_1, DIGITAL/zap_two_tone, INTERFACE/error_002, DIGITAL/phaser_up_4, DIGITAL/three_tone_1 | pemindaian port berjalan, deteksi celah |
| 4 | IMPACT/footstep_concrete_000, INTERFACE/tick_004, INTERFACE/select_002, IMPACT/footstep_concrete_002, IMPACT/impact_wood_medium_000, DIGITAL/phaser_up_5, INTERFACE/select_007 | langkah pemeriksa pintu, ketukan, pintu terbuka |
| 5 | INTERFACE/error_001, DIGITAL/zap_2, INTERFACE/glitch_002, DIGITAL/zap_three_tone_up, INTERFACE/error_006, IMPACT/impact_glass_heavy_000, DIGITAL/phaser_down_1, IMPACT/impact_punch_heavy_002 | akses diperoleh, kekacauan, dampak |
| 6 | INTERFACE/confirmation_002, DIGITAL/laser_6, DIGITAL/phaser_down_3, DIGITAL/power_up_5, INTERFACE/maximize_001, INTERFACE/tick_004, IMPACT/impact_metal_medium_000, INTERFACE/confirmation_004 | sistem keamanan aktif, blokir berjalan |
| 7 | DIGITAL/power_up_2, INTERFACE/switch_003, DIGITAL/laser_8, INTERFACE/confirmation_003, INTERFACE/toggle_001, IMPACT/impact_metal_heavy_001 | firewall aktif, koneksi mencurigakan diblokir |
| 8 | INTERFACE/click_002, INTERFACE/toggle_002, INTERFACE/maximize_004, DIGITAL/power_up_9, INTERFACE/pluck_002, INTERFACE/click_005, DIGITAL/two_tone_1, INTERFACE/confirmation_003, DIGITAL/power_up_12, INTERFACE/select_008 | langkah proteksi pengguna, 2FA aktif |
| 9 | DIGITAL/low_down, INTERFACE/question_001, DIGITAL/phaser_up_6, DIGITAL/pep_sound_1, INTERFACE/select_003, DIGITAL/pep_sound_2, IMPACT/impact_soft_heavy_001 | refleksi penutup, branding NAZE |

Waktu SFX (kolom `at`) ditempatkan konservatif pada paruh awal taksiran durasi scene agar tetap
berada di dalam batas scene pada berbagai tempo pengucapan.

## Catatan sinkronisasi CC (engine "file")

Rekaman diputar utuh dari 0,25 detik; durasi tiap cue CC ditaksir proporsional dari bobot teks.
Estimasi durasi rekaman ~121 detik (714.384 byte pada ~47 kbps, konsisten dengan rekaman
jejak digital 536 KB yang dirender 90,85 detik). Pastikan teks narasi di `project.json` tetap
identik dengan isi rekaman; bila berbeda, koreksi lalu push untuk render ulang.
