/**
 * Halaman Projects: daftar proyek, browser folder dengan breadcrumb,
 * buat/ganti nama/hapus proyek, buat folder, unggah dalam proyek, dan
 * operasi file per proyek.
 */

import { escapeHtml, formatBytes, openModal, closeModal, confirmDialog, toast, extBadge, emptyState, errorState } from './ui.js';
import { rawUrl, backend, assertBackendReady, invalidateVaultCache, invalidateFileCache, uploadWithProgress, fetchAllFiles } from './api.js';
import { previewAsset } from './asset-ops.js';

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

function rerender() {
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']);

function fileThumb(blob) {
  const ext = (blob.path.split('.').pop() || '').toLowerCase();
  if (IMAGE_EXTS.has(ext)) {
    return `<img class="file-thumb" loading="lazy" src="${escapeHtml(rawUrl(blob.path, true))}" alt=""
      onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ext-badge ext-other',textContent:'?'}))">`;
  }
  return extBadge(ext);
}

export function renderProjects(el, state) {
  const params = new URLSearchParams((location.hash.split('?')[1] || ''));
  const openName = params.get('open');

  if (openName === '__new__') {
    renderProjectList(el, state);
    createProjectFlow(state);
    return;
  }
  if (openName) {
    renderProjectBrowser(el, state, openName, params.get('dir') || '');
    return;
  }
  renderProjectList(el, state);
}

function renderProjectList(el, state) {
  const projects = state.vault.projectsIndex.projects || [];
  const rootFiles = state.vault.projectsIndex.rootFiles || [];

  const projectCards = projects.length > 0
    ? `<div class="project-grid">${projects.map((p) => `
        <article class="project-card">
          <h3><a href="#/projects?open=${encodeURIComponent(p.name)}">${escapeHtml(p.name)}</a></h3>
          <div class="project-meta">
            <span>${p.fileCount} file</span>
            <span>${formatBytes(p.totalBytes)}</span>
            ${p.hasProjectJson ? '<span class="pill pill-success">project.json</span>' : '<span class="pill pill-muted">tanpa project.json</span>'}
          </div>
          <div class="folder-chips">
            ${p.folders.map((f) => `<a class="folder-chip" href="#/projects?open=${encodeURIComponent(p.name)}&dir=${encodeURIComponent(f)}">${escapeHtml(f)}</a>`).join('')}
          </div>
          <div class="project-actions">
            <a class="btn btn-sm" href="#/projects?open=${encodeURIComponent(p.name)}">Buka</a>
            <button type="button" class="btn btn-sm" data-rename-project="${escapeHtml(p.name)}">Ganti nama</button>
            <button type="button" class="btn btn-sm btn-danger-ghost" data-delete-project="${escapeHtml(p.name)}">Hapus</button>
          </div>
        </article>`).join('')}</div>`
    : emptyState('&#128193;', 'Belum ada proyek', 'Buat proyek pertama untuk menata aset produksi.');

  const rootFileRows = rootFiles.length > 0
    ? rootFiles.map((f) => `
        <div class="asset-row">
          ${extBadge((f.name.split('.').pop() || '').toLowerCase())}
          <span class="asset-name">${escapeHtml(f.name)}</span>
          <span class="asset-row-sub">root PROJECTS/</span>
          <span class="asset-row-size">${formatBytes(f.size)}</span>
          <div class="asset-actions">
            <a class="btn btn-sm" href="${escapeHtml(rawUrl(f.path, true))}" target="_blank" rel="noopener noreferrer">Unduh</a>
          </div>
        </div>`).join('')
    : '';

  el.innerHTML = `
    <div class="toolbar">
      <input type="search" id="project-search" placeholder="Cari proyek..." aria-label="Cari proyek">
      <span class="toolbar-spacer"></span>
      <button type="button" class="btn btn-primary" id="btn-create-project">+ Proyek Baru</button>
    </div>
    <div id="project-list-wrap">
      ${projects.length > 0 ? '' : ''}
      <div id="project-grid-holder">${projectCards}</div>
      ${rootFiles.length > 0 ? `
      <section class="panel">
        <h2>File Lepas di PROJECTS/</h2>
        <p class="field-hint">File ini tidak dipindahkan otomatis agar struktur lama tetap utuh.</p>
        <div class="asset-list">${rootFileRows}</div>
      </section>` : ''}
    </div>
  `;

  el.querySelector('#btn-create-project').addEventListener('click', () => createProjectFlow(state));
  el.querySelectorAll('[data-rename-project]').forEach((btn) => {
    btn.addEventListener('click', () => renameProjectFlow(state, btn.dataset.renameProject));
  });
  el.querySelectorAll('[data-delete-project]').forEach((btn) => {
    btn.addEventListener('click', () => deleteProjectFlow(state, btn.dataset.deleteProject));
  });
  const search = el.querySelector('#project-search');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    el.querySelectorAll('.project-card').forEach((card) => {
      const name = card.querySelector('h3').textContent.toLowerCase();
      card.style.display = !q || name.includes(q) ? '' : 'none';
    });
  });
}

