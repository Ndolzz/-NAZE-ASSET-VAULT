# Pustaka Skema Warna (100 kombinasi warna dasar)

Setiap skema memaketkan lima peran palet (latar, primer, sekunder, aksen, teks) yang sudah tervalidasi kontras WCAG dan bebas dominasi biru permanen, plus rekomendasi pasangan lintas pustaka editing. Karena seluruh sistem render NAZE (tipografi, CC, backdrop, ilustrasi, transisi) membaca peran palet, satu skema otomatis memberi warna yang nyambung untuk semua aset editing.

## API project.json

```json
"colorScheme": "malam-ancaman"
```

- Tanpa field `palette`: seluruh palet diambil dari skema.
- Dengan `palette` objek: field eksplisit menang per peran; skema mengisi peran yang tidak ditulis (merge).
- Dengan `palette` string preset: preset menang penuh; skema hanya dicatat sebagai referensi.
- Id tak dikenal: peringatan `[COLOR-SCHEME]` di log, render tetap lanjut dengan palet proyek.
- Pasangan (textStyle / ccStyle / backdrop) hanyalah rekomendasi; field eksplisit proyek selalu menang.

## Aturan desain

- Kontras teks/latar minimal 4.5:1 (WCAG AA).
- Kontras primer/latar minimal 2.5:1 (primer dipakai untuk blok warna dan tipografi besar).
- Kontras aksen/latar minimal 2.2:1; pada mode gelap luminansi aksen minimal 0.18 agar kata aksen terbaca.
- Kontras sekunder/latar minimal 1.4:1 (peran pendukung halus).
- Maksimal satu peran bernada biru per skema (kebijakan anti dominasi biru permanen NAZE).
- Menambah skema: tambahkan entri `SC(...)` di `src/color/color-schemes.ts` dan baris katalog di bawah.

## Katalog 100 skema

