# AI-CYBERSECURITY — When AI Becomes a Cyber Weapon

Dokumenter teknologi modern untuk TikTok: 1080x1920 @ 60 FPS CFR, H.264/yuv420p,
AAC, MP4. Narasi suara manual (engine "file"), SFX dari vault repositori,
tanpa musik latar otomatis.

## Berkas suara narasi

Rekaman suara manual sudah tersedia di repositori (diunggah pengguna via
antarmuka web GitHub, commit `becf7da`):
`PROJECTS/speechma_audio_Remy Indonesian_at_7_44_16 PM_on_November_5th_2026.mp3`
(480.096 byte, biner asli). Karena alur chat hanya meneruskan transkripsi
(bukan byte audio), `narration.file` pada `project.json` menunjuk langsung
ke berkas tersebut. Jalur ini disengaja: menyalin berkas biner melalui alat
chat berisiko merusak byte. Untuk kerapian repositori, berkas dapat dipindah
nanti ke `PROJECTS/AI-CYBERSECURITY/AUDIO/VOICE/narration.mp3` (via web UI
atau git mv) dan `narration.file` diperbarui, lalu render ulang.

## Narasi (transkripsi RESMI dari rekaman yang disediakan)

Teks di bawah adalah transkripsi kata demi kata dari rekaman suara yang
dikirim pengguna. Tidak ada kalimat yang diubah, diringkas, atau dihilangkan.

1. Pernah membayangkan jika kecerdasan buatan digunakan untuk meretas dunia digital?
2. Sekarang, itu bukan lagi sekadar cerita fiksi ilmiah.
3. AI mulai mengubah cara serangan siber dilakukan.
4. Lebih cepat, lebih otomatis, dan semakin sulit dikenali.
5. Bayangkan sebuah sistem yang mampu membuat ribuan pesan phishing dengan bahasa yang meyakinkan.
6. Bahkan, teknologi cloning suara dapat digunakan untuk meniru seseorang demi melakukan penipuan.
7. AI juga dapat membantu penyerang menganalisis sistem dan mencari celah keamanan.
8. Namun, AI bukan hanya digunakan untuk menyerang.
9. Di sisi lain, para ahli keamanan siber memanfaatkannya untuk mendeteksi aktivitas mencurigakan, menganalisis malware, dan menemukan ancaman sebelum menyebabkan kerusakan lebih besar.
10. Inilah perlombaan baru di dunia digital.
11. Penyerang terus mengembangkan metode baru, sementara sistem pertahanan juga terus belajar dan beradaptasi.
12. Pada akhirnya, AI bukanlah ancaman atau penyelamat dengan sendirinya.
13. Semuanya bergantung pada siapa yang menggunakannya dan untuk tujuan apa.
14. Jadi, di masa depan, siapa yang akan lebih unggul?
15. AI yang menyerang, atau AI yang melindungi?
16. NAZ. Technology Beyond Imagination.

Catatan transkripsi: penutup terdengar "NAZ." pada rekaman; teks CC
mengikuti transkripsi apa adanya. Bila merek harus tampil sebagai "NAZE.",
perbaiki teks scene-7 di `project.json` lalu render ulang.

## Peta scene (mengikuti arah kreatif pengguna)

| Scene | Judul kinetic | Kalimat | Fungsi storytelling |
| --- | --- | --- | --- |
| scene-1 | AI IS THE NEW WEAPON | 1-2 | Opening: AI dan jaringan digital, transisi cepat, ancaman muncul. |
| scene-2 | AUTOMATED ATTACKS | 3-4 | Eskalasi serangan otomatis (grafik naik + gauge ancaman). |
| scene-3 | DIGITAL THREATS | 5-6 | Simulasi phishing massal dan voice cloning (telepon + korban terkejut). |
| scene-4 | SCANNING FOR WEAKNESS | 7 | Pemindaian sistem dan pencarian celah oleh AI penyerang. |
| scene-5 | AI CYBER DEFENSE | 8-9 | Transisi ke pertahanan: deteksi anomali, analisis malware (shield + analis). |
| scene-6 | THE DIGITAL ARMS RACE | 10-11 | Dua sisi saling berhadapan (roket perlombaan + grafik adaptasi). |
| scene-7 | WHO WINS THE FUTURE? | 12-16 | Penutup: pertanyaan utama, dua sisi internet, branding NAZE. |

