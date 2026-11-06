# DIGITAL FOOTPRINT - Narasi dan Pemetaan SFX

Status: MENUNGGU KONFIRMASI TEKS terhadap rekaman suara.

Rekaman narasi: `PROJECTS/jejak digital/speechma_audio_Remy Indonesian_at_1_17_38 AM_on_November_7th_2026.mp3`
Musik latar (permintaan eksplisit prompt): `AUDIO/MUSIC/DARK/theme.ogg`

PENTING: teks narasi di bawah adalah versi lengkap yang disusun dari prompt produksi.
Engine `file` menaksir durasi tiap cue dari bobot teks, sehingga teks WAJIB sama dengan isi
rekaman. Jika rekaman berbeda, koreksi `project.json` lalu push untuk render ulang.

## Teks narasi

1. HOOK: Pernah merasa internet seperti tahu apa yang sedang kamu pikirkan?
2. ADVERTISEMENT: Kamu baru saja mencari sepatu di Google. Beberapa saat kemudian, iklan sepatu yang sama muncul di media sosial kamu. Kebetulan? Tidak.
3. DIGITAL FOOTPRINT: Setiap kali kamu menggunakan internet, kamu meninggalkan jejak digital. Setiap pencarian, setiap klik, dan setiap tontonan tercatat sebagai data.
4. DATA COLLECTION: Riwayat pencarian, interaksi, dan cookie dikumpulkan dari perangkat kamu, lalu dikirim ke server untuk dianalisis.
5. USER PROFILING: Dari sinyal-sinyal itu, perusahaan bisa membangun profil tentang minat, kebiasaan, dan kebutuhan kamu.
6. THE REVELATION: Kamu tidak harus mengunggah informasi pribadi. Cukup dengan menjelajah, jejak digital kamu sudah menceritakan banyak hal.
7. CLOSING: Seberapa banyak jejak digital yang sudah kamu tinggalkan hari ini? NAZ. Technology Beyond Imagination.

## Pemetaan SFX (semua dari vault repositori)

| Scene | Berkas SFX | Momen |
|---|---|---|
| 1 | INTERFACE/question_004, DIGITAL/phaser_up_4, INTERFACE/glitch_001, DIGITAL/power_up_3, IMPACT/impact_metal_heavy_000, INTERFACE/tick_002 | pertanyaan pembuka, partikel muncul, glitch, tipografi masuk |
| 2 | INTERFACE/click_001, INTERFACE/scroll_001, DIGITAL/zap_1, INTERFACE/select_002, INTERFACE/confirmation_001, IMPACT/impact_punch_heavy_000, DIGITAL/pep_sound_1 | mengetik pencarian, scroll hasil, sepatu terpilih, iklan muncul |
| 3 | IMPACT/footstep_concrete_000-003, DIGITAL/laser_2, INTERFACE/tick_001, DIGITAL/phaser_up_2 | langkah karakter di permukaan digital, jejak menyala |
| 4 | INTERFACE/click_004, DIGITAL/phase_jump_1, DIGITAL/laser_5, DIGITAL/zap_three_tone_up, DIGITAL/power_up_8, INTERFACE/maximize_005, IMPACT/impact_metal_medium_000 | aliran data keluar perangkat menuju server |
| 5 | INTERFACE/confirmation_002, DIGITAL/power_up_10, INTERFACE/maximize_003, INTERFACE/tick_004, DIGITAL/phase_jump_3, DIGITAL/laser_7, INTERFACE/pluck_001, IMPACT/impact_soft_heavy_000 | scanning, connecting, assembling profil holographic |
| 6 | DIGITAL/low_down, IMPACT/footstep_wood_000-001, INTERFACE/glitch_002, DIGITAL/zap_2, DIGITAL/three_tone_1, IMPACT/impact_bell_heavy_000 | menjelajah santai, jejak tertinggal, kamera memperlihatkan skala |
| 7 | DIGITAL/power_up_12, IMPACT/impact_bell_heavy_001, DIGITAL/phaser_up_6, INTERFACE/select_005, DIGITAL/pep_sound_2, DIGITAL/tone_1, INTERFACE/confirmation_004, IMPACT/impact_soft_heavy_001 | kamera menjauh, jaringan terbentuk, logo NAZE |

## Ilustrasi kustom (dibuat prosedural di engine)

- `shoe`: sepatu detail (sol, upper, tali, garis aksen, glow data, partikel naik) - scene 2 dan 5.
- `footprint`: jejak kaki bercahaya (tapak, tumit, lima jari, denyut glow, partikel data naik) - scene 3, 6, 7.
