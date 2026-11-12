/**
 * Utilitas UI: escape, format, toast, modal, dialog konfirmasi, skeleton,
 * status pill, dan badge ekstensi.
 */

export function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return '-';
  const s = Math.round(n / 1000);
  if (s < 60) return `${s} dtk`;
  const m = Math.floor(s / 60);
  return `${m} mnt ${s % 60} dtk`;
}

export function toast(message, type = 'info', durationMs = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', 'status');
  el.textContent = message;
  container.appendChild(el);
  window.setTimeout(() => {
    el.classList.add('toast-hide');
    window.setTimeout(() => el.remove(), 300);
  }, durationMs);
}

export function openModal(title, bodyHtml, { footerHtml = '', wide = false } = {}) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal${wide ? ' modal-wide' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="modal-head">
        <h3>${escapeHtml(title)}</h3>
        <button type="button" class="icon-btn" data-close-modal aria-label="Tutup">&#10005;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="modal-foot">${footerHtml}</div>` : ''}
    </div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-close-modal]')) closeModal();
  });
  document.body.appendChild(overlay);
  const focusable = overlay.querySelector('input, select, textarea, button:not([data-close-modal])');
  if (focusable) focusable.focus();
  return overlay;
}

export function closeModal() {
  document.getElementById('modal-overlay')?.remove();
}

/**
 * Dialog konfirmasi. Opsi requireText: pengguna harus mengetik teks tertentu
 * sebelum tombol konfirmasi aktif (dipakai untuk hapus proyek/destructive).
 */
export function confirmDialog({ title, message, confirmLabel = 'Konfirmasi', danger = false, requireText = null }) {
  return new Promise((resolve) => {
    const body = `
      <p class="confirm-message">${message}</p>
      ${requireText ? `
      <label class="field">
        <span>Ketik "${escapeHtml(requireText)}" untuk mengonfirmasi</span>
        <input type="text" id="confirm-input" autocomplete="off" spellcheck="false">
      </label>` : ''}
    `;
    const footer = `
      <button type="button" class="btn" data-cancel>Batal</button>
      <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-accept" ${requireText ? 'disabled' : ''}>
        ${escapeHtml(confirmLabel)}
      </button>
    `;
    const overlay = openModal(title, body, { footerHtml: footer });
    const accept = overlay.querySelector('#confirm-accept');
    const input = overlay.querySelector('#confirm-input');
    if (input) {
      input.addEventListener('input', () => {
        accept.disabled = input.value !== requireText;
      });
    }
    overlay.querySelector('[data-cancel]').addEventListener('click', () => { closeModal(); resolve(false); });
    accept.addEventListener('click', () => { closeModal(); resolve(true); });
  });
}

export function skeletonBlock(lines = 3) {
  let html = '';
  for (let i = 0; i < lines; i += 1) {
    html += `<div class="skeleton" style="height:${i === 0 ? 56 : 40}px;width:${100 - i * 8}%"></div>`;
  }
  return `<div class="skeleton-wrap">${html}</div>`;
}

export function emptyState(icon, title, description) {
  return `
    <div class="empty-state">
      <div class="empty-icon" aria-hidden="true">${icon}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${description}</p>
    </div>`;
}

export function errorState(title, message, retryHash = null) {
  return `
    <div class="error-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      ${retryHash ? `<a class="btn btn-primary" href="#/${retryHash}">Coba muat ulang</a>` : ''}
    </div>`;
}

const CI_PILL = {
  queued: ['Antrian', 'pill-muted'],
  in_progress: ['Berjalan', 'pill-running'],
  completed: ['Selesai', 'pill-muted'],
  success: ['Sukses', 'pill-success'],
  failure: ['Gagal', 'pill-danger'],
  cancelled: ['Dibatalkan', 'pill-warn'],
  skipped: ['Lewati', 'pill-muted'],
  timed_out: ['Habis Waktu', 'pill-danger'],
  requested: ['Diminta', 'pill-muted'],
  waiting: ['Menunggu', 'pill-muted'],
  pending: ['Tertunda', 'pill-muted'],
};

export function statusPill(status, conclusion) {
  const key = String(conclusion || status || '').toLowerCase();
  const [label, cls] = CI_PILL[key] || [key || 'Tidak diketahui', 'pill-muted'];
  return `<span class="pill ${cls}">${escapeHtml(label)}</span>`;
}

const EXT_COLORS = {
  png: 'ext-image', jpg: 'ext-image', jpeg: 'ext-image', webp: 'ext-image', gif: 'ext-image', bmp: 'ext-image', svg: 'ext-image',
  mp3: 'ext-audio', wav: 'ext-audio', ogg: 'ext-audio', m4a: 'ext-audio', flac: 'ext-audio',
  mp4: 'ext-video', mov: 'ext-video', webm: 'ext-video',
  ttf: 'ext-font', otf: 'ext-font', woff: 'ext-font', woff2: 'ext-font',
  glb: 'ext-3d', gltf: 'ext-3d', obj: 'ext-3d', fbx: 'ext-3d', mtl: 'ext-3d', blend: 'ext-3d',
  json: 'ext-data', md: 'ext-data', txt: 'ext-data', csv: 'ext-data',
};

export function extBadge(ext) {
  const e = String(ext || '').toLowerCase();
  return `<span class="ext-badge ${EXT_COLORS[e] || 'ext-other'}">${escapeHtml(e || '?')}</span>`;
}
