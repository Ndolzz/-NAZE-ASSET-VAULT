#!/usr/bin/env node
/**
 * NAZE Asset Vault - pembangun indeks (dijalankan lokal atau GitHub Actions).
 * Membaca tree Git lewat GitHub API, membangun indeks aset & proyek,
 * lalu menulis DATABASE/assets-index.json dan DATABASE/projects-index.json.
 *
 * Env: GITHUB_TOKEN (wajib di Actions: secrets.GITHUB_TOKEN), opsional
 * GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAssetsIndex, buildProjectsIndex, validateIndexShape } from '../WEBSITE/lib/indexer.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_DIR = path.join(ROOT, 'DATABASE');

const owner = process.env.GITHUB_OWNER || 'Ndolzz';
const repo = process.env.GITHUB_REPO || '-NAZE-ASSET-VAULT';
const branch = process.env.GITHUB_BRANCH || 'main';
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error('GITHUB_TOKEN tidak tersedia. Set env GITHUB_TOKEN (Actions: secrets.GITHUB_TOKEN).');
  process.exit(1);
}

async function gh(pathname, accept = 'application/vnd.github+json') {
  const res = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'naze-vault-index',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} pada ${pathname}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const ref = await gh(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  const headSha = ref.object.sha;

  const tree = await gh(`/repos/${owner}/${repo}/git/trees/${headSha}?recursive=1`);
  if (tree.truncated) {
    console.error('Tree API terpotong (truncated=true). Indeks tidak dibangun agar data tidak menyesatkan.');
    process.exit(1);
  }

  const entries = tree.tree
    .filter((item) => item.type === 'blob')
    .map((item) => ({ path: item.path, size: item.size || 0, sha: item.sha }));

  const generatedAt = new Date().toISOString();
  const meta = { repo: `${owner}/${repo}`, branch, commit: headSha, generatedAt };

  const assetsIndex = buildAssetsIndex(entries, meta);
  const projectsIndex = buildProjectsIndex(entries, meta);

  const shapeAssets = validateIndexShape(assetsIndex, 'assets');
  const shapeProjects = validateIndexShape(projectsIndex, 'projects');
  if (!shapeAssets.ok || !shapeProjects.ok) {
    console.error('Bentuk indeks tidak valid:', shapeAssets.errors, shapeProjects.errors);
    process.exit(1);
  }

  await mkdir(DB_DIR, { recursive: true });
  const files = [
    [path.join(DB_DIR, 'assets-index.json'), assetsIndex],
    [path.join(DB_DIR, 'projects-index.json'), projectsIndex],
  ];
  for (const [filePath, data] of files) {
    await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`Tulis ${path.relative(ROOT, filePath)}`);
  }

  console.log(`Aset: ${assetsIndex.totals.assets} (${assetsIndex.totals.bytes} byte)`);
  console.log(`Proyek: ${projectsIndex.totals.projects}, file lepas di root PROJECTS: ${projectsIndex.totals.rootFiles}`);
  console.log(`Commit dasar: ${headSha}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