## Sistem visual

- Gaya kustom `ai-cyber-doc` (terdaftar otomatis saat render): dokumenter
  teknologi sinematik, grid HUD, komposisi asimetris, shading gradien,
  transisi zoomDissolve/panelSwipe/shapeWipe, intensitas animasi 0,95.
- Font: Oxanium (FONTS/GOOGLE/TECHNO/oxanium.ttf), judul kapital, tracking 1,
  kinetic typography per kata dengan stagger.
- Palet `ai-cyber-brand` (lima peran, tanpa dominasi biru):
  latar charcoal #0B0B10, primer crimson #FF3B47 (serangan siber),
  sekunder violet #A855F7 (artificial intelligence), aksen oranye #FF9E1B
  (warning/threat), teks #F5F7FA. Scene pertahanan dibaca melalui kontras
  violet-oranye di atas charcoal sinematik.
- Ilustrasi orisinal prosedural di setiap scene (kebijakan permanen):
  brain/globe, chart/gauge, phone/character, gauge/brain, shield/character,
  rocket/chart, shield/globe — semuanya dianimasikan (pop-in, float, scan).
- CC burn-in tersinkronisasi, maksimal 2 baris x 32 karakter, sidecar SRT+VTT.
- Durasi video mengikuti rekaman narasi + 0,25 detik lead + 1,2 detik outro.

## Pemetaan SFX (seluruhnya dari vault AUDIO/SFX)

| Fungsi | Berkas vault |
| --- | --- |
| Pembukaan / UI aktif | INTERFACE/switch_001.wav, tick_002.wav |
| Pemindaian jaringan | DIGITAL/laser_1.ogg, laser_3.ogg, laser_5.ogg, laser_7.ogg |
| Pesan phishing terbentuk | INTERFACE/click_001.wav, click_002.wav, click_004.wav |
| Glitch / distorsi | INTERFACE/glitch_001.wav, glitch_002.wav |
| Riser ketegangan | DIGITAL/phaser_up_2.ogg, phaser_up_4.ogg, phaser_up_7.ogg |
| Antiserangan / sweep turun | DIGITAL/phaser_down_2.ogg, low_down.ogg, low_three_tone.ogg |
| Impact sinematik | IMPACT/impact_metal_heavy_000.ogg, impact_punch_heavy_000.ogg, impact_glass_heavy_000.ogg, impact_bell_heavy_001.ogg, impact_metal_medium_000.ogg, impact_soft_heavy_000.ogg |
| Sistem pertahanan aktif | INTERFACE/confirmation_001.wav, confirmation_002.wav, DIGITAL/power_up_3.ogg, power_up_8.ogg, power_up_10.ogg |
| HUD / deteksi | INTERFACE/maximize_003.wav, tick_001.wav, tick_004.wav, select_003.wav |
| Zetusan listrik / zap | DIGITAL/zap_1.ogg, zap_2.ogg, zap_three_tone_up.ogg, phase_jump_2.ogg |
| Pertanyaan penutup | INTERFACE/question_002.wav, question_003.wav |
| Kilau branding akhir | DIGITAL/pep_sound_1.ogg, pep_sound_2.ogg, tone_1.ogg, INTERFACE/pluck_001.wav |

Waktu SFX (kolom `at`) diposisikan terhadap perkiraan durasi scene dari bobot
teks narasi dan ditempatkan konservatif di paruh awal scene agar tetap berada
di dalam batas scene pada berbagai tempo pengucapan.

## Catatan sinkronisasi CC (engine "file")

Rekaman diputar utuh dari 0,25 detik; durasi tiap cue CC ditaksir proporsional
terhadap bobot teks (huruf + jeda tanda baca) terhadap durasi total rekaman.
Untuk narasi berirama stabil taksiran ini memadai; presisi per-cue penuh
membutuhkan berkas suara per cue (opsi pengembangan masa depan). Pastikan
teks narasi di `project.json` tetap identik dengan isi rekaman.
