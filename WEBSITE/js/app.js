/**
 * Entry point aplikasi: router hash, boot paralel (vault + backend + sesi),
 * navigasi, area autentikasi, dan penanganan error antarmuka.
 */

import { escapeHtml, openModal, closeModal, toast, errorState } from './ui.js';
import {
  loadVaultData, fetchBackendStatus, fetchSession, backend,
  invalidateVaultCache, invalidateFileCache, githubUrl,
} from './api.js';
import { renderDashboard, renderAssets } from './views.js';
import { assetActionsHandlers } from './asset-ops.js';
import { renderProjects } from './projects.js';
import { renderUpload } from './upload.js';
import { renderCIMonitor } from './cimonitor.js';

const state = {
  route: 'dashboard',
  vault: null,
  vaultSource: null,
  backend: null,
  session: { authenticated: false, user: null },
  vaultError: null,
};

const ROUTES = {
  dashboard: { title: 'Dashboard', render: renderDashboard },
  assets: { title: 'Assets', render: renderAssets },
  projects: { title: 'Projects', render: renderProjects },
  upload: { title: 'Upload Center', render: renderUpload },
  cimonitor: { title: 'CI Monitor', render: renderCIMonitor },
};

function parseHash() {
  const hash = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [pathPart] = hash.split('?');
  const route = ROUTES[pathPart] ? pathPart : 'dashboard';
  return route;
}

function buildNav() {
  const current = parseHash();
  const nav = document.getElementById('nav');
  nav.innerHTML = Object.entries(ROUTES).map(([key, route]) => `
    <a class="nav-item${key === current ? ' active' : ''}" href="#/${key}" ${key === current ? 'aria-current="page"' : ''}>
      <span class="nav-icon" aria-hidden="true">${NAV_ICONS[key] || ''}</span>${escapeHtml(route.title)}
    </a>`).join('');
}

const NAV_ICONS = {
  dashboard: '&#9632;',
  assets: '&#9638;',
  projects: '&#128193;',
  upload: '&#8679;',
  cimonitor: '&#9881;',
};

function setPageTitle() {
  const route = ROUTES[state.route];
  document.title = `${route.title} - NAZE Asset Vault`;
  const el = document.getElementById('page-title');
  if (el) el.textContent = route.title;
}

function getRerender() {
  return () => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
}

function navigate() {
  state.route = parseHash();
  buildNav();
  setPageTitle();
  const view = document.getElementById('view');
  if (state.vaultError) {
    view.innerHTML = errorState('Gagal memuat data vault', state.vaultError.message || String(state.vaultError), 'dashboard');
    return;
  }
  if (!state.vault) {
    view.innerHTML = '<div class="panel"><p class="field-hint">Memuat data vault...</p></div>';
    return;
  }
  try {
    ROUTES[state.route].render(view, state);
    if (state.route === 'assets') {
      view.removeEventListener('click', state._assetHandler);
      state._assetHandler = assetActionsHandlers(state, getRerender);
      view.addEventListener('click', state._assetHandler);
    }
  } catch (err) {
    console.error('Render error:', err);
    view.innerHTML = errorState('Terjadi kesalahan tampilan', err.message, state.route);
  }
}

function renderAuthArea() {
  const area = document.getElementById('auth-area');
  const backendReady = state.backend && state.backend.backend && state.backend.backend.ready;
  if (state.session && state.session.authenticated) {
    area.innerHTML = `
      <span class="auth-user" title="Masuk sebagai admin">${escapeHtml(state.session.user)}</span>
      <button type="button" class="btn btn-sm" id="btn-logout">Keluar</button>`;
    area.querySelector('#btn-logout').addEventListener('click', async () => {
      try { await backend.logout(); } catch { /* sesi tetap dibuang di klien */ }
      state.session = { authenticated: false, user: null };
      renderAuthArea();
      toast('Anda telah keluar.', 'info');
    });
    return;
  }
  area.innerHTML = backendReady
    ? '<button type="button" class="btn btn-sm btn-primary" id="btn-login">Masuk</button>'
    : '<span class="pill pill-warn">Backend belum siap</span>';
  const loginBtn = area.querySelector('#btn-login');
  if (loginBtn) loginBtn.addEventListener('click', loginFlow);
}

function loginFlow() {
  const overlay = openModal('Masuk Admin', `
    <p class="field-hint">Masukkan Personal Access Token (PAT) GitHub dengan akses repo.
    Token diverifikasi satu kali lalu dibuang; tidak pernah disimpan di server maupun browser.</p>
    <label class="field">
      <span>Token PAT</span>
      <input type="password" id="pat-input" autocomplete="off" spellcheck="false">
    </label>
  `, {
    footerHtml: `
      <button type="button" class="btn" data-cancel>Batal</button>
      <button type="button" class="btn btn-primary" id="pat-accept">Masuk</button>`,
  });
  overlay.querySelector('[data-cancel]').addEventListener('click', closeModal);
  overlay.querySelector('#pat-accept').addEventListener('click', async () => {
    const token = overlay.querySelector('#pat-input').value.trim();
    if (!token) return;
    try {
      const result = await backend.login(token);
      state.session = { authenticated: true, user: result.user };
      closeModal();
      renderAuthArea();
      toast(`Selamat datang, ${result.user}.`, 'success');
      navigate();
    } catch (err) {
      toast(err.message, 'error', 6000);
    }
  });
}

async function boot() {
  const banner = document.getElementById('backend-banner');
  const [vaultResult, backendResult, sessionResult] = await Promise.allSettled([
    loadVaultData(),
    fetchBackendStatus(),
    fetchSession(),
  ]);

  if (vaultResult.status === 'fulfilled') {
    state.vault = vaultResult.value;
  } else {
    state.vaultError = vaultResult.reason;
  }
  state.backend = backendResult.status === 'fulfilled' ? backendResult.value : { ok: false, backend: { ready: false, authMode: 'unreachable' } };
  state.session = sessionResult.status === 'fulfilled' ? sessionResult.value : { authenticated: false, user: null };

  if (!state.backend.backend.ready) {
    banner.hidden = false;
    banner.innerHTML = `Backend API belum dikonfigurasi. Fitur tulis (unggah, buat proyek, hapus) tidak aktif.
      Lihat <a href="${escapeHtml(githubUrl('/blob/main/WEBSITE/README.md'))}" target="_blank" rel="noopener noreferrer">panduan konfigurasi</a>.`;
  } else {
    banner.hidden = true;
  }

  renderAuthArea();
  navigate();
}

function setupShell() {
  const menuBtn = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible', sidebar.classList.contains('open'));
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  });
  document.getElementById('nav').addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  });
  document.getElementById('btn-refresh').addEventListener('click', async () => {
    invalidateVaultCache();
    invalidateFileCache();
    state.vault = null;
    state.vaultError = null;
    try {
      state.vault = await loadVaultData();
      toast('Data vault diperbarui.', 'success');
    } catch (err) {
      state.vaultError = err;
      toast('Gagal memuat ulang data vault.', 'error');
    }
    navigate();
  });
}

window.addEventListener('hashchange', navigate);
setupShell();
boot();