function createProjectFlow(state) {
  if (!requireBackend(state)) return;
  const overlay = openModal('Buat Proyek Baru', `
    <label class="field">
      <span>Nama proyek</span>
      <input type="text" id="project-name-input" placeholder="mis. PROJECT-BARU" autocomplete="off" spellcheck="false">
    </label>
    <label class="field">
      <span>Folder awal (pisahkan dengan koma, opsional)</span>
      <input type="text" id="project-folders-input" placeholder="VISUAL, AUDIO, SFX" autocomplete="off" spellcheck="false">
    </label>
    <p class="field-hint">Proyek dibuat dengan project.json (skema naze-project/2.0, status draft) dan penanda folder.</p>
  `, {
    footerHtml: `
      <button type="button" class="btn" data-cancel>Batal</button>
      <button type="button" class="btn btn-primary" id="project-create-accept">Buat</button>`,
  });
  overlay.querySelector('[data-cancel]').addEventListener('click', closeModal);
  overlay.querySelector('#project-create-accept').addEventListener('click', async () => {
    const name = overlay.querySelector('#project-name-input').value.trim();
    const folders = overlay.querySelector('#project-folders-input').value.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      await backend.createProject(name, folders);
      closeModal();
      invalidateVaultCache();
      toast(`Proyek "${name}" berhasil dibuat.`, 'success');
      location.hash = `#/projects?open=${encodeURIComponent(name)}`;
    } catch (err) {
      toast(err.message, 'error', 6000);
    }
  });
}

function renameProjectFlow(state, oldName) {
  if (!requireBackend(state)) return;
  const overlay = openModal(`Ganti Nama Proyek: ${oldName}`, `
    <label class="field">
      <span>Nama baru</span>
      <input type="text" id="project-rename-input" value="${escapeHtml(oldName)}" autocomplete="off" spellcheck="false">
    </label>
    <p class="field-hint">Seluruh file dalam proyek akan dipindah dalam satu commit atomik.</p>
  `, {
    footerHtml: `
      <button type="button" class="btn" data-cancel>Batal</button>
      <button type="button" class="btn btn-primary" id="project-rename-accept">Simpan</button>`,
  });
  overlay.querySelector('[data-cancel]').addEventListener('click', closeModal);
  overlay.querySelector('#project-rename-accept').addEventListener('click', async () => {
    const newName = overlay.querySelector('#project-rename-input').value.trim();
    try {
      await backend.renameProject(oldName, newName);
      closeModal();
      invalidateVaultCache();
      invalidateFileCache();
      toast(`Proyek diganti nama menjadi "${newName}".`, 'success');
      location.hash = `#/projects?open=${encodeURIComponent(newName)}`;
    } catch (err) {
      toast(err.message, 'error', 6000);
    }
  });
}

