# Pustaka Style Visual NAZE

Tersedia 17 style permanen. Setiap style mendefinisikan tipografi, jenis
ilustrasi, goresan, shading, tekstur, komposisi, intensitas animasi, dan
set transisi. Style baru dapat ditambahkan di `src/styles/library.ts`
tanpa mengubah rendering engine.

| ID | Nama | Ilustrasi | Tekstur | Transisi |
|---|---|---|---|---|
| colorful-editorial | 01. Colorful Editorial | 2d-editorial | grain | slidePush, shapeWipe, wipe |
| cartoon-3d | 02. 3D Cartoon World | 3d-cartoon | none | shapeWipe, zoomDissolve, slidePush |
| comic-book | 03. Comic Book Motion | comic | halftone | panelSwipe, wipe, zoomDissolve |
| pop-art | 04. Pop Art | 2d-editorial | dots | shapeWipe, panelSwipe, slidePush |
| swiss-modern | 05. Swiss Modern Graphic | infographic | grid | wipe, zoomDissolve, slidePush |
| retro-futurism | 06. Retro Futurism | conceptual | scanlines | slidePush, dissolve, wipe |
| paper-cutout | 07. Paper Cutout | paper | paper | wipe, dissolve, slidePush |
| doodle-handdrawn | 08. Doodle & Hand Drawn | doodle | grain | wipe, dissolve, slidePush |
| minimal-luxury | 09. Minimal Luxury | conceptual | none | dissolve, wipe, slidePush |
| surreal-3d | 10. Surreal 3D | 3d-cartoon | none | zoomDissolve, shapeWipe, dissolve |
| memphis-design | 11. Memphis Design | abstract | dots | shapeWipe, slidePush, panelSwipe |
| cyberpunk-multicolor | 12. Cyberpunk Multicolor | conceptual | scanlines | zoomDissolve, panelSwipe, wipe |
| infographic-motion | 13. Infographic Motion | infographic | grid | wipe, slidePush, dissolve |
| mixed-media-collage | 14. Mixed Media Collage | collage | paper | panelSwipe, dissolve, wipe |
| anime-editorial | 15. Anime Editorial | anime | grain | wipe, panelSwipe, zoomDissolve |
| clay-3d | 16. Clay 3D | clay | none | shapeWipe, dissolve, slidePush |
| abstract-experimental | 17. Abstract Experimental | abstract | grain | zoomDissolve, shapeWipe, dissolve |

## Palet Warna

Delapan palet tersedia di `src/color/palette.ts`, masing-masing dengan lima
peran: background, primary, secondary, accent, dan text. Tidak ada palet
yang didominasi biru; `isBlueDominant()` memperingatkan jika sebuah palet
melanggar kebijakan warna. Proyek juga dapat mendefinisikan palet kustom
dengan lima peran warna hex yang lengkap.

## Rekomendasi Style

```bash
npx tsx src/cli.ts styles "kecerdasan buatan"
```

Menghasilkan lima style teratas untuk topik tersebut plus palet yang
direkomendasikan. Rekomendasi berbasis kata kunci topik pada field
`topics` setiap style.

## Mix Style

Sebuah proyek dapat menggabungkan beberapa style secara terkontrol:

```json
{ "style": ["colorful-editorial", "infographic-motion"] }
```

`resolveStyleMix` menjadikan style pertama sebagai identitas dasar dan
membatasi maksimal dua style aksen, sehingga video tetap konsisten.

## Tipografi

Setiap style menunjuk berkas font di vault (`FONTS/GOOGLE/...`) dengan
fallback. Font didaftarkan saat render dengan alias keluarga milik style,
jadi setiap style memiliki karakter tipografi sendiri.
