/**
 * Halaman Upload Center: dropzone, pilihan tujuan (Global Assets / Project
 * Storage), validasi per file, progres unggah nyata, dan deteksi duplikat.
 */

import { escapeHtml, formatBytes, toast, emptyState } from './ui.js';
import { backend, assertBackendReady, invalidateVaultCache, invalidateFileCache, uploadWithProgress } from './api.js';
import { commitUpload } from './projects.js';

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm']);
const FONT_EXTS = new Set(['ttf', 'otf', 'woff', 'woff2']);
const ALLOWED = new Set([...IMAGE_EXTS, ...AUDIO_EXTS, ...VIDEO_EXTS, ...FONT_EXTS,
  'glb', 'gltf', 'obj', 'fbx', 'mtl', 'blend', 'json', 'md', 'txt', 'csv']);

function validateFileLocal(file, maxBytes) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!file.name.includes('.') || !ALLOWED.has(ext)) {
    return { ok: false, reason: `Ekstensi ".${ext || '(tanpa)'}" tidak diizinkan` };
  }
  if (file.size > maxBytes) {
    return { ok: false, reason: `${formatBytes(file.size)} melebihi batas ${formatBytes(maxBytes)}` };
  }
  if (file.size === 0) {
    return { ok: false, reason: 'File kosong' };
  }
  return { ok: true, ext };
}

