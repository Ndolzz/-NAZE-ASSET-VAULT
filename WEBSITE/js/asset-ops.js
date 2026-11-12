/**
 * Pratinjau aset dan operasi aset global (rename, move, delete).
 * Pratinjau hanya diklaim berhasil bila elemen media benar-benar dirender;
 * kegagalan renderer selalu ditampilkan sebagai pesan, bukan diam-diam.
 */

import { escapeHtml, formatBytes, openModal, closeModal, confirmDialog, toast, extBadge, emptyState } from './ui.js';
import { rawUrl, backend, assertBackendReady, invalidateVaultCache, fetchAllFiles } from './api.js';

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm']);
const FONT_EXTS = new Set(['ttf', 'otf', 'woff', 'woff2']);

function findAsset(state, path) {
  return (state.vault.assetsIndex.assets || []).find((a) => a.path === path) || null;
}

export function previewAsset(asset) {
  const ext = asset.extension;
  const src = rawUrl(asset.path, true);
  let body = '';

  if (IMAGE_EXTS.has(ext)) {
    body = `<img class="preview-media" src="${escapeHtml(src)}" alt="${escapeHtml(asset.name)}"
      onerror="this.closest('.modal-body').querySelector('.preview-fallback').hidden=false; this.remove()">`;
  } else if (AUDIO_EXTS.has(ext)) {
    body = `<audio class="preview-media" controls preload="metadata" src="${escapeHtml(src)}"
      onerror="this.closest('.modal-body').querySelector('.preview-fallback').hidden=false; this.remove()"></audio>`;
  } else if (VIDEO_EXTS.has(ext)) {
    body = `<video class="preview-media" controls preload="metadata" src="${escapeHtml(src)}"
      onerror="this.closest('.modal-body').querySelector('.preview-fallback').hidden=false; this.remove()"></video>`;
  } else if (FONT_EXTS.has(ext)) {
    const fontId = `font-${Math.random().toString(36).slice(2, 8)}`;
    body = `
      <style>
        @font-face { font-family:"${fontId}"; src:url("${escapeHtml(src)}"); }
      </style>
      <div class="font-preview" style="font-family:'${fontId}', monospace;">
        <p class="font-sample-lg">NAZE Asset Vault 0123456789</p>
        <p class="font-sample">The quick brown fox jumps over the lazy dog - Pak Aji QZX</p>
      </div>`;
  } else {
    body = '';
  }

  openModal(`Pratinjau: ${asset.name}`, `
    ${body}
    <p class="preview-fallback" hidden>Pratinjau tidak dapat dirender untuk format ini. Gunakan tombol unduh untuk membuka file langsung.</p>
    <div class="preview-meta">
      ${extBadge(asset.extension)}
      <span class="mono">${escapeHtml(asset.path)}</span>
      <span>${formatBytes(asset.size)}</span>
    </div>
  `, {
    footerHtml: `
      <a class="btn" href="${escapeHtml(src)}" target="_blank" rel="noopener noreferrer">Buka di tab baru</a>
      <button type="button" class="btn" data-close-modal>Tutup</button>`,
    wide: true,
  });
}

function requireBackend(state) {
  try {
    assertBackendReady(state.backend);
  } catch (err) {
    toast(err.message, 'error', 6000);
    return false;
  }
  if (!state.session || !state.session.authenticated) {
    toast('Masuk sebagai admin terlebih dahulu (tombol Masuk di kanan atas).', 'warn', 6000);
    return false;
  }
  return true;
}

export function openAssetMenu(state, path, rerender) {
  const asset = findAsset(state, path);
  if (!asset) {
    toast('Aset tidak ditemukan dalam indeks.', 'error');
    return;
  }
  const overlay = openModal(`Aksi: ${asset.name}`, `
    <div class="menu-list">
      <button type="button" class="menu-item" data-act="preview">Pratinjau</button>
      <a class="menu-item" href="${escapeHtml(rawUrl(asset.path, true))}" target="_blank" rel="noopener noreferrer">Unduh / Buka</a>
      <button type="button" class="menu-item" data-act="rename">Ganti nama</button>
      <button type="button" class="menu-item" data-act="move">Pindahkan</button>
      <button type="button" class="menu-item menu-danger" data-act="delete">Hapus</button>
    </div>
    <p class="mono menu-path">${escapeHtml(asset.path)}</p>
  `);
  overlay.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    closeModal();
    if (act === 'preview') previewAsset(asset);
    if (act === 'rename') await renameFlow(state, asset.path, rerender);
    if (act === 'move') await moveFlow(state, [asset.path], rerender);
    if (act === 'delete') await deleteFlow(state, [asset.path], rerender);
  });
}

