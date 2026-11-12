/**
 * /api/projects
 * POST : create | create-folder | rename | delete (butuh sesi + CSRF).
 * GET  : daftar proyek ringkas dari tree (butuh sesi).
 */

const { loadConfig } = require('./_lib/config');
const { GitHubClient } = require('./_lib/github');
const auth = require('./_lib/auth');
const { json, withApi, ApiError, rateLimit, clientIp, readJsonBody } = require('./_lib/http');

let validateRelativePath;
let validateSegmentName;
let validateProjectName;
let assertNoCollision;

let validateLib = null;
async function getValidate() {
  if (!validateLib) validateLib = await import('../lib/validate.mjs');
  return validateLib;
}

const PROJECTS_ROOT = 'PROJECTS';

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

function projectJsonContent(name, folders) {
  return JSON.stringify(
    {
      $schema: '../CONFIG/naze-project-schema.json',
      schema: 'naze-project/2.0',
      name,
      status: 'draft',
      folders,
      createdAt: new Date().toISOString(),
      createdBy: 'NAZE Web Vault',
    },
    null,
    2
  ) + '\n';
}

async function handleCreate(req, res, cfg, client, body) {
  const name = validateProjectName(String(body.name || ''));
  const folders = (Array.isArray(body.folders) ? body.folders : [])
    .map((f) => String(f).trim())
    .filter(Boolean)
    .map((f) => validateSegmentName(f));

  const known = await client.getKnownPaths(null);
  const prefix = `${PROJECTS_ROOT}/${name}/`;
  if (known.paths.has(`${PROJECTS_ROOT}/${name}`) || [...known.paths].some((p) => p.startsWith(prefix))) {
    throw new ApiError(409, 'target_exists', `Proyek "${name}" sudah ada.`);
  }

  const folderSet = folders.length > 0 ? folders : ['VISUAL', 'AUDIO', 'SFX'];
  const changes = [
    {
      op: 'put',
      path: `${prefix}project.json`,
      contentBase64: Buffer.from(projectJsonContent(name, folderSet), 'utf8').toString('base64'),
    },
  ];
  for (const folder of folderSet) {
    changes.push({ op: 'put', path: `${prefix}${folder}/.gitkeep`, contentBase64: Buffer.from('', 'utf8').toString('base64') });
  }

  const result = await client.commitChanges(changes, `Buat proyek ${name} via NAZE Web Vault`);
  json(res, 200, { ok: true, commit: result.commitSha, project: `${PROJECTS_ROOT}/${name}`, folders: folderSet });
}

