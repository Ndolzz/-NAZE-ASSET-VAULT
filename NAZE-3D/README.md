# NAZE 3D Environment & Asset Library

Sistem produksi motion graphics 3D berbasis JavaScript ES Modules dan three.js.
Semua aset dibuat secara prosedural sehingga tidak memerlukan unduhan model besar.
Dirancang agar dapat dijalankan di CI GitHub Actions dan perangkat Termux Android (ARMv7).

## Arsitektur

```
NAZE-3D/
  engine/
    modeling/procedural.js   Geometri prosedural dengan cache reuse
    materials/materials.js   Pustaka material bernama + tekstur prosedural (papan kayu)
    lighting/lighting.js     11 preset pencahayaan (daylight .. dramatic)
    camera/camera.js         CameraRig: preset, dolly, pan, zoom, orbit, follow
    animation/animation.js   Timeline keyframe Animator
    physics/physics.js       AABB collision, grounding, pushApart
    environment/roomkit.js   makeFloor / makeWall / makeRoom (skirting + noShadow)
    environment/builder.js   NazeEnvironment + createEnvironment
    renderer/renderer.js     Rasterizer kanvas 2D headless (smooth shading,
                             bayangan planar lembut, fog, tekstur, vignette)
    renderer/video.js        FrameRecorder FFmpeg (rawvideo -> libx264)
    characters/character.js  SVG Character Engine 512x1024 + CharacterBillboard
  assets-3d/                 Registry aset (67 aset, 7 kategori)
  environment/               20 environment dalam 8 kategori
  scenes/demos.js            8 demo siap render
  tests/qa.js                QA otomatis semua demo (PNG QA 720x1280)
  cli.js                     Render MP4 per demo
```

## API NazeEnvironment

```js
import { createEnvironment } from './engine/environment/builder.js';

const env = await createEnvironment({
  environment: 'server-room',  // lihat katalog di bawah
  variant: 'data-center',      // opsional
  lighting: 'dark-technology', // preset pencahayaan
  quality: 'low',              // low | medium | high
});

env.addObject('monitor', { position: [2, 1, -2], rotation: [0, 0.5, 0], scale: 1.2 });
env.addCharacter('nendi', { position: [0, 0, 2], pose: 'explaining', expression: 'confident' });
env.setCamera({ preset: 'medium', position: [5, 3, 8], target: [0, 1, 0], fov: 45 });
env.cameraRig.orbit({ duration: 8, radius: 7, height: 2.5, angleFrom: 0, angleTo: 1.6 });
env.addAnimation('kustom', (t) => { /* gerak objek per waktu t */ });

const frame = await env.render();          // { pixels, png(), width, height }
await env.renderVideo({ outFile: 'demo.mp4', duration: 3, fps: 60 });
env.dispose();                             // geometri & material cache tetap dipakai ulang
```

## Katalog Environment (20)

- Nature: tropical-forest, pine-forest, mountain, beach, desert, city-park
- Home: modern-bedroom, minimalist-bedroom, gaming-bedroom, living-room
- Technology: server-room, data-center
- Education: modern-classroom, computer-lab, library
- Office: developer-workspace
- Science: futuristic-laboratory
- Urban: city-street, cyberpunk-city
- Futuristic: digital-world

## Katalog Aset (67)

- vegetation: palm-tree (batang melengkung + kelapa), pine-tree (5 lapis), broadleaf-tree (7 bola daun), bush, grass-patch, flower, rock, cloud, water-plane (gelombang animatif), cactus, mountain-peak
- furniture: bed (rangka + kasur + selimut + 2 bantal), wardrobe (cermin), desk, desk-chair, office-chair, sofa, coffee-table, tv, table-lamp, floor-lamp, ceiling-light, bookshelf, rug (motif 3 lingkaran), door, window-frame (tekstur langit + ambang), wall-clock, picture-frame (lukisan prosedural)
- electronics: server-rack (LED + kipas animatif), monitor, keyboard, mouse, pc-tower, laptop, router, patch-panel, dashboard-screen, holo-ring, light-strip, rgb-strip
- buildings: building-block, house, road-strip, sidewalk, street-lamp, park-bench, traffic-light
- vehicles: car
- props: blackboard, whiteboard, projector, book, mug, potted-plant, lab-table, energy-core, robot-arm, crystal, holo-panel, glass-tube, floating-platform, data-pillar, particle-field, grid-line, tripod-camera, desk-mic
- characters: nendi (billboard 512x1024 dengan pose stand/walk/sit/point/explain/hold, ekspresi neutral/confident/happy/thinking)

## Kamera

Preset: wide, medium, closeUp, lowAngle, highAngle, orbit.
Gerakan: moveTo/dolly, pan, zoom, orbit, follow.
Semua gerakan menerima start, duration, dan easing kustom.

## Pencahayaan

Preset: daylight, sunset, night, indoor-warm, indoor-cool, cinematic, neon, dark-technology, laboratory, natural, dramatic.

## Profil Kualitas

| Profil | Resolusi | Sasaran |
|---------|----------|---------|
| low | 360x640 | Termux ARMv7, QA cepat |
| medium | 720x1280 | Default render demo (60 fps) |
| high | 1080x1920 | Render final |

Demo pada CI dirender 720x1280 @ 60 fps (180 frame, 3 detik) dan QA menghasilkan PNG 720x1280 per demo.

## Renderer perangkat lunak (rasterizer kanvas 2D)

Renderer sendiri (SoftwareCanvasRenderer) merasterisasi scene three.js ke kanvas 2D @napi-rs/canvas tanpa GPU, dengan:

- smooth shading: normal vertex dirata-rata per wajah lalu ditransformasi normal matrix;
- bayangan planar lembut: ellips proyeksi bounding-sphere tiap mesh ke bidang lantai sepanjang arah DirectionalLight utama (dinding/plafon tidak melempar bayangan, lihat userData.noShadow);
- pencahayaan aproksimasi ambient/hemisphere/directional/point + fog linear;
- tekstur affine (exact untuk billboard) dengan overlay shading dan fog;
- vignette sinematik ringan pasca-render;
- painter's algorithm dengan pass ground berlapis (lantai, bayangan objek, bayangan karakter).

Kompensasi tanpa GPU: bayangan per-piksel (shadow map) tidak tersedia, InstancedMesh tidak tersedia (penggantinya cache geometri bersama, lihat geometryStats di QA), depth of field dan bloom no-op.

## Menjalankan di Termux

```bash
pkg install ffmpeg
cd NAZE-3D
npm install
node tests/qa.js --outDir ../RENDER-3D/qa
node cli.js --demo server-room,digital-world --frames 180 --fps 60 --width 720 --height 1280
```

## CI

Workflow render-3d.yml menjalankan QA dan render semua demo (720x1280 @ 60 fps) pada setiap perubahan NAZE-3D, lalu mengunggah artefak naze-3d-render (PNG QA, MP4 demo, qa-report.json, catalog.json).

## Menambah Aset Baru

1. Tambahkan factory di assets-3d/<kategori>/<file>.js; origin di lantai pusat objek.
2. Daftarkan di objek ASSETS dalam file yang sama.
3. Impor dan gabungkan di assets-3d/index.js.
4. Aset animatif menerima opsi env dan mendaftarkan env.addAnimation sendiri.
