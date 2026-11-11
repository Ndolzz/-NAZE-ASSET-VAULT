# Adaptive Caption Engine

Sistem caption adaptif NAZE menggantikan subtitle statis dengan caption yang
menentukan sendiri tipe, posisi, gaya, dan animasinya dari konteks adegan.
Sistem ini menyatu dengan pipeline utama: aktif bila `project.captions.mode`
adalah `"adaptive"`; tanpa itu, jalur CC klasik (pill bawah) tetap dipakai.

## Aktifasi

```json
{
  "captions": { "mode": "adaptive" }
}
```

Opsi tambahan: `intensity` (0.2-2, default 1), `maxSimultaneous` (jumlah
caption imperatif serentak, default 3), `variation`, `safeArea`
(override { top, bottom, left, right }), `bottomMargin` (hanya jalur klasik).

## Tipe caption (24)

subtitle, top-subtitle, center-caption, floating-caption, left-caption,
right-caption, corner-caption, character-follow, object-follow,
speech-bubble, thought-bubble, dialogue-bubble, notification-bubble,
fullscreen-typography, side-annotation, split-caption, kinetic, annotation,
data-caption, impact, emphasis, instruction, editorial-subtitle, chat.

## Penempatan (17)

bottom, top, center, left, right, corner-tl, corner-tr, corner-bl, corner-br,
float, above-anchor, below-anchor, side-anchor, fullscreen, auto, dan
turunan anchor. Solver menguji beberapa kandidat, menilai konflik dengan
wilayah penting (wajah berbobot 10, judul, caption lain berbobot 9), jarak ke
anchor, dan batas safe area, lalu memilih skor terendah. Bila kandidat utama
tabrakan, kandidat alternatif dipakai otomatis.

## API imperatif

```ts
const engine = createCaptionEngine({ palette, style, fontFamily, config });
engine.loadTimeline(timeline, scenes);          // jalur deklaratif (pipeline)
const cap = engine.api("scene-1");
cap.show({ text: "Teknologi terus berkembang.", type: "kinetic", animation: "word-reveal", emphasis: ["Teknologi"], duration: 2500 });
cap.show({ text: "Coba perhatikan bagian ini!", type: "speech-bubble", anchor: { subject: 0 }, position: "auto", animation: "pop-in" });
cap.chat({ messages: [{ sender: "A", text: "Sudah lihat?" }, { sender: "B", text: "Belum." }], animation: "sequential" });
cap.annotate({ text: "SERVER ACTIVE", anchor: { subject: 1 }, position: "auto", animation: "fade-up" });
cap.hide(id);
```

Anchor: `{ subject: <indeks> }`, `{ layer: "<id layer>" }`, atau
`{ point: (t) => ({ x, y }) }` (ternormalisasi 0..1). Caption mengikuti
anchor yang bergerak (termasuk parent null dan kamera editorial) setiap frame.

## Direktif per scene (`scene.captions`)

Aturan konteks bisa dioverride per cue:

```json
"captions": [
  { "cueIndex": 0, "type": "speech-bubble", "anchor": { "subject": 0 }, "theme": "comic" },
  { "cueIndex": 1, "type": "notification-bubble", "position": "corner-tr" }
]
```

Bidang: `cueIndex` atau `match` (substring teks cue), `type`, `position`,
`animation`, `theme`, `variant`, `emphasis`, `anchor`, `messages`,
`sender`, `style`.

## Aturan konteks (berurutan)

1. Tanda kutip + karakter ada -> speech-bubble komik.
2. Kata chat/pesan/dm/balas/mengetik/notifikasi/terkirim -> chat.
3. Karakter + kata pikir/bingung/ragu/heran -> thought-bubble.
4. Ada angka -> data-caption (side-anchor bila ada objek).
5. Kata teknis + objek ada -> annotation.
6. Kata langkah/pertama/terakhir -> instruction.
7. Kata KAPITAL -> kinetic word-reveal.
8. Seru pendek (<= 7 kata) -> impact shake.
9. Pertanyaan -> emphasis scale-bounce.
10. > 12 kata -> editorial-subtitle.
11. Default: rotasi subtitle / top-subtitle / floating-caption.

## 20 preset animasi

fade-in, fade-up, fade-down, pop-in, scale-bounce, slide-left, slide-right,
slide-up, slide-down, typewriter, word-reveal, character-reveal, elastic,
overshoot, blur-reveal, mask-reveal, split-reveal, glitch, shake,
smooth-floating. Parameter: `at`, `duration`, `enter`, `exit`,
`intensity`. Semua preset dievaluasi deterministik dari waktu lokal.

## Varian kinetic typography

Tipe `kinetic` mendukung varian per kata yang digambar di `draw.ts`:

- `word` (default), `scalePop`, `bounce`, `char`: reveal kata/karakter
  bertahap dengan highlight kata aktif dari timing kata.
- `tracking`: letter-spacing melebar saat kata masuk, lalu menyempit ke
  spacing tema (memakai `ctx.letterSpacing`).
- `rotate`: kata masuk dengan rotasi -9 derajat yang easing ke 0 di sekitar
  pusat kata.
- `blur`: kata masuk dengan blur hingga 9px yang easing ke tajam
  (`ctx.filter`, dengan fallback tanpa filter bila tidak didukung).
- `mask` / `split`: reveal per kata dari progres animasi; alpha tidak lagi
  diterapkan ganda (perbaikan bug rendering sebelumnya).

## Sinkronisasi

