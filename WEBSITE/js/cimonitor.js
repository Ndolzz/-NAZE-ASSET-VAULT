/**
 * Halaman CI Monitor: daftar run GitHub Actions dengan filter, detail run,
 * log per job, rerun job gagal, dan dispatch workflow (whitelist).
 * Semua data dari GitHub Actions API via backend - tanpa progres palsu.
 */

import { escapeHtml, formatBytes, formatDate, formatDuration, openModal, closeModal, toast, statusPill, emptyState, errorState, skeletonBlock } from './ui.js';
import { fetchWorkflowRuns, fetchRunDetail, fetchJobLog, ciBackend, githubUrl, backend } from './api.js';

function runRow(run) {
  const started = run.createdAt ? new Date(run.createdAt).getTime() : null;
  const ended = run.updatedAt ? new Date(run.updatedAt).getTime() : null;
  const duration = started && ended && run.status === 'completed' ? ended - started : null;
  return `
    <div class="run-row">
      <div class="run-main">
        <span class="run-name">${escapeHtml(run.name)}</span>
        <span class="run-meta">#${run.runNumber} · ${escapeHtml(run.branch || '-')} · <span class="mono">${escapeHtml((run.sha || '').slice(0, 7))}</span></span>
      </div>
      <div class="run-side">
        ${statusPill(run.status, run.conclusion)}
        <span class="run-meta">${escapeHtml(run.event)} · ${escapeHtml(formatDate(run.createdAt))}</span>
        ${duration !== null ? `<span class="run-meta">${escapeHtml(formatDuration(duration))}</span>` : ''}
      </div>
      <div class="run-actions">
        <button type="button" class="btn btn-sm" data-run-detail="${run.id}">Detail</button>
        <a class="btn btn-sm" href="${escapeHtml(run.htmlUrl || githubUrl('/actions'))}" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
    </div>`;
}

export function renderCIMonitor(el, state) {
  const backendReady = state.backend && state.backend.backend && state.backend.backend.ready;

  if (!backendReady) {
    el.innerHTML = emptyState('&#9888;', 'Backend belum dikonfigurasi',
      'CI Monitor memerlukan backend API dengan kredensial GitHub Actions. Lihat WEBSITE/README.md.');
    return;
  }

  el.innerHTML = `
    <div class="toolbar">
      <input type="search" id="ci-search" placeholder="Cari nama workflow..." aria-label="Cari workflow">
      <select id="ci-status" aria-label="Filter status">
        <option value="">Semua status</option>
        <option value="queued">Antrian</option>
        <option value="in_progress">Berjalan</option>
        <option value="success">Sukses</option>
        <option value="failure">Gagal</option>
        <option value="cancelled">Dibatalkan</option>
      </select>
      <span class="toolbar-spacer"></span>
      <button type="button" class="btn" id="ci-refresh">Segarkan</button>
      <button type="button" class="btn btn-primary" id="ci-dispatch">Dispatch Workflow</button>
    </div>
    <div id="ci-runs">${skeletonBlock(4)}</div>
    <div class="load-more-wrap"><button type="button" class="btn" id="ci-more" hidden>Muat lebih banyak</button></div>
  `;

  let runs = [];
  let page = 1;
  let filtered = [];

  const runsEl = el.querySelector('#ci-runs');
  const moreBtn = el.querySelector('#ci-more');
  const searchEl = el.querySelector('#ci-search');
  const statusEl = el.querySelector('#ci-status');

  async function load(nextPage) {
    if (!nextPage) {
      runs = [];
      page = 1;
      runsEl.innerHTML = skeletonBlock(4);
    }
    try {
      const data = await fetchWorkflowRuns(page);
      runs = runs.concat(data.runs || []);
      apply();
      moreBtn.hidden = runs.length >= data.total;
      page += 1;
    } catch (err) {
      runsEl.innerHTML = errorState('Gagal memuat workflow runs', err.message);
    }
  }

  function apply() {
    const q = searchEl.value.trim().toLowerCase();
    const status = statusEl.value;
    filtered = runs.filter((r) =>
      (!q || (r.name || '').toLowerCase().includes(q) || (r.path || '').toLowerCase().includes(q))
      && (!status || r.status === status || r.conclusion === status)
    );
    runsEl.innerHTML = filtered.length === 0
      ? emptyState('&#9881;', 'Tidak ada run', 'Belum ada workflow run yang cocok dengan filter.')
      : filtered.map(runRow).join('');

    runsEl.querySelectorAll('[data-run-detail]').forEach((btn) => {
      btn.addEventListener('click', () => openRunDetail(Number(btn.dataset.runDetail)));
    });
  }

  searchEl.addEventListener('input', apply);
  statusEl.addEventListener('change', apply);
  moreBtn.addEventListener('click', () => load(true));
  el.querySelector('#ci-refresh').addEventListener('click', () => load(false));
  el.querySelector('#ci-dispatch').addEventListener('click', () => dispatchFlow(state));

  load(false);
}

