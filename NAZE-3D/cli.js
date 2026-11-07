/**
 * CLI render demo: menghasilkan file MP4 per demo.
 * Default: 720x1280 @ 60 fps selama 3 detik (180 frame).
 * Contoh: node cli.js --demo all --frames 180 --fps 60 --width 720 --height 1280
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEMOS, listDemos } from './scenes/demos.js';

function argOf(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const demoArg = argOf('demo', 'all');
const outDir = argOf('outDir', 'RENDER-3D/demos');
const frames = parseInt(argOf('frames', '180'), 10);
const fps = parseInt(argOf('fps', '60'), 10);
const width = parseInt(argOf('width', '720'), 10);
const height = parseInt(argOf('height', '1280'), 10);
const duration = frames / fps;

const ids = demoArg === 'all' ? listDemos() : demoArg.split(',').map((s) => s.trim()).filter(Boolean);
fs.mkdirSync(outDir, { recursive: true });
let failedCount = 0;
for (const id of ids) {
  const t0 = Date.now();
  try {
    const env = await DEMOS[id]();
    const outFile = path.join(outDir, id + '.mp4');
    await env.renderVideo({
      outFile,
      duration,
      fps,
      width,
      height,
      onProgress: (f, n) => {
        if (f % 30 === 0 || f === n) console.log('  ' + id + ': frame ' + f + '/' + n);
      },
    });
    env.dispose();
    console.log('[DEMO] ' + id + ' selesai dalam ' + ((Date.now() - t0) / 1000).toFixed(1) + 's -> ' + outFile);
  } catch (e) {
    failedCount++;
    console.error('[DEMO] ' + id + ' GAGAL: ' + e.message);
  }
}
if (failedCount > 0) process.exit(1);
