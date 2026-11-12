# HIDDEN-INTERNET-HIGHWAY - Narasi dan Pemetaan SFX

Narasi engine "file": rekaman manual pengguna (speechma Remy, bahasa Indonesia),
`PROJECTS/speechma_audio_Remy Indonesian_at_5_50_51 PM_on_November_12th_2026.mp3`
(549.072 byte, estimasi sekitar 93 detik; tidak dipindahkan karena berkas biner
tidak aman dipindah via API).

STATUS: teks narasi di bawah adalah REKONSTRUKSI dari fragmen prompt produksi
pengguna (setiap scene hanya diberi kalimat pembuka). Masih MENUNGGU KONFIRMASI
kesesuaian teks terhadap rekaman asli. Jika berbeda, koreksi teks di
project.json lalu render ulang.

Teks narasi per scene (harus sama dengan rekaman):

1. DIGITAL WORLD - "Bayangkan, setiap kali kamu membuka YouTube, ada perjalanan data raksasa yang tak pernah kamu lihat."
2. THE HIDDEN NETWORK - "Jauh di bawah permukaan laut, kabel fiber optik raksasa membentang ribuan kilometer di dasar samudra."
3. GLOBAL CONNECTION - "Inilah salah satu infrastruktur terpenting di era digital, jaringan kabel bawah laut yang menghubungkan seluruh benua."
4. 99 PERCENT - "Lebih dari 99 persen lalu lintas data internasional mengalir lewat kabel bawah laut, bukan lewat satelit."
5. FIBER OPTIC TECHNOLOGY - "Kabel ini dirancang dengan lapisan pelindung khusus, dan di dalamnya, cahaya membawa data dengan kecepatan luar biasa."
6. THE THREAT - "Namun, jaringan ini bukan tanpa risiko."
7. CABLE DAMAGE - "Jangkar kapal, aktivitas penangkapan ikan, hingga gempa bumi bisa memutus kabel dan memadamkan koneksi jutaan orang."
8. REPAIR OPERATION - "Kapal khusus harus dikirim ke lokasi kerusakan, mengangkat kabel dari dasar laut, lalu menyambungnya kembali."
9. FINAL REVEAL - "Jadi, saat kamu mengakses dunia digital, ingat, ada jalan raya tersembunyi di dasar samudra yang bekerja tanpa henti."
10. NAZE - "Inilah jalan raya tersembunyi yang menghubungkan dunia. NAZE. Explore Technology Beyond the Screen."

Konteks angka: 99% pada visual selalu berlabel "INTERNATIONAL DATA TRAFFIC"
(lalu lintas data internasional), sesuai ketentuan prompt produksi. Tagline
penutup proyek ini "Explore Technology Beyond the Screen".

Pemetaan SFX (semua dari vault AUDIO/SFX, tanpa musik latar, 60 event unik,
tanpa satu SFX berulang untuk seluruh video):

- Digital world / orbit bumi: IMPACT/impact_bell_heavy_000, DIGITAL/tone_1,
  DIGITAL/power_up_3, INTERFACE/click_004, DIGITAL/two_tone_1, DIGITAL/high_up
- Menembus permukaan laut: IMPACT/impact_glass_heavy_000, DIGITAL/low_down,
  DIGITAL/low_three_tone, INTERFACE/switch_001, DIGITAL/pep_sound_2,
  IMPACT/impact_soft_heavy_001
- Peta jaringan global: INTERFACE/scroll_001, DIGITAL/laser_3,
  DIGITAL/three_tone_1, INTERFACE/click_003, DIGITAL/laser_6,
  DIGITAL/power_up_5
- Angka 99 persen: DIGITAL/power_up_1, IMPACT/impact_punch_heavy_000,
  INTERFACE/click_002, DIGITAL/zap_two_tone, DIGITAL/three_tone_2,
  INTERFACE/tick_001
- Teknologi fiber optik: INTERFACE/toggle_001, DIGITAL/zap_1, DIGITAL/laser_1,
  INTERFACE/open_003, DIGITAL/high_down, INTERFACE/confirmation_001
- Ancaman (kapal dan jangkar): IMPACT/impact_metal_heavy_000,
  INTERFACE/scratch_001, DIGITAL/low_random, DIGITAL/pep_sound_5
- Kerusakan kabel: INTERFACE/glitch_001, IMPACT/impact_metal_heavy_001,
  INTERFACE/scratch_002, INTERFACE/error_004,
  DIGITAL/zap_three_tone_down, IMPACT/impact_tin_medium_000,
  DIGITAL/phaser_down_1
- Operasi perbaikan bawah laut: INTERFACE/switch_003,
  IMPACT/impact_metal_light_000, INTERFACE/toggle_003, DIGITAL/two_tone_2,
  IMPACT/impact_plate_light_000, DIGITAL/power_up_7,
  INTERFACE/confirmation_003
- Reveal final (jalur menyala): DIGITAL/phaser_up_2, DIGITAL/pep_sound_3,
  INTERFACE/click_005, DIGITAL/zap_two_tone_2, DIGITAL/power_up_10,
  IMPACT/impact_soft_medium_000
- Brand outro NAZE: INTERFACE/close_002, DIGITAL/phase_jump_1,
  IMPACT/impact_plate_medium_000, DIGITAL/power_up_12,
  INTERFACE/confirmation_002, DIGITAL/phaser_up_4

Penempatan SFX konservatif pada paruh awal durasi scene karena sinkronisasi
cue pada engine "file" memakai estimasi berbobot teks (cueWeight), bukan
pengukuran per-cue.
