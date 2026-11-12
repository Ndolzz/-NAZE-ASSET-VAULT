# NAZE Asset Vault - Website Manajemen Aset

Situs manajemen aset untuk repository `Ndolzz/-NAZE-ASSET-VAULT`: frontend statis ringan
(HTML/CSS/JS murni, tanpa framework) + backend serverless (Vercel Functions) sebagai jembatan
aman ke GitHub API.

Situs ini HANYA lapisan manajemen aset dan pemantauan CI. Produksi video tetap dilakukan
melalui Vibe + Motion Engine; tidak ada bagian dari situs ini yang menggantikan engine.

## Arsitektur

```
┌────────────┐     statis (raw / Vercel)     ┌──────────────────┐
│  Browser   │ ────────────────────────────▶ │  WEBSITE (HTML/  │
│ (Android/  │                               │  CSS/JS murni)   │
│  desktop)  │ ◀──────────────────────────── │                  │
└─────┬──────┘   JSON (fetch, XHR upload)    └────────┬─────────┘
      │                                               │ fetch internal
      │  baca indeks (raw.githubusercontent)          ▼
      │  + fallback tree API                 ┌──────────────────┐
      ├────────────────────────────────────▶ │ WEBSITE/api/*    │  Vercel
      │                                      │ (Functions, CJS) │  Functions
      │                                      └────────┬─────────┘
      │                                               │ GitHub REST (App/PAT)
      │                                               ▼
      │                                      ┌──────────────────┐
      └────────────────────────────────────▶ │  GitHub repo     │
        CI: NAZE Vault Index → DATABASE/     │  (sumber data    │
            assets-index.json, dll.          │   utama)         │
                                             └──────────────────┘
```

- Repository adalah sumber data utama. Tidak ada database eksternal.
- Indeks (`DATABASE/assets-index.json`, `DATABASE/projects-index.json`) dibangun ulang penuh
  oleh workflow CI `NAZE Vault Index` dan selalu dapat diregenerasi dari isi repository.
- Sebelum indeks pertama ada, situs memakai fallback tree live dari GitHub API dan
  menandainya secara jujur di Dashboard.

## Menjalankan Secara Lokal

Frontend dapat dijalankan dengan server statis apa pun:

```bash
cd WEBSITE
python3 -m http.server 8080
# buka http://localhost:8080
```

Fitur baca (Dashboard, Assets, Projects) berjalan tanpa backend. Fitur tulis (unggah,
buat proyek, rename, move, delete, CI dispatch) memerlukan backend yang terpasang di
`/api/*` (lihat bagian Deploy).

## Deploy ke Vercel

1. Import repository ini ke Vercel dengan **Root Directory: `WEBSITE`**.
2. Set environment variables (lihat tabel di bawah).
3. Deploy. Endpoint `/api/*` otomatis menjadi serverless functions.

## Environment Variables (backend)

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `GITHUB_APP_ID` | jika mode App | ID GitHub App |
| `GITHUB_APP_PRIVATE_KEY` | jika mode App | Kunci privat PEM (`\n` literal otomatis diubah ke baris baru) |
| `GITHUB_INSTALLATION_ID` | jika mode App | ID instalasi App di repository |
| `GITHUB_TOKEN` | jika mode PAT | Token akses (fallback bila App tidak dipakai) |
| `GITHUB_OWNER` | tidak | Default `Ndolzz` |
| `GITHUB_REPO` | tidak | Default `-NAZE-ASSET-VAULT` |
| `GITHUB_BRANCH` | tidak | Default `main` |
| `ADMIN_GITHUB_USERS` | ya | Daftar username admin dipisah koma |
| `SESSION_SECRET` | ya | Secret HMAC sesi (min. 16 karakter) |
| `MAX_UPLOAD_MB` | tidak | Batas ukuran per file, 1-25 MB (default 4) |
| `RATE_LIMIT_PER_MINUTE` | tidak | Batas operasi tulis/login per menit (default 60) |

Mode GitHub App lebih disarankan (token instalasi berumur pendek, izin minimum:
Contents Read/Write, Actions Read/Write, Metadata Read).

## Keamanan

- Tidak ada kredensial di frontend; semua operasi tulis melewati backend.
- Sesi: cookie `HttpOnly; Secure; SameSite=Lax` bertanda tangan HMAC, TTL 8 jam.
- CSRF: double-submit cookie (`naze_csrf` + header `X-CSRF-Token`).
- PAT diverifikasi satu kali saat login (GET `/user` + allowlist admin) lalu dibuang.
- Validasi path ketat: traversal (`../`, `%2e%2e`, encoding ganda, null byte) ditolak;
  operasi dibatasi pada root yang diizinkan (VISUAL, AUDIO, FONTS, EXAMPLE_VIDEO,
  NAZE-3D/assets-3d, PROJECTS).
- Whitelist ekstensi unggahan; penolakan eksplisit untuk file terlalu besar.
- Commit atomik via Git Data API (blob → tree → commit → update ref) dengan deteksi
  konflik (409/422).
- Rate limit per instance untuk login dan operasi tulis.

## Batas Unggahan

- Default 4 MB per file (`MAX_UPLOAD_MB`, maksimum 25 MB).
- Batas praktis body Vercel ~4,5 MB; file besar secara eksplisit ditolak dengan pesan.
- Git LFS tidak dipakai dan tidak dipasang otomatis (repository saat ini tidak memakai LFS).

## Indexing & CI

- Workflow `.github/workflows/vault-index.yml` (`NAZE Vault Index`) berjalan saat push
  pada direktori aset/PROJECTS/DATABASE/SCRIPTS, membangun indeks, menjalankan test
  modul inti, lalu commit hasil indeks dengan `[skip ci]` agar tidak terjadi loop.
- Workflow lama (`render.yml`, `render-3d.yml`) tidak diubah dan tidak digandakan.

## Endpoint API

| Endpoint | Metode | Keterangan |
| --- | --- | --- |
| `/api/status` | GET | Status konfigurasi backend (tanpa rahasia) |
| `/api/auth` | GET/POST | Cek sesi / login PAT / logout |
| `/api/repo` | GET | Daftar file pada root yang diizinkan (butuh sesi) |
| `/api/repo` | POST | `upload` / `rename` / `move` / `delete` (butuh sesi + CSRF) |
| `/api/projects` | GET/POST | Daftar proyek / `create` / `create-folder` / `rename` / `delete` |
| `/api/actions` | GET/POST | Runs, detail run, log job / `rerun` / `dispatch` |

## Pemecahan Masalah

| Gejala | Penyebab umum | Solusi |
| --- | --- | --- |
| Banner "Backend API belum dikonfigurasi" | Env vars belum di-set di Vercel | Isi `ADMIN_GITHUB_USERS`, `SESSION_SECRET`, dan kredensial GitHub |
| Login ditolak "tidak ada dalam daftar admin" | Username tidak di `ADMIN_GITHUB_USERS` | Tambahkan username GitHub (huruf bebas, dicocokkan case-insensitive) |
| Upload gagal 413 | File melebihi batas | Perkecil file atau naikkan `MAX_UPLOAD_MB` (maks 25) |
| 409 `commit_conflict` | Branch berubah saat operasi | Segarkan lalu ulangi operasi |
| Dashboard "Tree live (indeks belum ada)" | Workflow index belum berjalan | Jalankan workflow `NAZE Vault Index` (Dispatch) atau push perubahan aset |
| Fallback live gagal | Rate limit API GitHub tanpa token | Tunggu atau pastikan indeks DATABASE/ sudah dibangun |
