# NAZE Color Library
- `app/index.html` : aplikasi (buka langsung di browser, tanpa server)
- `data/` : solid-palettes.json, gradients.json
- `tests/` : `node tests/build-data.js` lalu `node tests/validate.js`
- `VIBE-COLOR-RULES.md` : aturan pemilihan warna untuk Vibe
Status: 60 palet, 60 gradien, 30 gaya font (data/typography.json). Token: data/semantic-tokens.json, tokens/ (css-variables.css, design-tokens.json, tailwind-tokens.json) lewat `node tests/build-tokens.js` dan `node tests/validate-tokens.js`. Metadata: data/categories.json, data/color-tags.json, examples/project-config.example.json (`node tests/build-meta.js`). Belum ada: docs/, aplikasi membaca JSON.
