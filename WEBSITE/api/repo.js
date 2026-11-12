/**
 * /api/repo
 * GET  : daftar file pada root yang diizinkan (butuh sesi).
 * POST : operasi tulis (upload | rename | move | delete) sebagai commit atomik.
 */

const { loadConfig, ALLOWED_ROOTS } = require('./_lib/config');
const { GitHubClient } = require('./_lib/github');
const auth = require('./_lib/auth');
const { json, withApi, ApiError, rateLimit, clientIp, readJsonBody } = require('./_lib/http');

const MAX_FILES_PER_COMMIT = 20;

let validateLib = null;
async function getValidate() {
  if (!validateLib) {
    validateLib = await import('../lib/validate.mjs');
  }
  return validateLib;
}

// Cache tree per commit SHA untuk mengurangi panggilan API.
const treeCache = new Map(); // commitSha -> { at, data }
const TREE_CACHE_TTL_MS = 30 * 1000;

async function getKnownCached(client, sha) {
  const cached = treeCache.get(sha);
  if (cached && Date.now() - cached.at < TREE_CACHE_TTL_MS) return cached.data;
  const data = await client.getKnownPaths(sha);
  treeCache.set(sha, { at: Date.now(), data });
  return data;
}

function requireSession(req, cfg) {
  const session = auth.sessionFromRequest(req, cfg);
  if (!session) {
    throw new ApiError(401, 'unauthorized', 'Masuk terlebih dahulu sebagai admin.');
  }
  return session;
}

function requireCsrf(req, cfg) {
  if (!auth.checkCsrf(req, cfg)) {
    throw new ApiError(403, 'csrf_invalid', 'Token CSRF tidak valid atau hilang.');
  }
}

/** Semua blob pada path persis atau di bawah prefix path. */
function collectAffected(blobs, path) {
  return blobs.filter((b) => b.path === path || b.path.startsWith(path + '/'));
}

let validateRelativePath;
let validateSegmentName;
let validateUploadExtension;
let assertNoCollision;

async function handleList(req, res, cfg, client) {
  const url = new URL(req.url, 'http://localhost');
  const prefix = url.searchParams.get('prefix') || '';
  const known = await getKnownCached(client, null);
  let entries = known.blobs.filter((b) =>
    ALLOWED_ROOTS.some((root) => b.path === root || b.path.startsWith(root + '/'))
  );
  if (prefix) {
    const safePrefix = validateRelativePath(prefix, ALLOWED_ROOTS);
    entries = entries.filter((b) => b.path.startsWith(safePrefix));
  }
  json(res, 200, {
    ok: true,
    commit: known.commitSha,
    allowedRoots: ALLOWED_ROOTS,
    count: entries.length,
    entries,
  });
}

async function handleUpload(req, res, cfg, client, body) {
  const files = Array.isArray(body.files) ? body.files : [];
  if (files.length === 0) throw new ApiError(400, 'invalid_input', 'Tidak ada file untuk diunggah.');
  if (files.length > MAX_FILES_PER_COMMIT) {
    throw new ApiError(400, 'too_many_files', `Maksimal ${MAX_FILES_PER_COMMIT} file per commit.`);
  }
  const destRoot = typeof body.destRoot === 'string' ? body.destRoot : '';
  if (!ALLOWED_ROOTS.includes(destRoot)) {
    throw new ApiError(400, 'root_not_allowed', `Destinasi harus salah satu root: ${ALLOWED_ROOTS.join(', ')}.`);
  }
  const subPath = body.subPath ? validateRelativePath(`${destRoot}/${body.subPath}`, ALLOWED_ROOTS) : destRoot;
  const overwrite = body.overwrite === true;

  const known = await getKnownCached(client, null);
  const maxBytes = cfg.maxUploadMb * 1024 * 1024;
  const prepared = [];
  const duplicates = [];

  for (const file of files) {
    const name = validateSegmentName(file.name);
    validateUploadExtension(name);
    if (typeof file.contentBase64 !== 'string' || file.contentBase64.length === 0) {
      throw new ApiError(400, 'invalid_input', `Konten file "${name}" kosong atau bukan base64.`);
    }
    const decodedBytes = Buffer.from(file.contentBase64, 'base64');
    if (decodedBytes.length === 0) {
      throw new ApiError(400, 'invalid_input', `Konten file "${name}" tidak valid.`);
    }
    if (decodedBytes.length > maxBytes) {
      throw new ApiError(
        413,
        'file_too_large',
        `"${name}" melebihi batas ${cfg.maxUploadMb} MB (${decodedBytes.length} byte).`
      );
    }
    const target = subPath === destRoot ? `${destRoot}/${name}` : `${subPath}/${name}`;
    const finalTarget = validateRelativePath(target, ALLOWED_ROOTS);
    if (known.paths.has(finalTarget)) {
      if (!overwrite) duplicates.push(finalTarget);
      continue;
    }
    prepared.push({ path: finalTarget, contentBase64: file.contentBase64, size: decodedBytes.length });
  }

  if (duplicates.length > 0 && !overwrite) {
    json(res, 409, { ok: false, code: 'duplicates', duplicates, message: 'Beberapa nama file sudah ada.' });
    return;
  }
  if (prepared.length === 0) {
    throw new ApiError(400, 'invalid_input', 'Tidak ada file baru untuk diunggah (semua duplikat).');
  }

  const result = await client.commitChanges(
    prepared.map((p) => ({ op: 'put', path: p.path, contentBase64: p.contentBase64 })),
    `Tambah ${prepared.length} file via NAZE Web Vault`
  );
  treeCache.clear();
  json(res, 200, { ok: true, commit: result.commitSha, uploaded: prepared.map((p) => p.path) });
}