async function deleteProjectFlow(state, name) {
  if (!requireBackend(state)) return;
  const project = (state.vault.projectsIndex.projects || []).find((p) => p.name === name);
  const impact = project
    ? `${project.fileCount} file dan ${project.folders.length} folder tingkat pertama akan dihapus.`
    : 'Seluruh file dalam proyek akan dihapus.';
  const ok = await confirmDialog({
    title: `Hapus Proyek: ${name}`,
    message: `<strong>${escapeHtml(name)}</strong> akan dihapus seluruhnya. ${escapeHtml(impact)} Tindakan ini tidak dapat dibatalkan dari web.`,
    confirmLabel: 'Hapus Proyek',
    danger: true,
    requireText: name,
  });
  if (!ok) return;
  try {
    await backend.deleteProject(name);
    invalidateVaultCache();
    invalidateFileCache();
    toast(`Proyek "${name}" dihapus.`, 'success');
    location.hash = '#/projects';
  } catch (err) {
    toast(err.message, 'error', 6000);
  }
}

async function renderProjectBrowser(el, state, projectName, dir) {
  el.innerHTML = '<div class="panel">' + emptyState('&#8987;', 'Memuat proyek...', 'Membaca daftar file dari repository.') + '</div>';

  let blobs;
  try {
    ({ blobs } = await fetchAllFiles());
  } catch (err) {
    el.innerHTML = errorState('Gagal memuat proyek', err.message, 'projects');
    return;
  }

  const prefix = `PROJECTS/${projectName}${dir ? `/${dir}` : ''}/`;
  const inDir = blobs.filter((b) => b.path.startsWith(prefix));
  if (inDir.length === 0 && dir === '') {
    el.innerHTML = errorState('Proyek tidak ditemukan', `Tidak ada file di bawah ${prefix}.`, 'projects');
    return;
  }

  // Kumpulan subfolder langsung di bawah dir.
  const subDirs = new Map();
  const files = [];
  for (const blob of inDir) {
    const rest = blob.path.slice(prefix.length);
    if (rest.includes('/')) {
      const first = rest.split('/')[0];
      if (!subDirs.has(first)) subDirs.set(first, `${dir ? `${dir}/` : ''}${first}`);
    } else if (rest !== '.gitkeep' && rest !== 'project.json') {
      files.push(blob);
    }
  }

  const project = (state.vault.projectsIndex.projects || []).find((p) => p.name === projectName);
  const q = (new URLSearchParams(location.hash.split('?')[1] || '')).get('q') || '';

  el.innerHTML = `
    <nav class="breadcrumb" aria-label="Navigasi folder">
      <a href="#/projects">PROJECTS</a>
      <span class="crumb-sep">/</span>
      <a href="#/projects?open=${encodeURIComponent(projectName)}">${escapeHtml(projectName)}</a>
      ${(dir ? dir.split('/') : []).map((part, i, arr) => `
        <span class="crumb-sep">/</span>
        ${i === arr.length - 1
          ? `<span aria-current="page">${escapeHtml(part)}</span>`
          : `<a href="#/projects?open=${encodeURIComponent(projectName)}&dir=${encodeURIComponent(arr.slice(0, i + 1).join('/'))}">${escapeHtml(part)}</a>`}
      `).join('')}
    </nav>

    ${project ? `
    <section class="panel project-info">
      <div class="project-meta">
        <span>${project.fileCount} file</span>
        <span>${formatBytes(project.totalBytes)}</span>
        ${project.hasProjectJson ? '<span class="pill pill-success">project.json</span>' : '<span class="pill pill-warn">tanpa project.json</span>'}
      </div>
      <div class="project-actions">
        <button type="button" class="btn btn-sm" id="btn-project-rename">Ganti nama proyek</button>
        <button type="button" class="btn btn-sm btn-danger-ghost" id="btn-project-delete">Hapus proyek</button>
      </div>
    </section>` : ''}

    <div class="toolbar">
      <input type="search" id="browser-search" placeholder="Cari dalam proyek..." value="${escapeHtml(q)}" aria-label="Cari dalam proyek">
      <span class="toolbar-spacer"></span>
      <button type="button" class="btn" id="btn-create-folder">+ Folder</button>
      <button type="button" class="btn btn-primary" id="btn-upload-here">+ Unggah ke sini</button>
    </div>

    <div class="asset-list" id="browser-list">
      ${[...subDirs.values()].sort().map((d) => `
        <a class="asset-row folder-row" href="#/projects?open=${encodeURIComponent(projectName)}&dir=${encodeURIComponent(d)}">
          <span class="ext-badge ext-other" aria-hidden="true">&#128193;</span>
          <span class="asset-name">${escapeHtml(d.split('/').pop())}</span>
          <span class="asset-row-sub">folder</span>
        </a>`).join('')}
      ${files.map((blob) => {
        const name = blob.path.split('/').pop();
        const ext = (name.split('.').pop() || '').toLowerCase();
        return `
        <div class="asset-row" data-path="${escapeHtml(blob.path)}">
          ${fileThumb(blob)}
          <span class="asset-name">${escapeHtml(name)}</span>
          <span class="asset-row-size">${formatBytes(blob.size)}</span>
          <div class="asset-actions">
            <button type="button" class="btn btn-sm" data-preview-file="${escapeHtml(blob.path)}">Pratinjau</button>
            <a class="btn btn-sm" href="${escapeHtml(rawUrl(blob.path, true))}" target="_blank" rel="noopener noreferrer">Unduh</a>
            <button type="button" class="icon-btn" data-file-menu="${escapeHtml(blob.path)}" aria-label="Menu ${escapeHtml(name)}">&#8942;</button>
          </div>
        </div>`;
      }).join('')}
    </div>
    ${subDirs.size === 0 && files.length === 0 ? emptyState('&#128194;', 'Folder kosong', 'Belum ada file atau subfolder di sini.') : ''}
    <div id="upload-progress-slot"></div>
  `;

  const search = el.querySelector('#browser-search');
  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    el.querySelectorAll('#browser-list .asset-row[data-path]').forEach((row) => {
      const name = row.querySelector('.asset-name').textContent.toLowerCase();
      row.style.display = !query || name.includes(query) ? '' : 'none';
    });
  });

  if (project) {
    el.querySelector('#btn-project-rename')?.addEventListener('click', () => renameProjectFlow(state, projectName));
    el.querySelector('#btn-project-delete')?.addEventListener('click', () => deleteProjectFlow(state, projectName));
  }
  el.querySelector('#btn-create-folder').addEventListener('click', () => createFolderFlow(state, projectName, dir));
  el.querySelector('#btn-upload-here').addEventListener('click', () => inlineUploadFlow(state, projectName, dir));

  el.querySelectorAll('[data-preview-file]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const blob = blobs.find((b) => b.path === btn.dataset.previewFile);
      if (blob) {
        previewAsset({
          path: blob.path,
          name: blob.path.split('/').pop(),
          extension: (blob.path.split('.').pop() || '').toLowerCase(),
          size: blob.size,
        });
      }
    });
  });
  el.querySelectorAll('[data-file-menu]').forEach((btn) => {
    btn.addEventListener('click', () => openProjectFileMenu(state, btn.dataset.fileMenu));
  });
}

