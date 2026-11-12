import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAssetsIndex,
  buildProjectsIndex,
  validateIndexShape,
  isIndexedAssetPath,
  SCHEMA_VERSION,
} from '../lib/indexer.mjs';

const META = { repo: 'Ndolzz/-NAZE-ASSET-VAULT', branch: 'main', commit: 'abc123', generatedAt: '2026-11-11T00:00:00Z' };

const TREE = [
  { path: 'VISUAL/LOGO/NAZE_LOGO.png', size: 732524, sha: 's1' },
  { path: 'VISUAL/RAW/.gitkeep', size: 0, sha: 's2' },
  { path: 'AUDIO/SFX/INTERFACE/switch_001.wav', size: 12000, sha: 's3' },
  { path: 'AUDIO/SFX/DIGITAL/bleep.ogg', size: 8000, sha: 's4' },
  { path: 'FONTS/GOOGLE/TECHNO/orbitron.ttf', size: 90000, sha: 's5' },
  { path: 'EXAMPLE_VIDEO/demo.mp4', size: 3000000, sha: 's6' },
  { path: 'NAZE-3D/assets-3d/props/chair.glb', size: 150000, sha: 's7' },
  { path: 'NAZE-3D/cli.js', size: 1616, sha: 's8' },
  { path: 'MOTION-ENGINE/src/cli.ts', size: 3771, sha: 's9' },
  { path: 'PROJECTS/DARK-WEB/project.json', size: 7603, sha: 's10' },
  { path: 'PROJECTS/DARK-WEB/AUDIO/VOICE/narration.mp3', size: 480096, sha: 's11' },
  { path: 'PROJECTS/narasi lepas.mp3', size: 402768, sha: 's12' },
  { path: 'CATALOG/assets.json', size: 344734, sha: 's13' },
];

test('indeks aset: hanya root aset yang diindeks', () => {
  const index = buildAssetsIndex(TREE, META);
  assert.equal(index.schemaVersion, SCHEMA_VERSION);
  assert.equal(index.kind, 'assets');
  assert.ok(isIndexedAssetPath('VISUAL/LOGO/NAZE_LOGO.png'));
  assert.ok(isIndexedAssetPath('NAZE-3D/assets-3d/props/chair.glb'));
  assert.ok(!isIndexedAssetPath('NAZE-3D/cli.js'));
  assert.ok(!isIndexedAssetPath('MOTION-ENGINE/src/cli.ts'));
  const paths = index.assets.map((a) => a.path);
  assert.ok(paths.includes('VISUAL/LOGO/NAZE_LOGO.png'));
  assert.ok(paths.includes('NAZE-3D/assets-3d/props/chair.glb'));
  assert.ok(!paths.includes('NAZE-3D/cli.js'));
  assert.ok(!paths.includes('CATALOG/assets.json'));
});

test('indeks aset: file penanda tidak dihitung sebagai aset', () => {
  const index = buildAssetsIndex(TREE, META);
  assert.ok(!index.assets.some((a) => a.name === '.gitkeep'));
});

test('indeks aset: total dan kategori konsisten', () => {
  const index = buildAssetsIndex(TREE, META);
  assert.equal(index.totals.assets, 6);
  assert.equal(index.totals.bytes, 732524 + 12000 + 8000 + 90000 + 3000000 + 150000);
  assert.equal(index.categories.AUDIO.count, 2);
  assert.equal(index.categories['NAZE-3D'].count, 1);
});

test('indeks proyek: proyek terpisah dari file lepas', () => {
  const index = buildProjectsIndex(TREE, META);
  assert.equal(index.kind, 'projects');
  const darkweb = index.projects.find((p) => p.name === 'DARK-WEB');
  assert.ok(darkweb);
  assert.equal(darkweb.hasProjectJson, true);
  assert.equal(darkweb.fileCount, 2);
  assert.deepEqual(darkweb.folders, ['AUDIO']);
  assert.equal(index.totals.projects, 1);
  assert.ok(index.rootFiles.some((f) => f.name === 'narasi lepas.mp3'));
});

test('proyek tanpa project.json terdeteksi', () => {
  const index = buildProjectsIndex([{ path: 'PROJECTS/PROYEK-BARU/VISUAL/.gitkeep', size: 0 }], META);
  assert.equal(index.projects[0].hasProjectJson, false);
  assert.equal(index.projects[0].fileCount, 0);
});

test('validasi bentuk indeks', () => {
  const assets = buildAssetsIndex(TREE, META);
  assert.equal(validateIndexShape(assets, 'assets').ok, true);
  assert.equal(validateIndexShape({ schemaVersion: 99 }, 'assets').ok, false);
  assert.equal(validateIndexShape(null, 'assets').ok, false);
});
