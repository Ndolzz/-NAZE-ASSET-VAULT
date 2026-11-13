# Pustaka Gaya Teks NAZE

66 preset tipografi reusable untuk layer `kind: "typography"` pada jalur
komposisi editorial-kinetic. Setiap preset memaketkan keluarga font, bobot,
jarak huruf, kapitalisasi, perlakuan warna (peran palet, gradien dua warna,
bayangan/glow), mode tipografi, keyframe entrance, dan gerak idle.

## Penggunaan

Tambahkan field `textStyle` pada layer tipografi di project.json:

```json
{ "id": "s1-title", "kind": "typography", "text": "ANCAMAN", "textStyle": "ink-slam", "box": [0.05, 0.3, 0.9, 0.3] }
```

Aturan prioritas: nilai eksplisit layer selalu menang. Preset hanya
mengisi `mode`, `underline`, `spinSpeed`, dan `enter` bila layer tidak
menetapkannya; font, bobot, jarak huruf, kapitalisasi, bayangan, gerak
idle, dan (bila layer tanpa `fill`) warna/gradien datang dari preset.
Id tak dikenal hanya memicu peringatan log; render tetap berjalan dengan
tipografi default.

## Registrasi font preset

Setiap preset menunjuk keluarga font yang dipetakan ke berkas TTF vault
lewat `TEXT_STYLE_FONT_FILES` (motion/text-styles.ts). Saat render,
`registerFonts` (render/renderer.ts) mendaftarkan seluruh keluarga pada
peta tersebut di bawah aliasnya sendiri, sehingga preset selalu dirender
dengan face aslinya apa pun style proyek. Keluarga yang sama dengan
`fontFamily` style dilewati agar perilaku style yang sudah berjalan tidak
berubah.

## Mode tipografi (11)

| Mode | Karakter visual |
|---|---|
| `oversized` | Satu kata diskalakan menguasai frame; bar aksen opsional |
| `stacked` | Kata ditumpuk sebagai baris besar independen, naik bertahap |
| `splitWords` | Setiap kata mengapung dan miring dengan fase sendiri |
| `rotating` | Rotasi kontinu dengan denyut skala |
| `perspective` | Tipe ter shear semu dengan bayangan cermin di bawah |
| `maskReveal` | Teks terungkap lewat mask lingkaran yang tumbuh |
| `collage` | Kolase tipografi: salinan tersebar plus satu salinan fokus |
| `brutalist` | Brutalisme editorial: tumpukan rata kiri/kanan bergantian, satu baris inverted, tipe solid tanpa bayangan/glow |
| `cinematic` | Judul sinematik: tracking lebar, dua rule tipis aksen, depth lewat offset solid |
| `outline` | Stempel outline: blok offset solid peran secondary plus goresan face |
| `highlight` | Sorot marker: kata masuk di atas bar aksen solid, teks knockout warna latar |

## Katalog

