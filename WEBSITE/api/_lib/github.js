/**
 * Klien GitHub REST (App installation token atau PAT) + commit atomik
 * via Git Data API (blob -> tree -> commit -> update ref).
 */

const crypto = require('node:crypto');
const https = require('node:https');

const API_HOST = 'api.github.com';

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

class GitHubError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'GitHubError';
    this.code = code || 'github_error';
    this.status = status || 500;
  }
}

class GitHubClient {
  constructor(cfg) {
    this.cfg = cfg;
    this.tokenCache = { value: null, expiresAt: 0 };
  }

  createAppJwt() {
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: this.cfg.appId }));
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = signer.sign(this.cfg.privateKey).toString('base64url');
    return `${header}.${payload}.${signature}`;
  }

  async getServerToken() {
    if (this.cfg.authMode === 'token') return this.cfg.token;
    if (this.tokenCache.value && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.value;
    }
    const res = await this.rawRequest(
      'POST',
      `/app/installations/${this.cfg.installationId}/access_tokens`,
      { body: {}, token: this.createAppJwt() }
    );
    if (res.status !== 201) {
      throw new GitHubError(
        `Gagal membuat installation token (HTTP ${res.status}). Periksa GITHUB_APP_ID/KEY/INSTALLATION_ID.`,
        'github_auth_failed',
        502
      );
    }
    this.tokenCache = {
      value: res.json.token,
      expiresAt: new Date(res.json.expires_at).getTime() - 60000,
    };
    return this.tokenCache.value;
  }

  rawRequest(method, pathname, { body, token, accept, raw } = {}) {
    return new Promise((resolve, reject) => {
      const payload = body === undefined ? null : JSON.stringify(body);
      const req = https.request(
        {
          host: API_HOST,
          method,
          path: pathname,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: accept || 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'naze-asset-vault-website',
            ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          },
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const text = buffer.toString('utf8');
            let json = null;
            try { json = text ? JSON.parse(text) : null; } catch { json = null; }
            resolve({ status: res.statusCode, headers: res.headers, json, text, buffer });
          });
        }
      );
      req.on('error', (e) => reject(new GitHubError(`Koneksi GitHub gagal: ${e.message}`, 'github_unreachable', 502)));
      if (payload) req.write(payload);
      req.end();
    });
  }

  async request(method, pathname, options = {}) {
    const token = options.token || (await this.getServerToken());
    const res = await this.rawRequest(method, pathname, { ...options, token });
    if (res.status >= 400) {
      const message = (res.json && res.json.message) || `GitHub API ${res.status}`;
      let code = 'github_error';
      if (res.status === 409 || res.status === 422) code = 'commit_conflict';
      else if (res.status === 404) code = 'not_found';
      else if (res.status === 403) code = 'forbidden';
      throw new GitHubError(message, code, res.status === 404 ? 404 : 502);
    }
    return res;
  }

  async getHeadCommit(branch = this.cfg.branch) {
    const res = await this.request('GET', `/repos/${this.cfg.owner}/${this.cfg.repo}/git/ref/heads/${branch}`);
    return { sha: res.json.object.sha };
  }

  async getTree(sha, recursive = true) {
    const q = recursive ? '?recursive=1' : '';
    const res = await this.request('GET', `/repos/${this.cfg.owner}/${this.cfg.repo}/git/trees/${sha}${q}`);
    return res.json;
  }

  async getKnownPaths(sha) {
    const head = sha ? { sha } : await this.getHeadCommit();
    const tree = await this.getTree(head.sha);
    if (tree.truncated) {
      throw new GitHubError('Tree repository terlalu besar untuk dibaca penuh.', 'tree_truncated', 502);
    }
    const paths = new Set();
    const blobs = [];
    for (const item of tree.tree) {
      if (item.type !== 'blob') continue;
      paths.add(item.path);
      blobs.push({ path: item.path, size: item.size || 0, sha: item.sha });
    }
    return { commitSha: head.sha, treeSha: tree.sha, paths, blobs };
  }

  async createBlob(contentBase64) {
    const res = await this.request('POST', `/repos/${this.cfg.owner}/${this.cfg.repo}/git/blobs`, {
      body: { content: contentBase64, encoding: 'base64' },
    });
    return res.json.sha;
  }

  /**
   * Commit atomik satu branch.
   * changes: [{ op: 'put', path, contentBase64 } | { op: 'set', path, blobSha } | { op: 'delete', path }]
   */
  async commitChanges(changes, message, branch = this.cfg.branch) {
    const head = await this.getHeadCommit(branch);
    const known = await this.getKnownPaths(head.sha);

    const treeItems = [];
    for (const change of changes) {
      if (change.op === 'put') {
        const blobSha = await this.createBlob(change.contentBase64);
        treeItems.push({ path: change.path, mode: '100644', type: 'blob', sha: blobSha });
      } else if (change.op === 'set') {
        treeItems.push({ path: change.path, mode: '100644', type: 'blob', sha: change.blobSha });
      } else if (change.op === 'delete') {
        if (known.paths.has(change.path)) {
          treeItems.push({ path: change.path, mode: '100644', type: 'blob', sha: null });
        }
      } else {
        throw new GitHubError(`Operasi tidak dikenal: ${change.op}`, 'invalid_input', 400);
      }
    }
    if (treeItems.length === 0) {
      return { commitSha: head.sha, changed: 0 };
    }

    const treeRes = await this.request('POST', `/repos/${this.cfg.owner}/${this.cfg.repo}/git/trees`, {
      body: { base_tree: known.treeSha, tree: treeItems },
    });
    const commitRes = await this.request('POST', `/repos/${this.cfg.owner}/${this.cfg.repo}/git/commits`, {
      body: { message, tree: treeRes.json.sha, parents: [head.sha] },
    });
    await this.request('PATCH', `/repos/${this.cfg.owner}/${this.cfg.repo}/git/refs/heads/${branch}`, {
      body: { sha: commitRes.json.sha, force: false },
    });
    return { commitSha: commitRes.json.sha, changed: treeItems.length };
  }

  async listWorkflowRuns({ page = 1, perPage = 20 } = {}) {
    const res = await this.request(
      'GET',
      `/repos/${this.cfg.owner}/${this.cfg.repo}/actions/runs?page=${page}&per_page=${Math.min(perPage, 50)}`
    );
    return res.json;
  }

  async getRun(runId) {
    const res = await this.request('GET', `/repos/${this.cfg.owner}/${this.cfg.repo}/actions/runs/${runId}`);
    return res.json;
  }

  async getRunJobs(runId) {
    const res = await this.request(
      'GET',
      `/repos/${this.cfg.owner}/${this.cfg.repo}/actions/runs/${runId}/jobs?per_page=50`
    );
    return res.json;
  }

  async getJobLogs(jobId) {
    const res = await this.request(
      'GET',
      `/repos/${this.cfg.owner}/${this.cfg.repo}/actions/jobs/${jobId}/logs`,
      { accept: 'application/vnd.github+json' }
    );
    // GitHub membalas 302 ke log di objek storage; ikuti bila perlu.
    if (res.status >= 300 && res.headers.location) {
      return this.followRaw(res.headers.location);
    }
    return res.text;
  }

  followRaw(url) {
    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        })
        .on('error', (e) => reject(new GitHubError(`Gagal mengunduh log: ${e.message}`, 'github_unreachable', 502)));
    });
  }

  async rerunFailedJobs(runId) {
    await this.request('POST', `/repos/${this.cfg.owner}/${this.cfg.repo}/actions/runs/${runId}/rerun-failed-jobs`, { body: {} });
    return true;
  }

  async dispatchWorkflow(fileName, ref, inputs = {}) {
    await this.request(
      'POST',
      `/repos/${this.cfg.owner}/${this.cfg.repo}/actions/workflows/${encodeURIComponent(fileName)}/dispatches`,
      { body: { ref, inputs } }
    );
    return true;
  }
}

module.exports = { GitHubClient, GitHubError };