function openProjectFileMenu(state, path) {
  const overlay = openModal('Aksi File', `
    <div class="menu-list">
      <button type="button" class="menu-item" data-act="rename">Ganti nama</button>
      <button type="button" class="menu-item" data-act="move">Pindahkan</button>
      <button type="button" class="menu-item menu-danger" data-act="delete">Hapus</button>
    </div>
    <p class="mono menu-path">${escapeHtml(path)}</p>
  `);
  overlay.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    closeModal();
    if (act === 'rename') {
      const { renameFlow } = await import('./asset-ops.js');
      renameFlow(state, path, rerender);
    }
    if (act === 'move') {
      const { moveFlow } = await import('./asset-ops.js');
      moveFlow(state, [path], rerender);
    }
    if (act === 'delete') {
      const { deleteFlow } = await import('./asset-ops.js');
      deleteFlow(state, [path], rerender);
    }
  });
}

function createFolderFlow(state, projectName, dir) {
  if (!requireBackend(state)) return;
  const overlay = openModal('Buat Folder', `
    <label class="field">
      <span>Nama folder (boleh bersarang, mis. VISUAL/OVERLAY)</span>
      <input type="text" id="folder-name-input" autocomplete="off" spellcheck="false">
    </label>
    <p class="field-hint mono">${escapeHtml(`PROJECTS/${projectName}${dir ? `/${dir}` : ''}/<nama>`)}</p>
  `, {
    footerHtml: `
      <button type="button" class="btn" data-cancel>Batal</button>
      <button type="button" class="btn btn-primary" id="folder-create-accept">Buat</button>`,
  });
  overlay.querySelector('[data-cancel]').addEventListener('click', closeModal);
  overlay.querySelector('#folder-create-accept').addEventListener('click', async () => {
    const folder = overlay.querySelector('#folder-name-input').value.trim();
    const full = dir ? `${dir}/${folder}` : folder;
    try {
      await backend.createFolder(projectName, full);
      closeModal();
      invalidateFileCache();
      invalidateVaultCache();
      toast(`Folder "${full}" dibuat.`, 'success');
      rerender();
    } catch (err) {
      toast(err.message, 'error', 6000);
    }
  });
}