async function handleCreateFolder(req, res, cfg, client, body) {
  const project = validateSegmentName(String(body.project || ''));
  const nested = String(body.folder || '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
  if (nested.length === 0) throw new ApiError(400, 'invalid_input', 'Nama folder wajib diisi.');
  for (const seg of nested) validateSegmentName(seg);

  const folderPath = validateRelativePath(`${PROJECTS_ROOT}/${project}/${nested.join('/')}`, ['PROJECTS']);
  const known = await client.getKnownPaths(null);
  assertNoCollision(`${folderPath}/.gitkeep`, known.paths);

  const result = await client.commitChanges(
    [{ op: 'put', path: `${folderPath}/.gitkeep`, contentBase64: Buffer.from('', 'utf8').toString('base64') }],
    `Buat folder ${folderPath} via NAZE Web Vault`
  );
  json(res, 200, { ok: true, commit: result.commitSha, folder: folderPath });
}

async function handleRename(req, res, cfg, client, body) {
  const oldName = validateSegmentName(String(body.oldName || ''));
  const newName = validateProjectName(String(body.newName || ''));
  if (oldName === newName) {
    json(res, 200, { ok: true, changed: 0, message: 'Nama tidak berubah.' });
    return;
  }

  const known = await client.getKnownPaths(null);
  const oldPrefix = `${PROJECTS_ROOT}/${oldName}/`;
  const affected = [...known.blobs].filter((b) => b.path.startsWith(oldPrefix));
  if (affected.length === 0) throw new ApiError(404, 'not_found', `Proyek tidak ditemukan: ${oldName}`);

  const newPrefix = `${PROJECTS_ROOT}/${newName}/`;
  const changes = [];
  let projectJsonBlob = null;
  for (const blob of affected) {
    const newPath = newPrefix + blob.path.slice(oldPrefix.length);
    validateRelativePath(newPath, ['PROJECTS']);
    assertNoCollision(newPath, known.paths);
    changes.push({ op: 'set', path: newPath, blobSha: blob.sha });
    changes.push({ op: 'delete', path: blob.path });
    if (blob.path === `${oldPrefix}project.json`) projectJsonBlob = blob;
  }

  // Perbarui field "name" di project.json bila ada (file teks, aman dibaca ulang).
  if (projectJsonBlob) {
    const blobRes = await client.request(
      'GET',
      `/repos/${cfg.owner}/${cfg.repo}/git/blobs/${projectJsonBlob.sha}`
    );
    const text = Buffer.from(blobRes.json.content, 'base64').toString('utf8');
    try {
      const meta = JSON.parse(text);
      meta.name = newName;
      meta.renamedFrom = oldName;
      const updated = JSON.stringify(meta, null, 2) + '\n';
      changes.push({
        op: 'put',
        path: `${newPrefix}project.json`,
        contentBase64: Buffer.from(updated, 'utf8').toString('base64'),
      });
    } catch {
      // project.json bukan JSON valid: biarkan isi asli ikut berpindah tanpa diubah.
    }
  }

  const result = await client.commitChanges(changes, `Ganti nama proyek ${oldName} menjadi ${newName}`);
  json(res, 200, { ok: true, commit: result.commitSha, from: oldName, to: newName, changed: affected.length });
}

async function handleDelete(req, res, cfg, client, body) {
  const name = validateSegmentName(String(body.name || ''));
  if (body.confirm !== name) {
    throw new ApiError(400, 'invalid_input', 'Konfirmasi tidak cocok dengan nama proyek.');
  }
  const known = await client.getKnownPaths(null);
  const prefix = `${PROJECTS_ROOT}/${name}/`;
  const affected = [...known.blobs].filter((b) => b.path.startsWith(prefix));
  if (affected.length === 0) throw new ApiError(404, 'not_found', `Proyek tidak ditemukan: ${name}`);

  const changes = affected.map((b) => ({ op: 'delete', path: b.path }));
  const result = await client.commitChanges(changes, `Hapus proyek ${name} (${affected.length} file) via NAZE Web Vault`);
  json(res, 200, { ok: true, commit: result.commitSha, deleted: affected.length });
}

module.exports = withApi(async (req, res) => {
  const v = await getValidate();
  validateRelativePath = v.validateRelativePath;
  validateSegmentName = v.validateSegmentName;
  validateProjectName = v.validateProjectName;
  assertNoCollision = v.assertNoCollision;

  const cfg = loadConfig();
  if (!cfg.ready) {
    throw new ApiError(503, 'backend_not_ready', 'Backend belum dikonfigurasi. Set env backend terlebih dahulu.');
  }
  const client = new GitHubClient(cfg);

  if (req.method === 'GET') {
    requireSession(req, cfg);
    const known = await client.getKnownPaths(null);
    const projectMap = new Map();
    const rootFiles = [];
    for (const blob of known.blobs) {
      if (!blob.path.startsWith(PROJECTS_ROOT + '/')) continue;
      const segments = blob.path.split('/');
      if (segments.length === 2) {
        if (segments[1] !== '.gitkeep') rootFiles.push(blob);
        continue;
      }
      if (!projectMap.has(segments[1])) {
        projectMap.set(segments[1], { name: segments[1], path: `${PROJECTS_ROOT}/${segments[1]}`, fileCount: 0 });
      }
      projectMap.get(segments[1]).fileCount += 1;
    }
    json(res, 200, {
      ok: true,
      commit: known.commitSha,
      projects: [...projectMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
      rootFiles,
    });
    return;
  }

  if (req.method !== 'POST') {
    throw new ApiError(405, 'method_not_allowed', 'Gunakan GET atau POST.');
  }

  requireSession(req, cfg);
  requireCsrf(req, cfg);
  const limit = rateLimit(`write:${clientIp(req)}`, cfg.rateLimitPerMinute);
  if (!limit.allowed) {
    throw new ApiError(429, 'rate_limited', 'Terlalu banyak operasi tulis. Coba lagi sebentar.');
  }

  const body = await readJsonBody(req);
  switch (body.action) {
    case 'create':
      await handleCreate(req, res, cfg, client, body);
      break;
    case 'create-folder':
      await handleCreateFolder(req, res, cfg, client, body);
      break;
    case 'rename':
      await handleRename(req, res, cfg, client, body);
      break;
    case 'delete':
      await handleDelete(req, res, cfg, client, body);
      break;
    default:
      throw new ApiError(400, 'invalid_input', 'action harus create, create-folder, rename, atau delete.');
  }
});