Dengan engine narasi `espeak-ng`, durasi tiap cue diukur per cue dan
timing kata didistribusikan berbobot karakter di dalam rentang cue (lihat
`sync.ts`); highlight kata aktif di kinetic dan chat memakai timing ini.
Dengan engine `file` (suara manual), durasi cue adalah taksiran bobot teks.
Engine TIDAK menganalisis audio per kata; klaim sinkronisasi sebatas data
timeline produksi yang tersedia.

Timing tingkat kalimat tersedia lewat `distributeSentenceTimings(text,
start, end)` di `sync.ts`: durasi didistribusikan berbobot panjang kalimat
plus jeda tanda baca, monoton, tidak tumpang tindih, dan kalimat terakhir
selalu berakhir tepat di `end`.

## Impor SRT/VTT (parser.ts)

`parser.ts` mengimpor berkas subtitle eksternal menjadi cue engine:

```ts
import { parseSrt, parseVtt, linesToCues } from "./captions/parser";

const lines = parseSrt(fs.readFileSync("subs.srt", "utf8"));   // atau parseVtt
const cues = linesToCues(lines, { sceneId: "scene-1" });        // timing kata diisi otomatis
```

Perilaku:

- Timestamp hilang atau tidak valid melempar error yang menyebut bloknya;
  parser tidak pernah membuat timestamp palsu.
- Blok tanpa teks dilewati; header `WEBVTT`, baris `NOTE`, dan cue settings
  VTT (mis. `line:0 position:50%`) diabaikan; tag HTML dibersihkan.
- Format `HH:MM:SS,mmm` (SRT) dan `MM:SS.mmm` (VTT) didukung, koma dan titik
  desimal diterima.
- Segment yang tumpang tindih dinormalisasi oleh `linesToCues`: start cue
  di-clamp ke akhir cue sebelumnya sehingga timeline tetap monoton.

## Validasi integritas cue

`validateCues(cues, tolerance)` di `segmenter.ts` memeriksa perilaku
timeline, bukan sekadar keberadaan berkas: waktu non-finite, end < start,
teks kosong, cue tanpa timing kata, timing kata tidak valid, dan tumpang
tindih antar-cue. Pipeline produksi (Tahap 8) menjalankannya terhadap
timeline final; temuan dicatat sebagai `[CC-VALIDATE]`, digabung ke pemeriksaan
coverage CC, diteruskan ke validasi 12 titik, dan ditulis ke
`render-report.json`. `buildCuesFromDurations` juga menolak durasi negatif
atau non-finite agar timeline korup tidak bisa terbentuk.

## Penegakan dominasi warna

`naze.policy.json` menyatakan `color.blueDominanceForbidden`, dan kini
ditegakkan secara aktif di `core/policy.ts`: pipeline menghitung
`isBlueDominant(palette)` (Tahap 2) dan bila dua peran warna atau lebih
terdeteksi biru dominan, `validateAgainstPolicy` menghasilkan pelanggaran
`color.blueDominance` yang menggagalkan render. Satu-satunya jalur lolos
adalah override eksplisit `--explicit-override "<alasan >= 10 karakter>"`
sesuai kebijakan permanen.

## Responsif

Semua ukuran memakai unit = min(w, h) / 1080; posisi berbasis kandidat dan
safe area (vertikal: atas 5%, bawah 12% untuk UI TikTok/Reels, kanan 7%).
Format 1080x1920, 1920x1080, dan 1080x1080 didukung tanpa koordinat absolut.

## Pengujian

```bash
cd MOTION-ENGINE && npx tsx src/captions/caption-tests.ts
```

Menguji wrapping, pengukuran bubble, responsif tiga resolusi, safe area,
solver tabrakan (wajah + alternatif + anti-tumpukan), anchor klasik dan
layer, 20 preset, sinkronisasi kata, 11 aturan konteks, smoke render 17
tipe, determinisme piksel, dan engine end-to-end. Tambahan: timing kalimat,
round-trip parser SRT/VTT, penolakan timestamp hilang/invalid, blok kosong,
cue settings VTT, normalisasi tumpang tindih, `validateCues` (sehat,
tumpang tindih, teks kosong, waktu terbalik, non-finite), penolakan durasi
negatif, penegakan dominasi biru (lolos/pelanggaran/override eksplisit), dan
smoke render varian kinetic tracking/rotate/blur/mask. Langkah ini juga
berjalan di CI sebelum render (workflow "NAZE Render").

## Demo

`PROJECTS/CAPTION-DEMO` menampilkan perpindahan posisi (bawah -> atas),
speech bubble terikat karakter, thought bubble, chat berurutan, kinetic
kata-pasti, data caption terikat objek, notifikasi sudut, dan impact.
Proyek ini memakai narasi `espeak-ng` karena merupakan demo CI engine;
proyek produksi tetap memakai suara manual per proyek sesuai kebijakan.

## Batasan

- Teks narasi jangan dibungkus tanda kutip literal (contoh: `"Halo!"` pada `scene.narration`). Segmenter cue klasik memperlakukan kutipan penutup sebagai "kalimat" tersendiri sehingga pemeriksaan coverage kata validasi gagal. Gunakan direktif `speech-bubble` eksplisit alih-alih kutipan.
- Pengujian mandiri dan CI mendaftarkan font vault (`GlobalFonts.registerFromPath`) sebelum menggambar teks; runner CI tidak memiliki glyph yang dapat dirasterisasi untuk keluarga generik `sans-serif`, sehingga `measureText` tetap memberi metrik tetapi `fillText` tidak menggambar apa pun. Produksi mendaftarkan font melalui `registerFonts()` di `render/renderer.ts`.
- Timing kata tetap estimasi berbobot dalam rentang cue; tidak ada speech
  recognition atau pengukuran audio per kata di engine.