export function renderUpload(el, state) {
  const backendReady = state.backend && state.backend.backend && state.backend.backend.ready;
  const maxBytes = backendReady ? state.backend.backend.maxUploadMb * 1024 * 1024 : 4 * 1024 * 1024;
  const projects = state.vault.projectsIndex.projects || [];

  if (!backendReady) {
    el.innerHTML = emptyState('&#9888;', 'Backend belum dikonfigurasi',
      'Unggah memerlukan backend API dengan kredensial GitHub. Lihat WEBSITE/README.md untuk daftar environment variables.');
    return;
  }

  el.innerHTML = `
    <div class="upload-layout">
      <section class="panel">
        <h2>Pilih File</h2>
        <div class="dropzone" id="dropzone" tabindex="0" role="button" aria-label="Pilih atau jatuhkan file">
          <p><strong>Jatuhkan file di sini</strong> atau klik untuk memilih.</p>
          <p class="field-hint">Bisa beberapa file sekaligus. Batas per file: ${formatBytes(maxBytes)}.</p>
          <input type="file" id="file-input" multiple hidden>
        </div>
        <div id="file-list" class="upload-file-list"></div>
      </section>

      <section class="panel">
        <h2>Tujuan</h2>
        <div class="dest-tabs" role="tablist">
          <button type="button" class="dest-tab active" data-dest="global" role="tab" aria-selected="true">Global Assets</button>
          <button type="button" class="dest-tab" data-dest="project" role="tab" aria-selected="false">Project Storage</button>
        </div>

        <div id="dest-global">
          <label class="field">
            <span>Kategori root</span>
            <select id="dest-category">
              <option value="VISUAL">VISUAL</option>
              <option value="AUDIO">AUDIO</option>
              <option value="FONTS">FONTS</option>
              <option value="EXAMPLE_VIDEO">EXAMPLE_VIDEO</option>
              <option value="NAZE-3D/assets-3d">NAZE-3D/assets-3d</option>
            </select>
          </label>
          <label class="field">
            <span>Subfolder (opsional, boleh bersarang)</span>
            <input type="text" id="dest-subpath" placeholder="mis. LOGO" autocomplete="off" spellcheck="false">
          </label>
        </div>

        <div id="dest-project" hidden>
          <label class="field">
            <span>Proyek</span>
            <select id="dest-project-select">
              ${projects.map((p) => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Folder dalam proyek (opsional, boleh bersarang)</span>
            <input type="text" id="dest-project-folder" placeholder="mis. VISUAL/OVERLAY" autocomplete="off" spellcheck="false">
          </label>
          ${projects.length === 0 ? '<p class="field-hint">Belum ada proyek. Buat proyek terlebih dahulu di halaman Projects.</p>' : ''}
        </div>

        <div class="progress-wrap" id="upload-progress-wrap" hidden>
          <div class="progress-bar" id="upload-progress-bar" style="width:0%"></div>
        </div>
        <p class="field-hint" id="upload-progress-text"></p>
        <button type="button" class="btn btn-primary btn-block" id="btn-upload" disabled>Unggah</button>
      </section>
    </div>
  `;

  const dropzone = el.querySelector('#dropzone');
  const fileInput = el.querySelector('#file-input');
  const fileList = el.querySelector('#file-list');
  const uploadBtn = el.querySelector('#btn-upload');
  const progressWrap = el.querySelector('#upload-progress-wrap');
  const progressBar = el.querySelector('#upload-progress-bar');
  const progressText = el.querySelector('#upload-progress-text');

  let selected = [];
  let dest = 'global';

  function renderFileList() {
    if (selected.length === 0) {
      fileList.innerHTML = '';
      uploadBtn.disabled = true;
      return;
    }
    fileList.innerHTML = selected.map((item, i) => `
      <div class="upload-file-row">
        ${item.valid
          ? '<span class="pill pill-success">valid</span>'
          : `<span class="pill pill-danger">${escapeHtml(item.reason)}</span>`}
        <span class="upload-file-name">${escapeHtml(item.file.name)}</span>
        <span class="upload-file-size">${formatBytes(item.file.size)}</span>
        <button type="button" class="icon-btn" data-remove="${i}" aria-label="Hapus dari daftar">&#10005;</button>
      </div>`).join('');
    uploadBtn.disabled = !selected.some((s) => s.valid);
    fileList.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selected.splice(Number(btn.dataset.remove), 1);
        renderFileList();
      });
    });
  }

  function addFiles(files) {
    for (const file of files) {
      const check = validateFileLocal(file, maxBytes);
      selected.push({ file, ...check });
    }
    renderFileList();
  }

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
  });
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    addFiles([...e.dataTransfer.files]);
  });
  fileInput.addEventListener('change', () => {
    addFiles([...fileInput.files]);
    fileInput.value = '';
  });

  el.querySelectorAll('.dest-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.dest-tab').forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      dest = tab.dataset.dest;
      el.querySelector('#dest-global').hidden = dest !== 'global';
      el.querySelector('#dest-project').hidden = dest !== 'project';
    });
  });

  uploadBtn.addEventListener('click', async () => {
    try {
      assertBackendReady(state.backend);
    } catch (err) {
      toast(err.message, 'error', 6000);
      return;
    }
    if (!state.session || !state.session.authenticated) {
      toast('Masuk sebagai admin terlebih dahulu.', 'warn', 6000);
      return;
    }

    const valid = selected.filter((s) => s.valid);
    if (valid.length === 0) return;

    let destRoot;
    let subPath = '';
    if (dest === 'global') {
      destRoot = el.querySelector('#dest-category').value;
      const sub = el.querySelector('#dest-subpath').value.trim();
      subPath = sub;
    } else {
      const projectName = el.querySelector('#dest-project-select').value;
      const folder = el.querySelector('#dest-project-folder').value.trim();
      destRoot = 'PROJECTS';
      subPath = folder ? `${projectName}/${folder}` : projectName;
    }

    uploadBtn.disabled = true;
    progressWrap.hidden = false;
    try {
      await commitUpload(state, valid.map((v) => v.file), destRoot, subPath, (pct) => {
        progressBar.style.width = `${pct}%`;
        progressText.textContent = `Mengunggah... ${pct}%`;
      });
      selected = [];
      renderFileList();
    } catch (err) {
      toast(err.message, 'error', 7000);
    } finally {
      progressWrap.hidden = true;
      progressText.textContent = '';
      renderFileList();
    }
  });
}
