/**
 * Render halaman Dashboard dan Assets. Semua angka berasal dari data vault
 * aktual (indeks DATABASE/ atau fallback tree live) - tanpa data dummy.
 */

import { escapeHtml, formatBytes, formatDate, extBadge, emptyState, errorState, skeletonBlock } from './ui.js';
import { rawUrl, githubUrl, fetchRecentCommits } from './api.js';

const CATEGORY_COLORS = {
  VISUAL: '#22d3ee',
  AUDIO: '#8b5cf6',
  FONTS: '#f59e0b',
  EXAMPLE_VIDEO: '#22c55e',
  'NAZE-3D': '#60a5fa',
};

function statCard(label, value, sub = '') {
  return `
    <div class="stat-card">
      <span class="stat-label">${escapeHtml(label)}</span>
      <span class="stat-value">${escapeHtml(String(value))}</span>
      ${sub ? `<span class="stat-sub">${escapeHtml(sub)}</span>` : ''}
    </div>`;
}

export function renderDashboard(el, state) {
  const { assetsIndex, projectsIndex, source, commit } = state.vault;
  const categories = Object.entries(assetsIndex.categories || {}).sort((a, b) => b[1].count - a[1].count);

  const categoryRows = categories.length > 0
    ? categories.map(([name, data]) => `
        <div class="category-row">
          <span class="dot" style="background:${CATEGORY_COLORS[name] || '#64748b'}"></span>
          <span class="category-name">${escapeHtml(name)}</span>
          <span class="category-meta">${data.count} file · ${formatBytes(data.bytes)}</span>
        </div>`).join('')
    : emptyState('&#128193;', 'Belum ada aset', 'Root aset (VISUAL, AUDIO, FONTS, dst.) masih kosong.');

  const backend = state.backend;
  const backendRow = backend && backend.backend
    ? `<div class="status-row"><span>Backend API</span>${backend.backend.ready
        ? '<span class="pill pill-success">Siap</span>'
        : `<span class="pill pill-warn">Belum dikonfigurasi (${escapeHtml(backend.backend.authMode)})</span>`}</div>`
    : '<div class="status-row"><span>Backend API</span><span class="pill pill-danger">Tidak terjangkau</span></div>';

  const sourceRow = `
    <div class="status-row"><span>Sumber data</span>${source === 'index'
      ? '<span class="pill pill-success">Indeks DATABASE/</span>'
      : '<span class="pill pill-warn">Tree live (indeks belum ada)</span>'}</div>
    <div class="status-row"><span>Commit dasar</span><span class="mono">${escapeHtml((commit || '-').slice(0, 7))}</span></div>`;

  el.innerHTML = `
    <section class="stat-grid">
      ${statCard('Total Aset', assetsIndex.totals.assets, formatBytes(assetsIndex.totals.bytes))}
      ${statCard('Kategori', categories.length, 'root aset terindeks')}
      ${statCard('Proyek', projectsIndex.totals.projects, `${projectsIndex.totals.rootFiles} file lepas di PROJECTS/`)}
      ${statCard('File Proyek', projectsIndex.projects.reduce((n, p) => n + p.fileCount, 0), 'di dalam folder proyek')}
    </section>

    <div class="dashboard-columns">
      <section class="panel">
        <h2>Rincian Kategori</h2>
        <div class="category-list">${categoryRows}</div>
      </section>

      <section class="panel">
        <h2>Status Sistem</h2>
        <div class="status-list">
          ${sourceRow}
          ${backendRow}
          <div class="status-row">
            <span>Aksi cepat</span>
            <span class="status-actions">
              <a class="btn btn-sm btn-primary" href="#/upload">Unggah</a>
              <a class="btn btn-sm" href="#/projects?open=__new__">Proyek Baru</a>
            </span>
          </div>
        </div>
      </section>
    </div>

    <section class="panel">
      <h2>Aktivitas Terakhir</h2>
      <div id="recent-commits">${skeletonBlock(3)}</div>
    </section>
  `;

  fetchRecentCommits(8)
    .then((commits) => {
      const target = el.querySelector('#recent-commits');
      if (!target) return;
      target.innerHTML = commits.length === 0
        ? emptyState('&#128220;', 'Belum ada commit', 'Riwayat commit akan tampil di sini.')
        : `<div class="commit-list">${commits.map((c) => `
            <a class="commit-row" href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer">
              <span class="mono commit-sha">${escapeHtml(c.short)}</span>
              <span class="commit-msg">${escapeHtml(c.message)}</span>
              <span class="commit-meta">${escapeHtml(c.author)} · ${escapeHtml(formatDate(c.date))}</span>
            </a>`).join('')}</div>`;
    })
    .catch(() => {
      const target = el.querySelector('#recent-commits');
      if (target) target.innerHTML = errorState('Gagal memuat aktivitas', 'API GitHub tidak dapat dijangkau saat ini.');
    });
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']);

function assetCard(asset) {
  const isImage = IMAGE_EXTS.has(asset.extension);
  const thumb = isImage
    ? `<img class="asset-thumb" loading="lazy" src="${escapeHtml(rawUrl(asset.path, true))}" alt="${escapeHtml(asset.name)}"
         onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'asset-thumb asset-thumb-fallback',textContent:'Gagal memuat'}))">`
    : `<div class="asset-thumb asset-thumb-placeholder" aria-hidden="true">${extBadge(asset.extension)}</div>`;
  return `
    <article class="asset-card" data-path="${escapeHtml(asset.path)}">
      ${thumb}
      <div class="asset-info">
        <span class="asset-name" title="${escapeHtml(asset.path)}">${escapeHtml(asset.name)}</span>
        <span class="asset-meta">${escapeHtml(asset.subcategory || asset.category)} · ${formatBytes(asset.size)}</span>
      </div>
      <div class="asset-actions">
        <button type="button" class="btn btn-sm" data-preview="${escapeHtml(asset.path)}">Pratinjau</button>
        <button type="button" class="icon-btn" data-menu="${escapeHtml(asset.path)}" aria-label="Menu ${escapeHtml(asset.name)}">&#8942;</button>
      </div>
    </article>`;
}

function assetRow(asset) {
  return `
    <div class="asset-row" data-path="${escapeHtml(asset.path)}">
      ${extBadge(asset.extension)}
      <span class="asset-name" title="${escapeHtml(asset.path)}">${escapeHtml(asset.name)}</span>
      <span class="asset-row-sub">${escapeHtml(asset.subcategory || asset.category)}</span>
      <span class="asset-row-size">${formatBytes(asset.size)}</span>
      <div class="asset-actions">
        <button type="button" class="btn btn-sm" data-preview="${escapeHtml(asset.path)}">Pratinjau</button>
        <button type="button" class="icon-btn" data-menu="${escapeHtml(asset.path)}" aria-label="Menu ${escapeHtml(asset.name)}">&#8942;</button>
      </div>
    </div>`;
}

export function renderAssets(el, state) {
  const assets = state.vault.assetsIndex.assets || [];
  if (assets.length === 0) {
    el.innerHTML = emptyState('&#128194;', 'Belum ada aset', 'Unggah aset pertama melalui halaman Unggah.');
    return;
  }

  el.innerHTML = `
    <div class="toolbar">
      <input type="search" id="asset-search" placeholder="Cari nama aset..." aria-label="Cari aset">
      <select id="asset-category" aria-label="Filter kategori">
        <option value="">Semua kategori</option>
        ${Object.keys(state.vault.assetsIndex.categories || {}).map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
      </select>
      <select id="asset-ext" aria-label="Filter ekstensi">
        <option value="">Semua format</option>
        ${[...new Set(assets.map((a) => a.extension))].filter(Boolean).sort().map((e) => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join('')}
      </select>
      <select id="asset-sort" aria-label="Urutkan">
        <option value="name">Nama A-Z</option>
        <option value="name-desc">Nama Z-A</option>
        <option value="size">Terbesar</option>
        <option value="size-asc">Terkecil</option>
        <option value="newest">Terbaru diunggah</option>
      </select>
      <div class="view-toggle" role="group" aria-label="Mode tampilan">
        <button type="button" class="icon-btn active" data-view="grid" aria-label="Tampilan kisi">&#9638;</button>
        <button type="button" class="icon-btn" data-view="list" aria-label="Tampilan daftar">&#9776;</button>
      </div>
    </div>
    <p class="result-count" id="asset-count"></p>
    <div id="asset-container" class="asset-grid"></div>
    <div class="load-more-wrap"><button type="button" class="btn" id="asset-more" hidden>Muat lebih banyak</button></div>
  `;

  const PAGE = 60;
  let shown = 0;
  let view = 'grid';
  let filtered = [];

  const searchInput = el.querySelector('#asset-search');
  const categorySelect = el.querySelector('#asset-category');
  const extSelect = el.querySelector('#asset-ext');
  const sortSelect = el.querySelector('#asset-sort');
  const container = el.querySelector('#asset-container');
  const countEl = el.querySelector('#asset-count');
  const moreBtn = el.querySelector('#asset-more');

  function apply() {
    const q = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    const ext = extSelect.value;
    const sort = sortSelect.value;
    filtered = assets.filter((a) =>
      (!q || a.path.toLowerCase().includes(q))
      && (!category || a.category === category)
      && (!ext || a.extension === ext)
    );
    filtered.sort((a, b) => {
      switch (sort) {
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'size': return b.size - a.size;
        case 'size-asc': return a.size - b.size;
        default: return a.name.localeCompare(b.name);
      }
    });
    shown = 0;
    container.innerHTML = '';
    container.className = view === 'grid' ? 'asset-grid' : 'asset-list';
    appendPage();
  }

  function appendPage() {
    const next = filtered.slice(shown, shown + PAGE);
    container.insertAdjacentHTML('beforeend', next.map(view === 'grid' ? assetCard : assetRow).join(''));
    shown += next.length;
    countEl.textContent = `Menampilkan ${shown} dari ${filtered.length} aset`;
    moreBtn.hidden = shown >= filtered.length;
    if (filtered.length === 0) {
      countEl.textContent = '';
      container.innerHTML = emptyState('&#128269;', 'Tidak ada hasil', 'Coba ubah kata kunci atau filter.');
    }
  }

  searchInput.addEventListener('input', apply);
  categorySelect.addEventListener('change', apply);
  extSelect.addEventListener('change', apply);
  sortSelect.addEventListener('change', apply);
  moreBtn.addEventListener('click', appendPage);
  el.querySelectorAll('.view-toggle [data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.view-toggle [data-view]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      view = btn.dataset.view;
      apply();
    });
  });

  apply();
}

export { CATEGORY_COLORS };