| # | Id | Nama | Font | Mode | Enter |
|---|---|---|---|---|---|
| 1 | `ink-slam` | Slam Tinta | NazeBarlow 900 | oversized | pop |
| 2 | `signal-flash` | Kilat Sinyal | NazeBarlow 900 | oversized | pop |
| 3 | `stencil-track` | Stencil Rapat | NazeBarlow 700 | oversized | wipe |
| 4 | `ticker-scroll` | Ticker Berjalan | NazeBarlow 800 | splitWords | slideL |
| 5 | `stacked-press` | Tumpukan Cetak | NazeJakarta 800 | stacked | rise |
| 6 | `mega-hero` | Hero Raksasa | NazeJakarta 900 | oversized | pop |
| 7 | `soft-corporate` | Korporat Lembut | NazeDMSans 600 | stacked | rise |
| 8 | `luxury-tracked` | Luxury Berjarak | NazeDMSans 500 | oversized | wipe |
| 9 | `gold-sheen` | Kilau Emas | NazeDMSans 700 | maskReveal | - |
| 10 | `data-counter` | Data Presisi | NazeDMSans 700 | stacked | rise |
| 11 | `neon-pulse` | Neon Berdenyut | NazeUrbanist 800 | oversized | pop |
| 12 | `retro-chrome` | Chrome Retro | NazeUrbanist 900 | perspective | - |
| 13 | `scan-tech` | Teknologi Pindai | NazeUrbanist 700 | stacked | slideR |
| 14 | `holo-flick` | Hologram | NazeUrbanist 800 | perspective | pop |
| 15 | `pop-slam` | Pop Stamp | NazeOutfit 900 | collage | pop |
| 16 | `bubble-fun` | Gelembung Fun | NazeOutfit 800 | splitWords | pop |
| 17 | `comic-burst` | Ledakan Komik | NazeBarlow 900 | oversized | spin |
| 18 | `sticker-pop` | Stiker Pop | NazePoppins 800 | collage | pop |
| 19 | `dreamy-float` | Mimpi Mengambang | NazePoppins 700 | splitWords | rise |
| 20 | `bold-statement` | Pernyataan Berani | NazePoppins 900 | oversized | rise |
| 21 | `hand-note` | Catatan Tangan | NazeFigtree 700 | stacked | rise |
| 22 | `sketch-wiggle` | Sketsa Goyang | NazeFigtree 800 | splitWords | pop |
| 23 | `paper-layer` | Lapisan Kertas | NazeMulish 800 | stacked | rise |
| 24 | `craft-soft` | Craft Lembut | NazeMulish 700 | oversized | rise |
| 25 | `clay-chunky` | Clay Tebal | NazeNunito 900 | oversized | pop |
| 26 | `friendly-round` | Ramah Bulat | NazeNunito 800 | splitWords | rise |
| 27 | `swiss-grid` | Swiss Grid | NazeInter 700 | oversized | wipe |
| 28 | `mono-caption` | Mono Keterangan | NazeInter 600 | stacked | slideL |
| 29 | `terminal-code` | Kode Terminal | NazeInter 600 | stacked | slideL |
| 30 | `binary-glitch` | Glitch Biner | NazeInter 800 | splitWords | spin |
| 31 | `editorial-press` | Editorial Tekan | NazeJakarta 900 | oversized | rise |
| 32 | `headline-break` | Headline Patah | NazeBarlow 900 | stacked | wipe |
| 33 | `quote-italic` | Kutipan Miring | NazeFigtree italic 600 | maskReveal | rise |
| 34 | `whisper-low` | Bisikan Rendah | NazeFigtree 500 | oversized | wipe |
| 35 | `shout-upper` | Teriakan Besar | NazeJakarta 900 | stacked | pop |
| 36 | `accent-strike` | Aksen Coretan | NazeRubik 800 | oversized | wipe |
| 37 | `rubber-stamp` | Stempel Karet | NazeRubik 900 | collage | pop |
| 38 | `tape-label` | Label Kertas | NazeMulish 700 | stacked | slideR |
| 39 | `dash-split` | Belah Kabin | NazePoppins 800 | splitWords | slideL |
| 40 | `focus-spot` | Sorot Fokus | NazeDMSans 800 | maskReveal | wipe |
| 41 | `rise-mist` | Naik Kabut | NazeUrbanist 600 | stacked | rise |
| 42 | `stamp-red` | Stempel Merah | NazeBarlow 900 | oversized | pop |
| 43 | `mirror-depth` | Cermin Kedalaman | NazePoppins 900 | perspective | rise |
| 44 | `orbit-spin` | Orbit Berputar | NazeOutfit 800 | rotating | pop |
| 45 | `loop-dizzy` | Putar Pusing | NazeJakarta 800 | rotating | spin |
| 46 | `iris-open` | Iris Terbuka | NazeNunito 800 | maskReveal | pop |
| 47 | `split-jump` | Lompat Terpisah | NazeOutfit 900 | splitWords | pop |
| 48 | `chill-drift` | Drift Tenang | NazeMulish 600 | oversized | rise |
| 49 | `double-tone` | Nada Ganda | NazeRubik 800 | stacked | wipe |
| 50 | `final-cut` | Potongan Final | NazeBarlow 900 | oversized | rise |
| 51 | `brutal-stack` | Tumpukan Brutal | NazeArchivo 900 | brutalist | pop |
| 52 | `brutal-invert` | Invert Brutal | NazeAnton 800 | brutalist | rise |
| 53 | `press-condensed` | Cetak Rapat | NazeBarlowCond 700 | stacked | wipe |
| 54 | `tall-poster` | Poster Tinggi | NazeTeko 700 | stacked | rise |
| 55 | `bebas-poster` | Poster Bebas | NazeBebas 800 | stacked | wipe |
| 56 | `state-poster` | Poster Negara | NazeStaatliches 800 | oversized | wipe |
| 57 | `cine-letterbox` | Sinema Letterbox | NazeManrope 600 | cinematic | wipe |
| 58 | `cine-epic` | Sinema Epik | NazeCinzel 700 | cinematic | wipe |
| 59 | `docu-mono` | Dokumenter Mono | NazePlexMono 600 | stacked | slideL |
| 60 | `docu-terminal` | Terminal Dokumenter | NazeShareTechMono 700 | stacked | slideL |
| 61 | `tech-outline` | Kerangka Tekno | NazeChakra 700 | outline | pop |
| 62 | `orbit-outline` | Orbit Garis | NazeOrbitron 700 | outline | wipe |
| 63 | `michroma-wide` | Michroma Lebar | NazeMichroma 800 | oversized | wipe |
| 64 | `rajdhani-stamp` | Stempel Rajdhani | NazeRajdhani 700 | outline | spin |
| 65 | `hero-highlight` | Sorot Hero | NazeLeagueSpartan 800 | highlight | pop |
| 66 | `grotesk-highlight` | Sorot Grotesk | NazeSpaceGrotesk 700 | highlight | rise |

## Arah visual preset 51-66

Preset baru menjauh dari efek tempelan (bayangan drop hijau, teks duplikat
hijau, glow neon berlebihan, gaya gaming RGB) dan memakai karakter font
sebagai identitas:

1. Editorial brutalism (51-52): tipe solid raksasa, perataan bergantian,
   satu baris inverted; tanpa bayangan dan glow.
2. Poster condensed (53-56): keluarga condensed/tebal dengan tracking
   ketat untuk hierarki poster.
3. Cinematic typography (57-58): tracking lebar, rule tipis, depth padat
   lewat offset solid, bukan glow.
4. Technology documentary (59-64): mono dan keluarga techno, termasuk
   tiga varian outline stempel.
5. Eksperimental highlight (65-66): bar marker solid dengan teks
   knockout, menyusun hierarki lewat masking dan skala.

## Aturan desain

1. Warna hanya memakai peran palet proyek (adaptif tema, tanpa warna keras).
2. Bayangan dan glow memakai peran palet dengan alpha terkontrol.
3. Gerak idle halus dan lambat (sinus, denyut, goyangan) pada 60 FPS.
4. Enter preset adalah default; layer dapat menimpanya dengan `enter` sendiri.
5. Semua font berasal dari keluarga yang terdaftar di engine (FONTS/GOOGLE).
