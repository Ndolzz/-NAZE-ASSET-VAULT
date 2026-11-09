# Pustaka Backdrop NAZE

30 aset latar (background) prosedural yang dapat dipakai di setiap proyek.
Setiap backdrop adaptif terhadap palet proyek (memakai peran text/primary/
secondary/accent), beranimasi sangat lambat, dan digambar dengan opasitas
rendah di bawah seluruh konten scene, pada jalur komposisi klasik maupun
jalur berlapis editorial-kinetic.

## Penggunaan

Per scene di project.json:

```json
{ "id": "scene-1", "backdrop": "city-night" }
```

Default untuk seluruh scene (level proyek):

```json
{ "name": "PROYEK", "backdrop": "blueprint", "scenes": [] }
```

Scene yang menyetel "backdrop" sendiri menimpa default proyek. Id yang
tidak dikenal hanya memicu peringatan log; render tetap berjalan dengan
latar polos.

## Katalog

| # | Id | Nama |
|---|---|---|
| 1 | `grid-fade` | Grid perspektif memudar ke atas |
| 2 | `dot-wave` | Kolom titik bergelombang sinus |
| 3 | `diag-stripes` | Garis diagonal paralel bergeser |
| 4 | `scanlines` | Garis CRT bergerak lambat |
| 5 | `starfield` | Bintang dua lapis parallax berkedip |
| 6 | `bokeh` | Lingkaran cahaya lembut naik |
| 7 | `concentric` | Cincin konsentris berdenyut |
| 8 | `sunburst` | Berkas sinar dari atas berayun |
| 9 | `hex-mesh` | Jala heksagon bergeser |
| 10 | `topographic` | Garis kontur peta bergelombang |
| 11 | `circuit` | Jejak sirkuit dengan node berdenyut |
| 12 | `terminal-rain` | Hujan karakter biner ala terminal |
| 13 | `radar-sweep` | Sapuan radar dengan cincin |
| 14 | `city-night` | Siluet skyline dua lapis dengan jendela menyala |
| 15 | `aurora` | Pita aurora berlapis bergelombang |
| 16 | `waves` | Garis gelombang horizontal bergeser |
| 17 | `checker-fade` | Papan catur memudar ke bawah |
| 18 | `halftone-burst` | Halftone membesar dari pusat ke tepi |
| 19 | `panel-stack` | Persegi panjang miring bertumpuk parallax |
| 20 | `arches` | Lengkungan berulang dari bawah |
| 21 | `memphis` | Bentuk memphis tersebar mengambang |
| 22 | `paper-fold` | Garis lipatan kertas origami |
| 23 | `ink-splash` | Blob tinta organik berdenyut lembut |
| 24 | `spotlight` | Kerucut sorot dari atas dengan lantai |
| 25 | `corner-frame` | Bracket sudut dan tick tepi ala HUD |
| 26 | `blueprint` | Grid teknik halus dengan marker silang |
| 27 | `noir-lines` | Garis kecepatan horizontal berjalan |
| 28 | `bubble-rise` | Gelembung outline naik perlahan |
| 29 | `triangle-mesh` | Segitiga outline berputar lambat |
| 30 | `gradient-veil` | Selubung gradien aksen atas dan bawah |

## Aturan desain

1. Opasitas rendah (sekitar 0.03-0.2) agar subjek, tipografi, dan CC tetap dominan.
2. Hanya memakai peran palet; tidak ada warna keras yang menimpa identitas proyek.
3. Animasi lambat dan halus (drift, denyut, parallax ringan) pada 60 FPS.
4. Deterministik dari seed scene; tidak ada noise acak antar frame.
5. Backdrop tidak pernah menggagalkan render: kegagalan menggambar jatuh ke latar polos.
