/**
 * NAZE Asset Vault - pembangun indeks murni (tanpa dependensi Node).
 * Mengubah daftar entri tree Git menjadi indeks aset dan proyek (schemaVersion 1).
 * Indeks selalu dapat dibangun ulang dari isi repository.
 */

import { isMarkerFile, getExtension } from './validate.mjs';

export const SCHEMA_VERSION = 1;

/** Root aset global yang diindeks. */
export const ASSET_ROOTS = ['VISUAL', 'AUDIO', 'FONTS', 'EXAMPLE_VIDEO'];
/** Sub-root khusus untuk aset 3D; kode engine NAZE-3D lain tidak diindeks sebagai aset. */
export const ASSET_3D_PREFIX = 'NAZE-3D/assets-3d/';
export const PROJECTS_ROOT = 'PROJECTS';

/** Prefiks direktori sistem yang tidak termasuk aset. */
export const SYSTEM_PREFIXES = [
  '.github/', 'CATALOG/', 'CONFIG/', 'DATABASE/', 'MOTION-ENGINE/',
  'SCRIPTS/', 'WEBSITE/', 'RENDER-LOGS/', 'RENDER-3D/',
];

export function isIndexedAssetPath(path) {
  if (typeof path !== 'string' || path.length === 0) return false;
  if (ASSET_ROOTS.some((root) => path === root || path.startsWith(root + '/'))) return true;
  if (path.startsWith(ASSET_3D_PREFIX)) return true;
  return false;
}

export function isProjectPath(path) {
  return typeof path === 'string' && path.startsWith(PROJECTS_ROOT + '/');
}

export function categoryOf(path) {
  if (path.startsWith(ASSET_3D_PREFIX)) return 'NAZE-3D';
  return path.split('/')[0];
}

function assetEntry(entry) {
  const name = entry.path.split('/').pop();
  const category = categoryOf(entry.path);
  const dir = entry.path.slice(0, entry.path.lastIndexOf('/'));
  return {
    name,
    path: entry.path,
    category,
    subcategory: dir,
    extension: getExtension(name),
    size: entry.size || 0,
    ...(entry.sha ? { sha: entry.sha } : {}),
  };
}

/**
 * @param {Array<{path: string, size?: number, sha?: string}>} entries daftar blob dari tree Git
 * @param {{repo: string, branch: string, commit?: string, generatedAt?: string}} meta
 */
export function buildAssetsIndex(entries, meta) {
  const assets = [];
  for (const entry of entries) {
    if (!entry || !isIndexedAssetPath(entry.path)) continue;
    const name = entry.path.split('/').pop();
    if (isMarkerFile(name)) continue;
    assets.push(assetEntry(entry));
  }
  assets.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const categories = {};
  let totalBytes = 0;
  for (const asset of assets) {
    categories[asset.category] = categories[asset.category] || { count: 0, bytes: 0 };
    categories[asset.category].count += 1;
    categories[asset.category].bytes += asset.size;
    totalBytes += asset.size;
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'assets',
    generatedAt: meta.generatedAt || null,
    source: {
      repo: meta.repo,
      branch: meta.branch,
      ...(meta.commit ? { commit: meta.commit } : {}),
    },
    totals: { assets: assets.length, bytes: totalBytes },
    categories,
    assets,
  };
}

/**
 * @param {Array<{path: string, size?: number, sha?: string}>} entries
 * @param {{repo: string, branch: string, commit?: string, generatedAt?: string}} meta
 */
export function buildProjectsIndex(entries, meta) {
  const projectMap = new Map();
  const rootFiles = [];

  for (const entry of entries) {
    if (!entry || !isProjectPath(entry.path)) continue;
    const segments = entry.path.split('/');
    if (segments.length === 2) {
      if (isMarkerFile(segments[1])) continue;
      rootFiles.push({ name: segments[1], path: entry.path, size: entry.size || 0 });
      continue;
    }
    const projectName = segments[1];
    if (!projectMap.has(projectName)) {
      projectMap.set(projectName, {
        name: projectName,
        path: `${PROJECTS_ROOT}/${projectName}`,
        hasProjectJson: false,
        fileCount: 0,
        totalBytes: 0,
        folders: new Set(),
      });
    }
    const project = projectMap.get(projectName);
    const fileName = segments[segments.length - 1];
    if (isMarkerFile(fileName)) continue;
    project.fileCount += 1;
    project.totalBytes += entry.size || 0;
    if (segments.length === 3 && segments[2] === 'project.json') {
      project.hasProjectJson = true;
    } else {
      project.folders.add(segments[2]);
    }
  }

  const projects = [...projectMap.values()]
    .map((project) => ({
      name: project.name,
      path: project.path,
      hasProjectJson: project.hasProjectJson,
      fileCount: project.fileCount,
      totalBytes: project.totalBytes,
      folders: [...project.folders].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  rootFiles.sort((a, b) => a.path.localeCompare(b.path));

  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'projects',
    generatedAt: meta.generatedAt || null,
    source: {
      repo: meta.repo,
      branch: meta.branch,
      ...(meta.commit ? { commit: meta.commit } : {}),
    },
    totals: { projects: projects.length, rootFiles: rootFiles.length },
    projects,
    rootFiles,
  };
}

/**
 * Validasi ringkas struktur indeks yang dimuat (misalnya dari DATABASE/).
 * Mengembalikan {ok, errors} tanpa melempar exception.
 */
export function validateIndexShape(index, expectedKind) {
  const errors = [];
  if (!index || typeof index !== 'object') {
    return { ok: false, errors: ['indeks bukan objek'] };
  }
  if (index.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion harus ${SCHEMA_VERSION}, ditemukan ${JSON.stringify(index.schemaVersion)}`);
  }
  if (expectedKind && index.kind !== expectedKind) {
    errors.push(`kind harus "${expectedKind}", ditemukan ${JSON.stringify(index.kind)}`);
  }
  if (expectedKind === 'assets') {
    if (!Array.isArray(index.assets)) errors.push('assets harus array');
    else if (index.assets.some((a) => !a.path || typeof a.size !== 'number')) {
      errors.push('setiap aset wajib memiliki path dan size');
    }
  }
  if (expectedKind === 'projects') {
    if (!Array.isArray(index.projects)) errors.push('projects harus array');
    if (!Array.isArray(index.rootFiles)) errors.push('rootFiles harus array');
  }
  return { ok: errors.length === 0, errors };
}