function inlineUploadFlow(state, projectName, dir) {
  if (!requireBackend(state)) return;
  const maxMb = state.backend.backend.maxUploadMb;
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.addEventListener('change', async () => {
    const files = [...input.files];
    if (files.length === 0) return;
    const slot = document.getElementById('upload-progress-slot');
    if (slot) slot.innerHTML = '<div class="progress-wrap"><div class="progress-bar" id="browser-progress"></div></div><p class="field-hint" id="browser-progress-text"></p>';
    try {
      await commitUpload(state, files, 'PROJECTS', dir ? `${projectName}/${dir}` : projectName, (pct) => {
        const bar = document.getElementById('browser-progress');
        const text = document.getElementById('browser-progress-text');
        if (bar) bar.style.width = `${pct}%`;
        if (text) text.textContent = `Mengunggah... ${pct}%`;
      });
    } finally {
      if (slot) slot.innerHTML = '';
    }
  });
  input.addEventListener('click', () => {
    // Tampilkan batas ukuran sebelum pemilih file dibuka.
    toast(`Batas ukuran per file: ${maxMb} MB.`, 'info', 3000);
  });
  input.click();
}

export async function commitUpload(state, files, destRoot, subPath, onProgress) {
  const maxBytes = state.backend.backend.maxUploadMb * 1024 * 1024;
  const prepared = [];
  for (const file of files) {
    if (file.size > maxBytes) {
      throw new Error(`"${file.name}" melebihi batas ${state.backend.backend.maxUploadMb} MB.`);
    }
    const buffer = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    prepared.push({ name: file.name, contentBase64: btoa(binary), size: file.size });
  }

  try {
    await uploadWithProgress({ destRoot, subPath, files: prepared, overwrite: false }, onProgress);
    invalidateVaultCache();
    invalidateFileCache();
    toast(`${prepared.length} file berhasil diunggah.`, 'success');
    rerender();
  } catch (err) {
    if (err.code === 'duplicates' && err.data && Array.isArray(err.data.duplicates)) {
      const ok = await confirmDialog({
        title: 'File Sudah Ada',
        message: `Nama berikut sudah ada:<br><span class="mono">${err.data.duplicates.map((d) => escapeHtml(d)).join('<br>')}</span><br><br>Timpa file yang ada?`,
        confirmLabel: 'Timpa',
        danger: true,
      });
      if (ok) {
        const data = await uploadWithProgress({ destRoot, subPath, files: prepared, overwrite: true }, onProgress);
        invalidateVaultCache();
        invalidateFileCache();
        toast(`${data.uploaded.length} file berhasil ditimpa/diunggah.`, 'success');
        rerender();
      }
      return;
    }
    throw err;
  }
}
