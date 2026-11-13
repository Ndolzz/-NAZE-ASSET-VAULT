# Pustaka Gaya Teks NAZE

66 preset tipografi reusable untuk layer `kind: "typography"` pada jalur
komposisi editorial-kinetic. Setiap preset memaketkan keluarga font, bobot,
jarak huruf, kapitalisasi, perlakuan warna (peran palet, gradien dua warna,
bayangan/glow), mode tipografi, keyframe entrance, dan gerak idle.

## Registrasi font preset

Sejak perbaikan mesin tipografi, `registerFonts` (render/renderer.ts)
mendaftarkan setiap keluarga font preset dari peta `TEXT_STYLE_FONT_FILES`
(motion/text-styles.ts) di bawah aliasnya sendiri, sehingga preset selalu
dirender dengan face aslinya pada style apa pun. Keluarga yang sama dengan
`fontFamily` style dilewati agar perilaku style yang sudah berjalan tidak
berubah. Sebelum perbaikan ini, preset dengan keluarga di luar font style
jatuh diam-diam ke fallback sans-serif generik.

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
| 14 | `holo-flick` | Hologram | NazeUrbanist 8
00 | perspective | pop |
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
| 41 | `rise-mis
t` | Naik Kabut | NazeUrbanist 600 | stacked | rise |
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

## Mode tipografi (11)

Mode klasik: `oversized`, `stacked`, `splitWords`, `rotating`, `perspective`,
`maskReveal`, `collage`. Mode baru (perbaikan mesin tipografi):

- `brutalist` - editorial brutalism: baris raksasa bertumpuk dengan alignment
  bergantian (kiri/kanan/tengah) dan satu kata inverted pada blok solid.
  Tanpa bayangan, tanpa glow, tanpa gradien.
- `cinematic` - judul sinematik: tracking lebar, dua rule tipis aksen di atas
  dan bawah, satu pass offset warna background sebagai depth terkontrol.
- `outline` - stamp garis: blok offset solid pada peran `secondary` plus face
  stroke (strokeText) pada warna fill; depth lewat offset, bukan glow.
- `highlight` - marker editorial: setiap kata di-wipe di atas bar aksen solid,
  teks di-knockout dengan warna background; stagger per kata.

## Arah visual preset baru

- Editorial brutalism: `brutal-stack`, `brutal-invert`, `press-condensed`,
  `tall-poster`, `bebas-poster`, `state-poster` (font display vault:
  Archivo Black, Anton, Barlow Condensed, Teko, Bebas Neue, Staatliches).
- Cinematic: `cine-letterbox` (Manrope), `cine-epic` (Cinzel).
- Modern technology documentary: `docu-mono` (IBM Plex Mono),
  `docu-terminal` (Share Tech Mono), `tech-outline` (Chakra Petch),
  `orbit-outline` (Orbitron), `michroma-wide` (Michroma),
  `rajdhani-stamp` (Rajdhani).
- Eksperimental: `hero-highlight` (League Spartan),
  `grotesk-highlight` (Space Grotesk).

## Aturan desain

1. Warna hanya memakai peran palet proyek (adaptif tema, tanpa warna keras).
2. Bayangan dan glow memakai peran palet dengan alpha terkontrol.
3. Gerak idle halus dan lambat (sinus, denyut, goyangan) pada 60 FPS.
4. Enter preset adalah default; layer dapat menimpanya dengan `enter` sendiri.
5. Semua font berasal dari keluarga yang terdaftar di engine (FONTS/GOOGLE).