| # | id | nama | mode | latar | primer | sekunder | aksen | teks | suasana | pasangan (teks / CC / backdrop) |
|---|----|------|------|-------|--------|----------|-------|------|---------|----------------------------------|
| 1 | editorial-ink-classic | Editorial Ink Classic | terang | #F2F0EB | #111111 | #2E2E2E | #E63B2E | #0A0A0A | editorial | editorial-press / headline-word / ink-splash |
| 2 | malam-ancaman | Malam Ancaman | gelap | #0B0B0F | #F2F0EB | #8E8E99 | #E63B2E | #F5F5F0 | editorial | ink-slam / midnight-orbit / city-night |
| 3 | paper-press | Paper Press | terang | #FAF7F0 | #1A1A1A | #6B6B5F | #C2410C | #1C1917 | editorial | editorial-press / docu-note / paper-fold |
| 4 | newsprint-cool | Newsprint Cool | terang | #EEF1F2 | #22303A | #5C7382 | #B91C1C | #16232B | editorial | swiss-grid / left-diary / grid-fade |
| 5 | ink-noir | Ink Noir | gelap | #0A0A0A | #EDEDED | #9CA3AF | #F59E0B | #F5F5F5 | editorial | mono-caption / shadow-rise / noir-lines |
| 6 | crimson-ledger | Crimson Ledger | gelap | #14100E | #F3E9DC | #A89A85 | #EF4444 | #F5EFE6 | editorial | headline-break / banner-bottom / halftone-burst |
| 7 | sage-notebook | Sage Notebook | terang | #F4F1EA | #3F4A3C | #8A9484 | #D97706 | #2A3327 | editorial | quote-italic / docu-note / topographic |
| 8 | archive-sepia | Archive Sepia | terang | #F0E6D2 | #4A3728 | #8C7355 | #A63C2E | #3B2D22 | editorial | rubber-stamp / retro-scan / corner-frame |
| 9 | graphite-alert | Graphite Alert | gelap | #17181C | #E8E9ED | #8B8F9C | #FF4D4D | #F2F3F7 | editorial | shout-upper / alert-shake / blueprint |
| 10 | offwhite-mint | Off-White Mint | terang | #F7F6F1 | #14343B | #4E7A74 | #D9534F | #10262B | editorial | mono-caption / soft-reveal / checker-fade |
| 11 | terminal-phosphor | Terminal Phosphor | gelap | #04100A | #D1FAE5 | #10B981 | #34D399 | #ECFDF5 | cyber gelap | terminal-code / terminal-type / terminal-rain |
| 12 | radar-amber | Radar Amber | gelap | #14100A | #F5EEDC | #B45309 | #F59E0B | #F8F0DC | cyber gelap | data-counter / ping-pong / radar-sweep |
| 13 | signal-crimson | Signal Crimson | gelap | #120A0C | #F7E8EA | #8E3B46 | #FF4D6D | #FBEFF1 | cyber gelap | signal-flash / alert-shake / scanlines |
| 14 | cyber-mint | Cyber Mint | gelap | #061210 | #D9F7EE | #147D64 | #2DD4BF | #E7FBF5 | cyber gelap | scan-tech / glitch-scan / circuit |
| 15 | violet-console | Violet Console | gelap | #0E0A16 | #EDE9FE | #7C3AED | #F472B6 | #F5F3FF | cyber gelap | binary-glitch / neon-pop / hex-mesh |
| 16 | hacker-lime | Hacker Lime | gelap | #0A0F06 | #ECFCCB | #65A30D | #A3E635 | #F7FEE7 | cyber gelap | terminal-code / char-stream / terminal-rain |
| 17 | midnight-teal | Midnight Teal | gelap | #06141B | #DFF3F7 | #0E7490 | #2DD4BF | #EAF8FB | cyber gelap | scan-tech / signal-bounce / radar-sweep |
| 18 | night-circuit | Night Circuit | gelap | #0A0E14 | #E6EDF3 | #3B4A5C | #FF7A45 | #F0F4F8 | cyber gelap | data-counter / notify-stream / circuit |
| 19 | alert-orange | Alert Orange | gelap | #100C07 | #F5EBDD | #C2410C | #FB923C | #F8F2E8 | cyber gelap | shout-upper / alert-shake / diag-stripes |
| 20 | dusk-panel | Dusk Panel | gelap | #0D0F1A | #E8E9F5 | #6B7280 | #FF8FA3 | #F3F4FA | cyber gelap | mono-caption / side-story / panel-stack |
| 21 | sunset-hero | Sunset Hero | terang | #FFF4E6 | #FF6B35 | #F7C548 | #D7263D | #1A1A1A | hangat senja | bold-statement / headline-word / sunburst |
| 22 | terracotta-dusk | Terracotta Dusk | terang | #FBEEE4 | #C4553A | #D9A066 | #2F6B4F | #3B241C | hangat senja | editorial-press / docu-note / arches |
| 23 | desert-noon | Desert Noon | terang | #FDF2DC | #C2410C | #D4A017 | #0F766E | #3B2A18 | hangat senja | gold-sheen / ticker-top / sunburst |
| 24 | ember-night | Ember Night | gelap | #170D0A | #F5E3D7 | #B45309 | #FF6B35 | #FAF0E8 | hangat senja | stamp-red / shadow-rise / halftone-burst |
| 25 | amber-glass | Amber Glass | gelap | #1C1409 | #F7ECD4 | #A16207 | #FBBF24 | #FBF3DF | hangat senja | luxury-tracked / gold-instruction / spotlight |
| 26 | coral-cream | Coral Cream | terang | #FFF6EC | #E0575B | #F2A65A | #0E7C66 | #3D2527 | hangat senja | dreamy-float / soft-bounce / bubble-rise |
| 27 | rust-paper | Rust Paper | terang | #F6E8DA | #9A3412 | #C08552 | #2F5D50 | #382419 | hangat senja | hand-note / docu-note / paper-fold |
| 28 | golden-hour | Golden Hour | terang | #FFF1DE | #D97706 | #F4A261 | #C2410C | #3F2A12 | hangat senja | gold-sheen / top-lamp / sunburst |
| 29 | molten-core | Molten Core | gelap | #120B08 | #FDE8C8 | #EA580C | #FFB020 | #FFF1DC | hangat senja | shout-upper / zoom-word / ink-splash |
| 30 | spice-market | Spice Market | terang | #FBEEDC | #B34124 | #C48B28 | #55703F | #3A2416 | hangat senja | sticker-pop / drift-float / memphis |
| 31 | forest-editorial | Forest Editorial | terang | #F2F5EF | #1E3A2A | #5B8A6E | #D97706 | #16281C | alam bumi | bold-statement / docu-note / topographic |
| 32 | deep-forest | Deep Forest | gelap | #0A120C | #DCEFE2 | #2D6A4F | #74C69D | #E9F5EC | alam bumi | whisper-low / soft-reveal / aurora |
| 33 | moss-stone | Moss Stone | terang | #EDEFE6 | #3B4A36 | #8B9578 | #B45309 | #28311F | alam bumi | hand-note / docu-note / noir-lines |
| 34 | savanna-gold | Savanna Gold | terang | #F8F1DF | #A06B22 | #C9A45B | #2F6B3F | #3B2E18 | alam bumi | gold-sheen / ticker-top / topographic |
| 35 | leaf-vein | Leaf Vein | terang | #F4F7EE | #2D5A27 | #7CA45F | #C2410C | #1E3A17 | alam bumi | sketch-wiggle / soft-reveal / waves |
| 36 | rainstone | Rainstone | terang | #E9EDEA | #2E3A36 | #6C7A72 | #0E8A6E | #222B27 | alam bumi | swiss-grid / left-diary / grid-fade |
| 37 | jungle-humid | Jungle Humid | gelap | #0B1410 | #D6EFDC | #3E7C59 | #F4D35E | #E8F5EA | alam bumi | pop-slam / elastic-pop / waves |
| 38 | clay-earth | Clay Earth | terang | #F1E3D3 | #7A4A32 | #B08968 | #386641 | #3A2718 | alam bumi | clay-chunky / soft-bounce / arches |
| 39 | alpine-mist | Alpine Mist | terang | #EEF3F2 | #263B44 | #6E8B94 | #C0453A | #1C2A30 | alam bumi | swiss-grid / blur-focus / topographic |
| 40 | wetland-teal | Wetland Teal | gelap | #071110 | #CFF4EC | #0F766E | #FACC15 | #E2F6F1 | alam bumi | mono-caption / drift-float / waves |
| 41 | lagoon-light | Lagoon Light | terang | #EFF9F7 | #147D74 | #5FA8A0 | #C75B39 | #123A36 | lautan | soft-corporate / soft-reveal / waves |
| 42 | deep-current | Deep Current | gelap | #061418 | #D5F1F4 | #0E7490 | #FACC15 | #E6F7F9 | lautan | data-counter / wide-stack / waves |
| 43 | seafoam-paper | Seafoam Paper | terang | #F2F7F4 | #147D74 | #8FCBB9 | #E76F51 | #1B3A36 | lautan | friendly-round / drift-float / bubble-rise |
| 44 | tide-ink | Tide Ink | gelap | #0A1A20 | #D8EDF2 | #3D7A8C | #FF9E64 | #E7F4F7 | lautan | mono-caption / side-story / gradient-veil |
| 45 | coral-reef | Coral Reef | terang | #FFF5EE | #E05B4D | #48AFA0 | #0B7285 | #33211D | lautan | bubble-fun / elastic-pop / bubble-rise |
| 46 | abyss-glow | Abyss Glow | gelap | #040D12 | #C9E8F0 | #155E75 | #5EEAD4 | #DFF3F8 | lautan | neon-pulse / neon-pop / aurora |
| 47 | harbor-fog | Harbor Fog | terang | #EAEFEA | #24403C | #71887F | #C75B39 | #1E302C | lautan | soft-corporate / docu-note / noir-lines |
| 48 | salt-wind | Salt Wind | terang | #F5F3EA | #2C5F63 | #80A8A4 | #E07A5F | #1F3A3C | lautan | quote-italic / soft-bounce / waves |
| 49 | storm-surf | Storm Surf | gelap | #0C1214 | #E2ECEA | #46626A | #F4623A | #EBF2F0 | lautan | bold-statement / wave-slide / dot-wave |
| 50 | lagoon-sunset | Lagoon Sunset | terang | #FDEFE0 | #0E7C6B | #F4A261 | #C2410C | #173B33 | lautan | dreamy-float / ping-pong / sunburst |
| 51 | noir-gold | Noir Gold | gelap | #0C0B09 | #E8DCC8 | #A67C52 | #E0B84C | #F5EFE2 | mewah elegan | luxury-tracked / gold-instruction / spotlight |
| 52 | ivory-champagne | Ivory Champagne | terang | #FAF6EE | #8A6D3B | #C5A96C | #8C2F39 | #241E14 | mewah elegan | whisper-low / soft-reveal / corner-frame |
| 53 | emerald-velvet | Emerald Velvet | gelap | #081410 | #DAEDE3 | #0F5C46 | #D4AF37 | #E8F4EE | mewah elegan | gold-sheen / gold-instruction / spotlight |
| 54 | sapphire-vault | Sapphire Vault | gelap | #070B12 | #E4E9F2 | #1E3A8A | #E0B84C | #EEF1F8 | mewah elegan | luxury-tracked / top-lamp / blueprint |
| 55 | burgundy-suite | Burgundy Suite | gelap | #16090C | #F1E2E5 | #6B2737 | #D4AF37 | #F7ECEE | mewah elegan | quote-italic / spotlight-center / noir-lines |
| 56 | pearl-onyx | Pearl Onyx | gelap | #0E0E10 | #EFEFEF | #A8A29B | #C9A227 | #F7F6F4 | mewah elegan | mono-caption / center-stage / gradient-veil |
| 57 | marble-brass | Marble Brass | terang | #F5F2EB | #1C1C1C | #8C8577 | #B08D57 | #1A1917 | mewah elegan | luxury-tracked / docu-note / corner-frame |
| 58 | velvet-night | Velvet Night | gelap | #120A18 | #E9E0F2 | #5B3A70 | #E0B84C | #F3ECF7 | mewah elegan | mirror-depth / neon-pop / aurora |
| 59 | copper-lounge | Copper Lounge | gelap | #130D0A | #F2E5D8 | #8C4B32 | #E8965A | #F8EEE4 | mewah elegan | gold-sheen / gold-instruction / ink-splash |
| 60 | platinum-quiet | Platinum Quiet | terang | #F4F4F2 | #2B2B2E | #9A9A9E | #9C7C3C | #232325 | mewah elegan | whisper-low / soft-reveal / gradient-veil |
| 61 | candy-bounce | Candy Bounce | terang | #FFF0F5 | #FF5D8F | #B983FF | #D7263D | #2D2D32 | pop ceria | pop-slam / comic-punch / memphis |
| 62 | bubblegum-pop | Bubblegum Pop | terang | #FFF4FA | #E85D9E | #9D4EDD | #C2410C | #331B2E | pop ceria | bubble-fun / elastic-pop / bubble-rise |
| 63 | lemon-soda | Lemon Soda | terang | #FEFCE8 | #D97706 | #84CC16 | #EC4899 | #3A2A08 | pop ceria | friendly-round / soft-bounce / dot-wave |
| 64 | tangerine-zoom | Tangerine Zoom | terang | #FFF7ED | #EA580C | #FDBA74 | #7C3AED | #431407 | pop ceria | pop-slam / zoom-word / sunburst |
| 65 | bubble-mint | Bubble Mint | terang | #EFFDF8 | #0D9488 | #6EE7B7 | #F43F5E | #0F2E24 | pop ceria | friendly-round / ping-pong / bubble-rise |
| 66 | grape-soda | Grape Soda | terang | #FAF5FF | #9333EA | #F9A8D4 | #DB2777 | #2E1065 | pop ceria | pop-slam / neon-pop / bokeh |
| 67 | cherry-burst | Cherry Burst | terang | #FFF0EE | #E11D48 | #FB7185 | #05a0bb | #3F0713 | pop ceria | comic-burst / comic-punch / halftone-burst |
| 68 | skittle-rainbow | Skittle Rainbow | terang | #FDF8E7 | #FF6F61 | #6B5B95 | #D1495B | #222222 | pop ceria | sticker-pop / elastic-pop / memphis |
| 69 | pop-tart | Pop Tart | terang | #FCFDF2 | #FF6B6B | #F5C518 | #4D96FF | #33272A | pop ceria | bubble-fun / jump-cut / checker-fade |
| 70 | rocket-red | Rocket Red | terang | #FFF4F1 | #DC2626 | #FCA5A5 | #2563EB | #450A0A | pop ceria | shout-upper / alert-shake / concentric |
| 71 | peach-melody | Peach Melody | terang | #FFF4EB | #E07A5F | #F2CC8F | #3D405B | #3B2C26 | pastel lembut | dreamy-float / soft-bounce / bokeh |
| 72 | lilac-whisper | Lilac Whisper | terang | #F6F2FA | #8E7CC3 | #CBB9E9 | #D1495B | #33283F | pastel lembut | dreamy-float / soft-reveal / bokeh |
| 73 | mint-cream | Mint Cream | terang | #F0FAF5 | #2A9D8F | #A7DAD1 | #E76F51 | #143D35 | pastel lembut | friendly-round / drift-float / bubble-rise |
| 74 | butter-sky | Butter Sky | terang | #FFFBEA | #A8842C | #E0C48F | #5B7C99 | #443722 | pastel lembut | hand-note / drift-float / sunburst |
| 75 | rose-mist | Rose Mist | terang | #FBF0F4 | #C94F7C | #E8B4C8 | #2E6B5E | #3D2230 | pastel lembut | dreamy-float / ping-pong / bokeh |
| 76 | cloud-lavender | Cloud Lavender | terang | #F4F6FB | #6D5B8E | #AAA3C2 | #BC4749 | #2B2740 | pastel lembut | whisper-low / soft-reveal / gradient-veil |
| 77 | seaglass-soft | Seaglass Soft | terang | #EDF6F2 | #4E8D7C | #A3C9BD | #E58F3D | #234039 | pastel lembut | friendly-round / soft-bounce / waves |
| 78 | dawn-blush | Dawn Blush | terang | #FCF4F0 | #CE8C7B | #D9A88F | #4F6D7A | #42302B | pastel lembut | quote-italic / soft-reveal / sunburst |
| 79 | honey-oat | Honey Oat | terang | #FBF6EC | #A8853F | #D8C7A1 | #9C3D2E | #3B3120 | pastel lembut | craft-soft / docu-note / paper-fold |
| 80 | powder-day | Powder Day | terang | #F2F6F9 | #5A7D9A | #A8C0D4 | #E07A5F | #263649 | pastel lembut | soft-corporate / blur-focus / bokeh |
| 81 | retro-diner | Retro Diner | terang | #FAF2DC | #D9432F | #E8A33D | #3D5A6C | #3B2A1C | retro vintage | retro-chrome / retro-scan / checker-fade |
| 82 | mustard-avocado | Mustard Avocado | terang | #F4EED6 | #7E8A3A | #C4A026 | #C2410C | #33301B | retro vintage | hand-note / retro-scan / paper-fold |
| 83 | seventies-flower | Seventies Flower | terang | #F5E9DC | #B5644D | #DAA662 | #516B50 | #3A271E | retro vintage | sticker-pop / retro-scan / memphis |
| 84 | sepia-film | Sepia Film | gelap | #0F0C08 | #F0E3CC | #8C7355 | #D4A017 | #F5EAD3 | retro vintage | quote-italic / docu-note / corner-frame |
| 85 | polaroid-fade | Polaroid Fade | terang | #F3EEE3 | #5A5346 | #9A9182 | #C03A22 | #3E362B | retro vintage | hand-note / left-diary / bokeh |
| 86 | cassette-neon | Cassette Neon | gelap | #171024 | #F0E8F8 | #8C43A8 | #FF5D8F | #F5EEF8 | retro vintage | retro-chrome / neon-pop / scanlines |
| 87 | arcade-night | Arcade Night | gelap | #0D0714 | #E8DFF5 | #7C3AED | #FFD93D | #F1EBF8 | retro vintage | binary-glitch / retro-scan / starfield |
| 88 | vinyl-orange | Vinyl Orange | gelap | #140D08 | #F7E9D9 | #B45309 | #FF9E64 | #FAF0E5 | retro vintage | retro-chrome / ticker-top / halftone-burst |
| 89 | newsstand-cream | Newsstand Cream | terang | #F7F2E7 | #3F3F38 | #8A8578 | #B91C1C | #2E2E28 | retro vintage | editorial-press / headline-word / grid-fade |
| 90 | halftone-retro | Halftone Retro | terang | #EFEAE0 | #232020 | #7A756E | #DC3B30 | #201E1C | retro vintage | stencil-track / retro-scan / halftone-burst |
| 91 | crimson-noir | Crimson Noir | gelap | #0C0507 | #F7E6E8 | #8E1F30 | #FF3B30 | #FBEFF0 | dramatis sinematik | stamp-red / alert-shake / ink-splash |
| 92 | violet-dusk | Violet Dusk | gelap | #0F0A1A | #EAE4F5 | #5B3A8C | #F472B6 | #F2EEF9 | dramatis sinematik | mirror-depth / neon-pop / starfield |
| 93 | inferno-alert | Inferno Alert | gelap | #120604 | #FBEDE3 | #B91C1C | #F97316 | #FFF3EA | dramatis sinematik | shout-upper / alert-shake / ink-splash |
| 94 | monsoon-stone | Monsoon Stone | gelap | #101416 | #E3E9E8 | #55666A | #F4A259 | #ECF1F0 | dramatis sinematik | whisper-low / wave-slide / aurora |
| 95 | blood-moon | Blood Moon | gelap | #150709 | #F5E2DC | #7A1F1F | #FF6B6B | #F9ECE8 | dramatis sinematik | stamp-red / zoom-word / starfield |
| 96 | toxic-dusk | Toxic Dusk | gelap | #0C0F08 | #EAF2DC | #5B7A1E | #A3E635 | #EFF6E3 | dramatis sinematik | neon-pulse / glitch-scan / terminal-rain |
| 97 | royal-purple | Royal Purple | gelap | #120A1C | #EFE6F8 | #6D28D9 | #FBBF24 | #F5EFF9 | dramatis sinematik | luxury-tracked / orbit-mega / concentric |
| 98 | shadow-emerald | Shadow Emerald | gelap | #06100D | #DDF0E7 | #14532D | #6EE7B7 | #E8F5EE | dramatis sinematik | whisper-low / spotlight-center / aurora |
| 99 | blackout-warning | Blackout Warning | gelap | #0A0A0A | #F5F5F5 | #525252 | #FFD400 | #FAFAFA | dramatis sinematik | shout-upper / alert-shake / noir-lines |
| 100 | golden-eclipse | Golden Eclipse | gelap | #0D0B04 | #F7F0DC | #A67C52 | #F5C518 | #FAF4E0 | dramatis sinematik | gold-sheen / gold-instruction / spotlight |