export function renameFlow(state, path, rerender) {
  if (!requireBackend(state)) return Promise.resolve();
  const currentName = path.split('/').pop();
  const overlay = openModal('Ganti Nama', `
    <label class="field">
      <span>Nama baru</span>
      <input type="text" id="rename-input" value="${escapeHtml(currentName)}" autocomplete="off" spellcheck="false">
    </label>
    <p class="field-hint mono">${escapeHtml(path)}</p>
  `, {
    footerHtml: `
      <button type="button" class="btn" data-cancel>Batal</button>
      <button type="button" class="btn btn-primary" id="rename-accept">Simpan</button>`,
  });
  return new Promise((resolve) => {
    overlay.querySelector('[data-cancel]').addEventListener('click', () => { closeModal(); resolve(); });
    overlay.querySelector('#rename-accept').addEventListener('click', async () => {
      const newName = overlay.querySelector('#rename-input').value.trim();
      try {
        await backend.rename(path, newName);
        closeModal();
        invalidateVaultCache();
        toast(`Berhasil mengganti nama menjadi "${newName}".`, 'success');
        rerender();
      } catch (err) {
        toast(err.message, 'error', 6000);
      }
      resolve();
    });
  });
}

export async function moveFlow(state, paths, rerender) {
  if (!requireBackend(state)) return;
  let dirs = [];
  try {
    const { blobs } = await fetchAllFiles();
    const dirSet = new Set();
    for (const blob of blobs) {
      const segments = blob.path.split('/');
      for (let i = 1; i < segments.length; i += 1) {
        dirSet.add(segments.slice(0, i).join('/'));
      }
    }
    dirs = [...dirSet].sort();
  } catch (err) {
    toast(`Gagal memuat daftar folder: ${err.message}`, 'error', 6000);
    return;
  }

  const overlay = openModal('Pindahkan', `
    <p class="field-hint">${paths.length} path akan dipindah.</p>
    <label class="field">
      <span>Folder tujuan</span>
      <select id="move-select">
        ${dirs.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('')}
      </select>
    </label>
  `, {
    footerHtml: `
      <button type="button" class="btn" data-cancel>Batal</button>
      <button type="button" class="btn btn-primary" id="move-accept">Pindahkan</button>`,
  });
  overlay.querySelector('[data-cancel]').addEventListener('click', closeModal);
  overlay.querySelector('#move-accept').addEventListener('click', async () => {
    const destDir = overlay.querySelector('#move-select').value;
    try {
      await backend.move(paths, destDir);
      closeModal();
      invalidateVaultCache();
      invalidateFileCache();
      toast(`Berhasil memindahkan ${paths.length} path ke ${destDir}.`, 'success');
      rerender();
    } catch (err) {
      toast(err.message, 'error', 6000);
    }
  });
}

export async function deleteFlow(state, paths, rerender) {
  if (!requireBackend(state)) return;
  const label = paths.length === 1 ? paths[0] : `${paths.length} path`;
  const ok = await confirmDialog({
    title: 'Hapus',
    message: `Hapus <span class="mono">${escapeHtml(label)}</span>? Tindakan ini membuat commit penghapusan dan tidak dapat dibatalkan dari web.`,
    confirmLabel: 'Hapus',
    danger: true,
  });
  if (!ok) return;
  try {
    await backend.deletePaths(paths);
    invalidateVaultCache();
    invalidateFileCache();
    toast('Penghapusan berhasil dicommit.', 'success');
    rerender();
  } catch (err) {
    toast(err.message, 'error', 6000);
  }
}

/** Delegasi klik untuk tombol pratinjau/menu pada halaman Assets. */
export function assetActionsHandlers(state, getRerender) {
  return (event) => {
    const previewBtn = event.target.closest('[data-preview]');
    if (previewBtn) {
      const asset = findAsset(state, previewBtn.dataset.preview);
      if (asset) previewAsset(asset);
      return;
    }
    const menuBtn = event.target.closest('[data-menu]');
    if (menuBtn) {
      openAssetMenu(state, menuBtn.dataset.menu, getRerender());
    }
  };
}
