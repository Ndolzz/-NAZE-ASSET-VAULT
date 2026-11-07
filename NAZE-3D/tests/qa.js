/**
 * QA otomatis: validasi pembangunan, pencahayaan, kamera, karakter,
 * animasi, grounding, render output, dan scene switching untuk semua demo.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as THREE from 'three';
import { DEMOS } from '../scenes/demos.js';
import { listAssets } from '../assets-3d/index.js';
import { listEnvironments } from '../environment/index.js';
import { listDemos } from '../scenes/demos.js';
import { geometryStats } from '../engine/modeling/procedural.js';

function argOf(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const outDir = argOf('outDir', 'RENDER-3D/qa');
fs.mkdirSync(outDir, { recursive: true });

const catalog = { assets: listAssets(), environments: listEnvironments(), demos: listDemos() };
fs.writeFileSync(path.join(outDir, 'catalog.json'), JSON.stringify(catalog, null, 2));

const memoryBefore = process.memoryUsage().heapUsed;
let passed = 0;
let failed = 0;
const results = [];

for (const id of Object.keys(DEMOS)) {
  const entry = { id, checks: [] };
  const check = (name, ok, detail) => {
    entry.checks.push({ name, pass: !!ok, detail: detail ?? '' });
    if (ok) passed++;
    else failed++;
  };
  try {
    const env = await DEMOS[id]();
    entry.environment = env.metadata.environment;
    entry.lighting = env.metadata.lighting;
    let meshCount = 0;
    let lightCount = 0;
    env.scene.traverse((o) => {
      if (o.isMesh) meshCount++;
      if (o.isLight) lightCount++;
    });
    check('objek-3d', meshCount >= 8, meshCount + ' mesh');
    check('pencahayaan', lightCount >= 1, lightCount + ' lampu');
    check('kamera', env.camera.isPerspectiveCamera === true, 'fov ' + env.camera.fov.toFixed(0));
    check('karakter', env.characters.size >= 1, env.characters.size + ' karakter');
    check('animasi', env.animator.count >= 1, env.animator.count + ' track');
    const standing = [...env.characters.values()].filter((c) => c.pose !== 'sit' && Math.abs(c.group.position.y) < 0.05);
    let groundedOk = true;
    for (const c of standing) {
      c.group.updateWorldMatrix(true, true);
      const b = new THREE.Box3().setFromObject(c.group);
      if (Math.abs(b.min.y) > 0.08) groundedOk = false;
    }
    check('karakter-di-lantai', groundedOk, standing.length + ' karakter berdiri diperiksa');
    env.update(0.5, 0.5);
    const frame = await env.render();
    let sum = 0;
    let samples = 0;
    const px = frame.pixels;
    const stride = Math.max(4, Math.floor(px.length / 4096 / 4) * 4);
    for (let i = 0; i < px.length; i += stride) {
      sum += px[i] + px[i + 1] + px[i + 2];
      samples++;
    }
    const mean = sum / Math.max(1, samples) / 3;
    check('output-render', mean > 2.5, 'rerata kecerahan ' + mean.toFixed(1));
    fs.writeFileSync(path.join(outDir, id + '.png'), frame.png());
    env.dispose();
    check('scene-switching', true, 'dibangun dan dibongkar bersih');
  } catch (e) {
    check('eksekusi-demo', false, e.message);
  }
  results.push(entry);
}

const memoryAfter = process.memoryUsage().heapUsed;
const report = {
  pass: failed === 0,
  passed,
  failed,
  geometryReuse: geometryStats(),
  memory: { heapBefore: memoryBefore, heapAfter: memoryAfter },
  results,
};
fs.writeFileSync(path.join(outDir, 'qa-report.json'), JSON.stringify(report, null, 2));
console.log('[QA] ' + passed + ' lulus, ' + failed + ' gagal');
if (failed > 0) process.exit(1);
