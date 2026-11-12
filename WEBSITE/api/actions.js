/**
 * /api/actions - pemantauan dan operasi GitHub Actions.
 * GET  ?view=runs&page=N | view=run&id=N | view=logs&job=N
 * POST { action: 'rerun', runId } | { action: 'dispatch', workflow, ref, inputs }
 */

const { loadConfig } = require('./_lib/config');
const { GitHubClient } = require('./_lib/github');
const auth = require('./_lib/auth');
const { json, withApi, ApiError, rateLimit, clientIp, readJsonBody } = require('./_lib/http');

// Whitelist dispatch: hanya workflow yang sudah ada, tanpa membuat workflow baru.
const DISPATCHABLE = {
  'render.yml': {
    fields: [
      { name: 'project', required: true, type: 'string' },
      { name: 'profile', required: true, type: 'enum', values: ['vertical-1080', 'vertical-1440', 'vertical-2160'] },
    ],
  },
  'render-3d.yml': { fields: [] },
};

function requireSession(req, cfg) {
  const session = auth.sessionFromRequest(req, cfg);
  if (!session) throw new ApiError(401, 'unauthorized', 'Masuk terlebih dahulu sebagai admin.');
  return session;
}

function requireCsrf(req, cfg) {
  if (!auth.checkCsrf(req, cfg)) {
    throw new ApiError(403, 'csrf_invalid', 'Token CSRF tidak valid atau hilang.');
  }
}

module.exports = withApi(async (req, res) => {
  const cfg = loadConfig();
  if (!cfg.ready) {
    throw new ApiError(503, 'backend_not_ready', 'Backend belum dikonfigurasi. Set env backend terlebih dahulu.');
  }
  const client = new GitHubClient(cfg);

  if (req.method === 'GET') {
    requireSession(req, cfg);
    const url = new URL(req.url, 'http://localhost');
    const view = url.searchParams.get('view') || 'runs';

    if (view === 'runs') {
      const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
      const data = await client.listWorkflowRuns({ page, perPage: 20 });
      json(res, 200, {
        ok: true,
        total: data.total_count,
        page,
        runs: (data.workflow_runs || []).map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          conclusion: r.conclusion,
          branch: r.head_branch,
          event: r.event,
          sha: r.head_sha,
          runNumber: r.run_number,
          createdAt: r.run_started_at,
          updatedAt: r.updated_at,
          htmlUrl: r.html_url,
          path: r.path,
        })),
      });
      return;
    }

    if (view === 'run') {
      const id = Number.parseInt(url.searchParams.get('id') || '', 10);
      if (!id) throw new ApiError(400, 'invalid_input', 'Parameter id wajib berupa angka.');
      const [run, jobsData] = await Promise.all([
        client.getRun(id),
        client.getRunJobs(id),
      ]);
      json(res, 200, {
        ok: true,
        run: {
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          branch: run.head_branch,
          event: run.event,
          sha: run.head_sha,
          createdAt: run.run_started_at,
          updatedAt: run.updated_at,
          htmlUrl: run.html_url,
          path: run.path,
        },
        jobs: (jobsData.jobs || []).map((j) => ({
          id: j.id,
          name: j.name,
          status: j.status,
          conclusion: j.conclusion,
          startedAt: j.started_at,
          completedAt: j.completed_at,
          steps: (j.steps || []).map((s) => ({ name: s.name, status: s.status, conclusion: s.conclusion })),
        })),
      });
      return;
    }

    if (view === 'logs') {
      const jobId = Number.parseInt(url.searchParams.get('job') || '', 10);
      if (!jobId) throw new ApiError(400, 'invalid_input', 'Parameter job wajib berupa angka.');
      const text = await client.getJobLogs(jobId);
      json(res, 200, { ok: true, jobId, log: text.slice(-200 * 1024) });
      return;
    }

    throw new ApiError(400, 'invalid_input', 'view harus runs, run, atau logs.');
  }

  if (req.method !== 'POST') {
    throw new ApiError(405, 'method_not_allowed', 'Gunakan GET atau POST.');
  }

  requireSession(req, cfg);
  requireCsrf(req, cfg);
  const limit = rateLimit(`ci:${clientIp(req)}`, cfg.rateLimitPerMinute);
  if (!limit.allowed) {
    throw new ApiError(429, 'rate_limited', 'Terlalu banyak operasi CI. Coba lagi sebentar.');
  }

  const body = await readJsonBody(req);

  if (body.action === 'rerun') {
    const runId = Number.parseInt(body.runId, 10);
    if (!runId) throw new ApiError(400, 'invalid_input', 'runId wajib berupa angka.');
    await client.rerunFailedJobs(runId);
    json(res, 200, { ok: true, message: 'Permintaan rerun job gagal terkirim.' });
    return;
  }

  if (body.action === 'dispatch') {
    const workflow = String(body.workflow || '');
    if (!DISPATCHABLE[workflow]) {
      throw new ApiError(400, 'invalid_input', `Workflow "${workflow}" tidak dapat di-dispatch dari web.`);
    }
    const ref = String(body.ref || cfg.branch);
    const inputs = {};
    for (const field of DISPATCHABLE[workflow].fields) {
      const value = body.inputs ? body.inputs[field.name] : undefined;
      if (field.required && (value === undefined || value === '')) {
        throw new ApiError(400, 'invalid_input', `Input "${field.name}" wajib diisi.`);
      }
      if (field.type === 'enum' && value !== undefined && value !== '' && !field.values.includes(value)) {
        throw new ApiError(400, 'invalid_input', `"${field.name}" harus salah satu dari: ${field.values.join(', ')}.`);
      }
      if (value !== undefined && value !== '') inputs[field.name] = value;
    }
    await client.dispatchWorkflow(workflow, ref, inputs);
    json(res, 200, { ok: true, message: `Dispatch ${workflow} pada ${ref} terkirim.` });
    return;
  }

  throw new ApiError(400, 'invalid_input', 'action harus rerun atau dispatch.');
});