async function handleRename(req, res, cfg, client, body) {
  const oldPath = validateRelativePath(String(body.path || ''), ALLOWED_ROOTS);
  const newName = validateSegmentName(String(body.newName || ''));
  const known = await getKnownCached(client, null);
  const affected = collectAffected(known.blobs, oldPath);
  if (affected.length === 0) throw new ApiError(404, 'not_found', `Path tidak ditemukan: ${oldPath}`);

  const parent = oldPath.includes('/') ? oldPath.slice(0, oldPath.lastIndexOf('/')) : '';
  const target = parent ? `${parent}/${newName}` : newName;
  const finalTarget = validateRelativePath(target, ALLOWED_ROOTS);
  if (finalTarget === oldPath) {
    json(res, 200, { ok: true, commit: known.commitSha, changed: 0, message: 'Nama tidak berubah.' });
    return;
  }

  const affectedSet = new Set(affected.map((b) => b.path));
  const changes = [];
  for (const blob of affected) {
    const newPath = finalTarget + blob.path.slice(oldPath.length);
    validateRelativePath(newPath, ALLOWED_ROOTS);
    if (!affectedSet.has(newPath)) assertNoCollision(newPath, known.paths);
    changes.push({ op: 'set', path: newPath, blobSha: blob.sha });
    changes.push({ op: 'delete', path: blob.path });
  }

  const result = await client.commitChanges(changes, `Ganti nama ${oldPath} menjadi ${finalTarget}`);
  treeCache.clear();
  json(res, 200, { ok: true, commit: result.commitSha, from: oldPath, to: finalTarget, changed: affected.length });
}

async function handleMove(req, res, cfg, client, body) {
  const paths = Array.isArray(body.paths) ? body.paths : [];
  if (paths.length === 0) throw new ApiError(400, 'invalid_input', 'Tidak ada path untuk dipindah.');
  const destDir = validateRelativePath(String(body.destDir || ''), ALLOWED_ROOTS);
  const known = await getKnownCached(client, null);

  const changes = [];
  let moved = 0;
  for (const raw of paths) {
    const src = validateRelativePath(String(raw), ALLOWED_ROOTS);
    const affected = collectAffected(known.blobs, src);
    if (affected.length === 0) throw new ApiError(404, 'not_found', `Path tidak ditemukan: ${src}`);
    for (const blob of affected) {
      const leaf = blob.path.slice(src.length);
      const newPath = validateRelativePath(destDir + leaf, ALLOWED_ROOTS);
      if (newPath === blob.path) continue;
      assertNoCollision(newPath, known.paths);
      changes.push({ op: 'set', path: newPath, blobSha: blob.sha });
      changes.push({ op: 'delete', path: blob.path });
      moved += 1;
    }
  }
  if (moved === 0) {
    json(res, 200, { ok: true, commit: known.commitSha, changed: 0, message: 'Tidak ada perubahan.' });
    return;
  }

  const result = await client.commitChanges(changes, `Pindahkan ${moved} file ke ${destDir}`);
  treeCache.clear();
  json(res, 200, { ok: true, commit: result.commitSha, changed: moved });
}

async function handleDelete(req, res, cfg, client, body) {
  const paths = Array.isArray(body.paths) ? body.paths : [];
  if (paths.length === 0) throw new ApiError(400, 'invalid_input', 'Tidak ada path untuk dihapus.');
  const known = await getKnownCached(client, null);

  const changes = [];
  const deleted = [];
  for (const raw of paths) {
    const target = validateRelativePath(String(raw), ALLOWED_ROOTS);
    if (ALLOWED_ROOTS.includes(target)) {
      throw new ApiError(400, 'forbidden', `Menghapus root penuh tidak diizinkan: ${target}`);
    }
    const affected = collectAffected(known.blobs, target);
    if (affected.length === 0) throw new ApiError(404, 'not_found', `Path tidak ditemukan: ${target}`);
    for (const blob of affected) {
      changes.push({ op: 'delete', path: blob.path });
      deleted.push(blob.path);
    }
  }

  const result = await client.commitChanges(changes, `Hapus ${deleted.length} file via NAZE Web Vault`);
  treeCache.clear();
  json(res, 200, { ok: true, commit: result.commitSha, deleted });
}

module.exports = withApi(async (req, res) => {
  const v = await getValidate();
  validateRelativePath = v.validateRelativePath;
  validateSegmentName = v.validateSegmentName;
  validateUploadExtension = v.validateUploadExtension;
  assertNoCollision = v.assertNoCollision;

  const cfg = loadConfig();
  if (!cfg.ready) {
    throw new ApiError(503, 'backend_not_ready', 'Backend belum dikonfigurasi. Set env backend terlebih dahulu.');
  }
  const client = new GitHubClient(cfg);

  if (req.method === 'GET') {
    requireSession(req, cfg);
    await handleList(req, res, cfg, client);
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
    case 'upload':
      await handleUpload(req, res, cfg, client, body);
      break;
    case 'rename':
      await handleRename(req, res, cfg, client, body);
      break;
    case 'move':
      await handleMove(req, res, cfg, client, body);
      break;
    case 'delete':
      await handleDelete(req, res, cfg, client, body);
      break;
    default:
      throw new ApiError(400, 'invalid_input', 'action harus upload, rename, move, atau delete.');
  }
});
