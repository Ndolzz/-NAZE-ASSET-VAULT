# NAZE Motion Engine - Arsitektur

## Gambaran Umum

NAZE Motion Engine v2 adalah sistem produksi video vertikal yang merender
secara native pada 1080x1920 @ 60 FPS CFR melalui pipeline TypeScript +
FFmpeg. Seluruh frame digambar per frame pada resolusi profil (tanpa
upscale), lalu dipipe sebagai rawvideo RGB24 ke encoder H.264/AAC MP4.

## Struktur Modul

```
MOTION-ENGINE/src/
  core/
    easing.ts        - Fungsi easing + PRNG deterministik (mulberry32)
    keyframes.ts     - Sampling track keyframe dan progress
    animation.ts     - Track animasi siap pakai (popIn, fadeIn, float, wordStagger)
    timeline.ts      - Scene, cue CC, dan timeline global
    transitions.ts   - Transisi antarscene
    policy.ts        - Pemuatan dan penegakan kebijakan permanen
  color/
    palette.ts       - Palet warna topik-adaptif, deteksi dominasi biru
  styles/
    types.ts         - Definisi StyleDef (palet, tipografi, tekstur, transisi)
    library.ts       - 17 style visual permanen
    registry.ts      - Registrasi, mix style, rekomendasi topik
  illustration/
    shapes.ts        - Primitif gambar (blob, star, halftone, torn edge, dll.)
    generator.ts     - Generator subjek ilustrasi (karakter, objek 3D-look, chart, ikon)
    manager.ts       - Perencanaan dan reuse aset ilustrasi per scene
  captions/
    adaptive-types.ts- Tipe data sistem caption adaptif
    adapt.ts         - Aturan konteks dan pemilihan tipe/posisi caption
    anchors.ts       - Anchor karakter, layer, dan titik (follow per frame)
    anim.ts          - 20 preset animasi deterministik berbasis waktu
    cc-styles.ts     - 40 gaya CC (font, warna, stroke, layout)
    theme.ts         - Tema bubble/chat/kinetic
    layout.ts        - Layout dan pengukuran teks caption
    draw.ts          - Penggambaran semua tipe caption (bubble, chat, kinetic, dll.)
    engine.ts        - CaptionEngine: API imperatif + jalur deklaratif
    segmenter.ts     - Segmentasi narasi menjadi cue (maks 2 baris), SRT/VTT,
                       validasi integritas cue (validateCues)
    parser.ts        - Impor subtitle SRT/WebVTT menjadi cue engine
    sync.ts          - Distribusi timing kata dan kalimat dalam rentang cue
    renderer.ts      - Burn-in CC dengan pill, kata aksen, animasi fade/rise
    caption-tests.ts - Test suite otomatis caption (dijalankan di CI)
  audio/
    narration.ts     - Sintesis per-cue (espeak-ng) + pengukuran durasi
    mixer.ts         - Mix narasi dominan + SFX; musik hanya eksplisit
  render/
    profiles.ts      - Profil 1080/1440/2160, semua 60 FPS
    encoder.ts       - Argumen FFmpeg (CFR, yuv420p, faststart) + utilitas
    scene-composer.ts- Komposisi frame: latar, tekstur, ilustrasi, tipografi, CC
    renderer.ts      - Loop frame + pipe rawvideo + registrasi font vault
  validation/
    validate.ts      - 12 pemeriksaan wajib via ffprobe + decode test
  pipeline/
    production.ts    - 9 tahap produksi dari kebijakan hingga validasi
  cli.ts             - Antarmuka baris perintah
```

## Alur Produksi (9 Tahap)

1. Muat kebijakan global (`naze.policy.json`).
2. Muat proyek; selesaikan style, palet, dan profil; dominasi biru
   dihitung dan ditegakkan di sini (pelanggaran menggagalkan render,
   kecuali override `--explicit-override`).
3. Rencanakan ilustrasi per scene; tegakkan kebijakan.
4. Sintesis narasi per cue CC dan ukur durasinya (CC mengikuti audio).
5. Campur audio: narasi dominan, SFX sinkron, tanpa musik otomatis.
6. Bangun timeline scene, keyframe, dan transisi.
7. Render frame demi frame pada resolusi native, pipe ke FFmpeg; kanvas
   transisi dipakai ulang dan scene keluar dirender sekali per transisi.
8. Tulis sidecar CC (SRT + VTT); integritas cue diperiksa `validateCues`
   (waktu non-finite, terbalik, teks kosong, tumpang tindih, timing kata).
9. Validasi otomatis 12 titik; gagal = render gagal.

## Prinsip Desain

- Kebenaran data: durasi CC diukur dari audio nyata, bukan estimasi.
- Modularitas: style baru cukup menambah entri di `styles/library.ts`.
- Kebijakan permanen: `core/policy.ts` memvalidasi setiap render; proyek
  tidak dapat menonaktifkan persyaratan wajib secara diam-diam, termasuk
  larangan dominasi biru yang kini ditegakkan aktif, bukan sekadar warning.
- Integritas timeline: cue tanpa timestamp valid, tumpang tindih, atau
  durasi negatif ditolak, bukan diperbaiki diam-diam.
- Portabilitas: seluruh pipeline berjalan di GitHub Actions (Ubuntu).