async function openRunDetail(runId) {
  const overlay = openModal('Detail Run', skeletonBlock(3), { wide: true });
  let data;
  try {
    data = await fetchRunDetail(runId);
  } catch (err) {
    overlay.querySelector('.modal-body').innerHTML = errorState('Gagal memuat detail', err.message);
    return;
  }

  const { run, jobs } = data;
  const started = run.createdAt ? new Date(run.createdAt).getTime() : null;
  const ended = run.updatedAt ? new Date(run.updatedAt).getTime() : null;

  overlay.querySelector('.modal-body').innerHTML = `
    <div class="run-detail-grid">
      <span class="run-detail-label">Workflow</span><span>${escapeHtml(run.name)} (${escapeHtml(run.path)})</span>
      <span class="run-detail-label">Status</span><span>${statusPill(run.status, run.conclusion)}</span>
      <span class="run-detail-label">Branch</span><span>${escapeHtml(run.branch || '-')}</span>
      <span class="run-detail-label">Commit</span><span class="mono">${escapeHtml((run.sha || '').slice(0, 7))}</span>
      <span class="run-detail-label">Pemicu</span><span>${escapeHtml(run.event)}</span>
      <span class="run-detail-label">Mulai</span><span>${escapeHtml(formatDate(run.createdAt))}</span>
      <span class="run-detail-label">Selesai</span><span>${escapeHtml(formatDate(run.updatedAt))}</span>
      <span class="run-detail-label">Durasi</span><span>${started && ended && run.status === 'completed' ? escapeHtml(formatDuration(ended - started)) : '-'}</span>
    </div>
    <h4>Jobs</h4>
    <div class="job-list">
      ${jobs.map((j) => `
        <div class="job-row">
          <span class="job-name">${escapeHtml(j.name)}</span>
          ${statusPill(j.status, j.conclusion)}
          ${j.status === 'completed' && j.startedAt && j.completedAt
            ? `<span class="run-meta">${escapeHtml(formatDuration(new Date(j.completedAt) - new Date(j.startedAt)))}</span>` : ''}
          <button type="button" class="btn btn-sm" data-job-log="${j.id}">Log</button>
        </div>`).join('') || '<p class="field-hint">Tidak ada job.</p>'}
    </div>
  `;

  overlay.querySelector('.modal-foot').innerHTML = `
    ${run.conclusion === 'failure' ? '<button type="button" class="btn btn-primary" id="btn-rerun-failed">Rerun job gagal</button>' : ''}
    <a class="btn" href="${escapeHtml(run.htmlUrl || githubUrl('/actions'))}" target="_blank" rel="noopener noreferrer">Buka di GitHub</a>
    <button type="button" class="btn" data-close-modal>Tutup</button>
  `;

  if (run.conclusion === 'failure') {
    overlay.querySelector('#btn-rerun-failed').addEventListener('click', async () => {
      try {
        const result = await ciBackend.rerun(runId);
        toast(result.message || 'Rerun dikirim.', 'success');
        closeModal();
      } catch (err) {
        toast(err.message, 'error', 6000);
      }
    });
  }

  overlay.querySelectorAll('[data-job-log]').forEach((btn) => {
    btn.addEventListener('click', () => viewLog(Number(btn.dataset.jobLog)));
  });
}

async function viewLog(jobId) {
  const overlay = openModal('Log Job', '<p class="field-hint">Mengunduh log...</p>', { wide: true });
  try {
    const data = await fetchJobLog(jobId);
    overlay.querySelector('.modal-body').innerHTML =
      `<pre class="log-viewer">${escapeHtml(data.log || '(log kosong)')}</pre>`;
  } catch (err) {
    overlay.querySelector('.modal-body').innerHTML =
      errorState('Log tidak tersedia', err.message);
  }
}

function dispatchFlow(state) {
  const overlay = openModal('Dispatch Workflow', `
    <label class="field">
      <span>Workflow</span>
      <select id="dispatch-workflow">
        <option value="render.yml">NAZE Render (render.yml)</option>
        <option value="render-3d.yml">NAZE 3D Render (render-3d.yml)</option>
      </select>
    </label>
    <div id="dispatch-fields">
      <label class="field">
        <span>Proyek (PROJECTS/&lt;nama&gt;)</span>
        <input type="text" id="dispatch-project" placeholder="mis. DARK-WEB" autocomplete="off" spellcheck="false">
      </label>
      <label class="field">
        <span>Profil render</span>
        <select id="dispatch-profile">
          <option value="vertical-1080">vertical-1080</option>
          <option value="vertical-1440">vertical-1440</option>
          <option value="vertical-2160">vertical-2160</option>
        </select>
      </label>
    </div>
    <p class="field-hint">Hanya workflow yang sudah ada di repository yang dapat di-dispatch.</p>
  `, {
    footerHtml: `
      <button type="button" class="btn" data-cancel>Batal</button>
      <button type="button" class="btn btn-primary" id="dispatch-accept">Jalankan</button>`,
  });

  const workflowSelect = overlay.querySelector('#dispatch-workflow');
  const fields = overlay.querySelector('#dispatch-fields');
  const syncFields = () => { fields.hidden = workflowSelect.value !== 'render.yml'; };
  workflowSelect.addEventListener('change', syncFields);
  syncFields();

  overlay.querySelector('[data-cancel]').addEventListener('click', closeModal);
  overlay.querySelector('#dispatch-accept').addEventListener('click', async () => {
    const workflow = workflowSelect.value;
    const inputs = {};
    if (workflow === 'render.yml') {
      inputs.project = overlay.querySelector('#dispatch-project').value.trim();
      inputs.profile = overlay.querySelector('#dispatch-profile').value;
    }
    try {
      const result = await ciBackend.dispatch(workflow, 'main', inputs);
      toast(result.message || 'Dispatch terkirim.', 'success');
      closeModal();
    } catch (err) {
      toast(err.message, 'error', 6000);
    }
  });
}
