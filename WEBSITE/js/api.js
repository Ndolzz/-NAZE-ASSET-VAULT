/**
 * Lapisan data frontend: indeks vault (raw) dengan fallback live tree GitHub,
 * status backend, sesi, operasi tulis via backend, dan GitHub Actions.
 */

import { buildAssetsIndex, buildProjectsIndex, validateIndexShape } from '../lib/indexer.mjs';

export const REPO = {
  owner: 'Ndolzz',
  repo: '-NAZE-ASSET-VAULT',
  branch: 'main',
};

export function rawUrl(path, bust = false) {
  const base = `https://raw.githubusercontent.com/${REPO.owner}/${REPO.repo}/${REPO.branch}/${path}`;
  return bust ? `${base}?t=${Date.now()}` : base;
}

export function githubUrl(path = '') {
  return `https://github.com/${REPO.owner}/${REPO.repo}${path}`;
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} pada ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ---------------------------------------------------------------- vault data

let vaultCache = null;
let fileCache = null;

export function invalidateVaultCache() { vaultCache = null; }
export function invalidateFileCache() { fileCache = null; }

async function fetchIndexFile(name) {
  try {
    const data = await fetchJson(rawUrl(`DATABASE/${name}`, true));
    return data && data.schemaVersion === 1 ? data : null;
  } catch {
    return null;
  }
}

async function fetchLiveTree() {
  const data = await fetchJson(
    `https://api.github.com/repos/${REPO.owner}/${REPO.repo}/git/trees/${REPO.branch}?recursive=1`
  );
  if (data.truncated) {
    throw new Error('Tree repository terlalu besar untuk mode fallback live.');
  }
  return data;
}

/**
 * Memuat data vault: utamakan indeks dari DATABASE/, fallback ke tree live.
 * Mengembalikan { assetsIndex, projectsIndex, source: 'index'|'live', commit }.
 */
export async function loadVaultData() {
  if (vaultCache) return vaultCache;
  const [assetsIndex, projectsIndex] = await Promise.all([
    fetchIndexFile('assets-index.json'),
    fetchIndexFile('projects-index.json'),
  ]);
  if (assetsIndex && projectsIndex) {
    vaultCache = { assetsIndex, projectsIndex, source: 'index', commit: assetsIndex.source?.commit || null };
    return vaultCache;
  }

  const tree = await fetchLiveTree();
  const entries = tree.tree
    .filter((item) => item.type === 'blob')
    .map((item) => ({ path: item.path, size: item.size || 0, sha: item.sha }));
  const meta = { repo: `${REPO.owner}/${REPO.repo}`, branch: REPO.branch, commit: tree.sha };
  vaultCache = {
    assetsIndex: buildAssetsIndex(entries, meta),
    projectsIndex: buildProjectsIndex(entries, meta),
    source: 'live',
    commit: tree.sha,
  };
  return vaultCache;
}

export async function fetchAllFiles() {
  if (fileCache) return fileCache;
  const tree = await fetchLiveTree();
  fileCache = {
    commit: tree.sha,
    blobs: tree.tree.filter((i) => i.type === 'blob').map((i) => ({ path: i.path, size: i.size || 0, sha: i.sha })),
  };
  return fileCache;
}

export async function fetchRecentCommits(limit = 8) {
  const data = await fetchJson(
    `https://api.github.com/repos/${REPO.owner}/${REPO.repo}/commits?per_page=${limit}`
  );
  return data.map((c) => ({
    sha: c.sha,
    short: c.sha.slice(0, 7),
    message: (c.commit.message || '').split('\n')[0],
    author: c.commit.author ? c.commit.author.name : '-',
    date: c.commit.author ? c.commit.author.date : null,
    url: c.html_url,
  }));
}

// ------------------------------------------------------------------- backend

export async function fetchBackendStatus() {
  try {
    return await fetchJson('/api/status');
  } catch {
    return { ok: false, backend: { ready: false, authMode: 'unreachable' } };
  }
}

export async function fetchSession() {
  try {
    return await fetchJson('/api/auth');
  } catch {
    return { ok: false, authenticated: false, user: null };
  }
}

function csrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)naze_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function backendRequest(path, { method = 'POST', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok || (data && data.ok === false)) {
    const err = new Error((data && data.message) || `Permintaan gagal (HTTP ${res.status}).`);
    err.code = (data && data.code) || 'request_failed';
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const backend = {
  async login(token) {
    return backendRequest('/api/auth', { body: { action: 'login', token } });
  },
  async logout() {
    return backendRequest('/api/auth', { body: { action: 'logout' } });
  },
  async list(prefix = '') {
    return backendRequest(`/api/repo?prefix=${encodeURIComponent(prefix)}`, { method: 'GET' });
  },
  async listProjects() {
    return backendRequest('/api/projects', { method: 'GET' });
  },
  async createProject(name, folders) {
    return backendRequest('/api/projects', { body: { action: 'create', name, folders } });
  },
  async createFolder(project, folder) {
    return backendRequest('/api/projects', { body: { action: 'create-folder', project, folder } });
  },
  async renameProject(oldName, newName) {
    return backendRequest('/api/projects', { body: { action: 'rename', oldName, newName } });
  },
  async deleteProject(name) {
    return backendRequest('/api/projects', { body: { action: 'delete', name, confirm: name } });
  },
  async rename(path, newName) {
    return backendRequest('/api/repo', { body: { action: 'rename', path, newName } });
  },
  async move(paths, destDir) {
    return backendRequest('/api/repo', { body: { action: 'move', paths, destDir } });
  },
  async deletePaths(paths) {
    return backendRequest('/api/repo', { body: { action: 'delete', paths } });
  },
};

export function assertBackendReady(backendStatus) {
  if (!backendStatus || !backendStatus.backend || !backendStatus.backend.ready) {
    throw new Error('Backend belum siap. Konfigurasikan environment variables backend terlebih dahulu (lihat WEBSITE/README.md).');
  }
}

/** Upload dengan progres nyata via XHR (JSON body berisi base64). */
export function uploadWithProgress(payload, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/repo');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-CSRF-Token', csrfToken());
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { data = null; }
      if (xhr.status >= 200 && xhr.status < 300 && data && data.ok) {
        resolve(data);
      } else {
        const err = new Error((data && data.message) || `Upload gagal (HTTP ${xhr.status}).`);
        err.code = (data && data.code) || 'upload_failed';
        err.status = xhr.status;
        err.data = data;
        reject(err);
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Koneksi ke backend gagal saat upload.')));
    xhr.send(JSON.stringify({ action: 'upload', ...payload }));
  });
}

// ------------------------------------------------------------ GitHub Actions

export async function fetchWorkflowRuns(page = 1) {
  return backendRequest(`/api/actions?view=runs&page=${page}`, { method: 'GET' });
}

export async function fetchRunDetail(runId) {
  return backendRequest(`/api/actions?view=run&id=${runId}`, { method: 'GET' });
}

export async function fetchJobLog(jobId) {
  return backendRequest(`/api/actions?view=logs&job=${jobId}`, { method: 'GET' });
}

export const ciBackend = {
  async rerun(runId) {
    return backendRequest('/api/actions', { body: { action: 'rerun', runId } });
  },
  async dispatch(workflow, ref, inputs) {
    return backendRequest('/api/actions', { body: { action: 'dispatch', workflow, ref, inputs } });
  },
};
